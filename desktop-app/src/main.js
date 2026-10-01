// =============================================================
// MR Traders ERP — Hardened Electron Main Process
// =============================================================
// Security controls implemented:
//   1. BrowserWindow: nodeIntegration off, contextIsolation on,
//      sandbox on, webSecurity on, no remote module
//   2. Preload: minimal validated API via contextBridge
//   3. Navigation: locked to backend origin only
//   4. Permissions: all denied unless explicitly allowed
//   5. CSP: strict fallback (backend Caddy is authoritative)
//   6. Production lockdown: no DevTools, no menu, single instance
//   7. Secrets: app key in main process only, tokens in safeStorage
//   8. Network: HTTPS only, x-app-key injected, certs verified
//   9. Updates: electron-updater with signed releases
//  10. Logging: all output redacted
// =============================================================
'use strict';

const {
  app,
  BrowserWindow,
  session,
  shell,
  ipcMain,
  Menu,
  dialog,
  net,
} = require('electron');
const path = require('path');

// ── Constants ────────────────────────────────────────────────
const IS_PROD = app.isPackaged;

// ── Logger (loaded before everything else) ───────────────────
const { createLogger } = require('./logger');
const log = createLogger('main');

// =============================================================
// 1. SINGLE INSTANCE LOCK
// =============================================================
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  log.info('Another instance is already running — quitting.');
  app.quit();
  process.exit(0);
}

// =============================================================
// 2. CONFIGURATION
// =============================================================
const { loadConfig } = require('./config');

let config;
try {
  config = loadConfig();
  log.info(`Loaded config. Backend: ${config.apiUrl}`);
} catch (err) {
  log.error('Configuration error:', err.message);
  app.once('ready', () => {
    dialog.showErrorBox(
      'Configuration Error',
      `Failed to load client configuration.\n\n${err.message}\n\nPlease reinstall the application.`
    );
    app.quit();
  });
}

// Derived values
const BACKEND_ORIGIN = config ? config.apiUrl : '';
const ALLOWED_EXTERNAL_DOMAINS = [
  'mrtraders.pk',
  'mrtraders.site',
];

// =============================================================
// 3. MAIN WINDOW
// =============================================================
/** @type {BrowserWindow | null} */
let mainWindow = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'MR Traders ERP',
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    show: false,                       // show after ready-to-show
    backgroundColor: '#1a1a2e',        // dark splash colour

    webPreferences: {
      // ── SECURITY: Core hardening ──────────────────────────
      nodeIntegration: false,          // [REQ 1] No Node in renderer
      contextIsolation: true,          // [REQ 1] Separate JS worlds
      sandbox: true,                   // [REQ 1] OS-level sandbox
      webSecurity: true,               // [REQ 1] Enforce same-origin
      enableRemoteModule: false,       // [REQ 1] Deprecated, block it

      // ── SECURITY: Preload only ────────────────────────────
      preload: path.join(__dirname, 'preload.js'),

      // ── SECURITY: Disable dangerous features ──────────────
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      navigateOnDragDrop: false,
      spellcheck: false,               // no data sent to spell-check services
      webviewTag: false,               // [REQ 3] block <webview>

      // ── SECURITY: Additional restrictions ─────────────────
      devTools: !IS_PROD,              // [REQ 6] No DevTools in production
    },
  });

  // ── Show window once ready (avoids white flash) ───────────
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // ── Production lockdown ────────────────────────────────────
  if (IS_PROD) {
    // [REQ 6] Remove application menu
    Menu.setApplicationMenu(null);

    // [REQ 6] Block DevTools via keyboard shortcut fallback
    mainWindow.webContents.on('before-input-event', (_event, input) => {
      const isDevToolsShortcut =
        (input.key === 'F12') ||
        (input.control && input.shift && (input.key === 'I' || input.key === 'i')) ||
        (input.control && input.shift && (input.key === 'J' || input.key === 'j')) ||
        (input.control && input.shift && (input.key === 'C' || input.key === 'c'));
      if (isDevToolsShortcut) {
        _event.preventDefault();
      }
    });

    // [REQ 6] Block right-click context menu
    mainWindow.webContents.on('context-menu', (event) => {
      event.preventDefault();
    });

    // [REQ 6] Force-close DevTools if somehow opened
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools();
    });
  }

  // ── Load the ERP ──────────────────────────────────────────
  loadErp();

  // ── Handle load failures (offline / server down) ──────────
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    log.warn(`Page load failed (${errorCode}): ${errorDescription}`);
    if (isNetworkError(errorCode)) {
      loadSplash('offline');
    }
  });

  // ── Handle 403 from backend (app key rejected) ────────────
  mainWindow.webContents.on('did-navigate', (_event, url, httpResponseCode) => {
    if (httpResponseCode === 403) {
      log.error('403 Forbidden received — app key may be invalid or revoked.');
      dialog.showErrorBox(
        'Access Denied',
        'This client is not authorised to access the ERP.\nContact your administrator.'
      );
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function loadErp() {
  if (!BACKEND_ORIGIN) return;
  mainWindow.loadURL(`${BACKEND_ORIGIN}/web`).catch((err) => {
    log.warn('Failed to load ERP:', err.message);
    loadSplash('offline');
  });
}

function loadSplash(mode = 'loading') {
  const splashPath = path.join(__dirname, '..', 'assets', 'splash.html');
  mainWindow.loadFile(splashPath, { query: { mode } });
}

function isNetworkError(code) {
  // Chromium net error codes for connectivity issues
  const NETWORK_ERRORS = new Set([
    -2,   // ERR_FAILED
    -3,   // ERR_ABORTED (can also be from navigation cancel)
    -6,   // ERR_FILE_NOT_FOUND
    -7,   // ERR_TIMED_OUT
    -21,  // ERR_NETWORK_CHANGED
    -100, // ERR_CONNECTION_CLOSED
    -101, // ERR_CONNECTION_RESET
    -102, // ERR_CONNECTION_REFUSED
    -103, // ERR_CONNECTION_ABORTED
    -104, // ERR_CONNECTION_FAILED
    -105, // ERR_NAME_NOT_RESOLVED
    -106, // ERR_INTERNET_DISCONNECTED
    -109, // ERR_ADDRESS_UNREACHABLE
    -118, // ERR_CONNECTION_TIMED_OUT
    -130, // ERR_PROXY_CONNECTION_FAILED
  ]);
  return NETWORK_ERRORS.has(code);
}

// =============================================================
// 4. SECURITY: SESSION-LEVEL PROTECTIONS
// =============================================================

function setupSessionSecurity() {
  const ses = session.defaultSession;

  // ── [REQ 8] Inject x-app-key header on backend requests ───
  // IMPORTANT: Only add to requests matching our backend origin
  // so the key is never leaked to third-party resources.
  ses.webRequest.onBeforeSendHeaders(
    { urls: [`${BACKEND_ORIGIN}/*`] },
    (details, callback) => {
      if (config && config.appKey) {
        details.requestHeaders['x-app-key'] = config.appKey;
      }
      // [REQ 8] Enforce HTTPS — strip any http request
      if (details.url.startsWith('http://')) {
        log.warn(`Blocked insecure request: ${details.url}`);
        callback({ cancel: true });
        return;
      }
      callback({ requestHeaders: details.requestHeaders });
    }
  );

  // ── [REQ 5] CSP fallback (if backend omits it) ────────────
  // The authoritative CSP comes from Caddy. This is defense-in-depth.
  // Odoo requires 'unsafe-inline' for scripts/styles due to its
  // OWL framework and session-info injection. We document this tradeoff.
  const FALLBACK_CSP = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${BACKEND_ORIGIN}`,
    `style-src 'self' 'unsafe-inline' ${BACKEND_ORIGIN}`,
    `img-src 'self' data: blob: ${BACKEND_ORIGIN}`,
    `font-src 'self' data: ${BACKEND_ORIGIN}`,
    `connect-src 'self' ${BACKEND_ORIGIN} wss://${new URL(BACKEND_ORIGIN).hostname}`,
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  ses.webRequest.onHeadersReceived((details, callback) => {
    const headers = details.responseHeaders || {};
    // Only inject CSP if the server didn't send one
    if (!headers['content-security-policy'] &&
        !headers['Content-Security-Policy']) {
      headers['Content-Security-Policy'] = [FALLBACK_CSP];
    }
    callback({ responseHeaders: headers });
  });

  // ── [REQ 4] Deny all permission requests ──────────────────
  ses.setPermissionRequestHandler((_webContents, permission, callback) => {
    // Deny everything: camera, microphone, notifications,
    // geolocation, midi, pointerLock, fullscreen, etc.
    log.warn(`Denied permission request: ${permission}`);
    callback(false);
  });

  ses.setPermissionCheckHandler((_webContents, permission) => {
    log.debug(`Permission check denied: ${permission}`);
    return false;
  });

  // ── [REQ 8] Block insecure HTTP loads ─────────────────────
  ses.webRequest.onBeforeRequest(
    { urls: ['http://*'] },
    (details, callback) => {
      // Allow loading local files (splash page)
      if (details.url.startsWith('http://localhost') ||
          details.url.startsWith('http://127.0.0.1')) {
        callback({});
        return;
      }
      log.warn(`Blocked insecure HTTP request: ${details.url}`);
      callback({ cancel: true });
    }
  );
}

// =============================================================
// 5. SECURITY: GLOBAL WEBCONTENTS PROTECTIONS
// =============================================================

function setupGlobalSecurity() {
  // ── [REQ 8] Reject invalid TLS certificates ───────────────
  app.on('certificate-error', (event, _webContents, url, error, _certificate, callback) => {
    event.preventDefault();
    callback(false);   // Always reject — never bypass
    log.warn(`Rejected certificate for ${new URL(url).hostname}: ${error}`);
  });

  // ── Apply restrictions to ALL webContents (including iframes) ─
  app.on('web-contents-created', (_event, contents) => {
    // [REQ 3] Block navigation away from backend
    contents.on('will-navigate', (event, navigationUrl) => {
      try {
        const parsed = new URL(navigationUrl);
        if (parsed.origin !== BACKEND_ORIGIN) {
          event.preventDefault();
          log.warn(`Blocked navigation to: ${parsed.origin}`);
        }
      } catch {
        event.preventDefault();
      }
    });

    // [REQ 3] Block new windows / popups
    contents.setWindowOpenHandler(({ url }) => {
      try {
        const parsed = new URL(url);
        const isAllowed = ALLOWED_EXTERNAL_DOMAINS.some(
          (domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
        );
        if (isAllowed && parsed.protocol === 'https:') {
          // Open allowed external links in system browser
          shell.openExternal(url);
          log.info(`Opened external link in browser: ${parsed.hostname}`);
        } else {
          log.warn(`Blocked popup to: ${parsed.origin}`);
        }
      } catch {
        log.warn(`Blocked popup with invalid URL`);
      }
      return { action: 'deny' };  // Never open new Electron windows
    });

    // [REQ 3] Block <webview> tag creation
    contents.on('will-attach-webview', (event) => {
      event.preventDefault();
      log.warn('Blocked <webview> creation');
    });
  });
}

// =============================================================
// 6. IPC HANDLERS
// =============================================================

function setupIpcHandlers() {
  // Validate sender for every IPC message
  function validateSender(event) {
    if (!mainWindow) return false;
    // Ensure the message comes from our main window's webContents
    return event.sender === mainWindow.webContents;
  }

  // [REQ 2] app:get-version — return app version
  ipcMain.handle('app:get-version', (event) => {
    if (!validateSender(event)) return null;
    return app.getVersion();
  });

  // [REQ 2] app:check-update — trigger update check
  ipcMain.handle('app:check-update', async (event) => {
    if (!validateSender(event)) return { available: false };
    try {
      const { autoUpdater } = require('electron-updater');
      const result = await autoUpdater.checkForUpdates();
      return {
        available: !!result?.updateInfo,
        version: result?.updateInfo?.version,
      };
    } catch {
      return { available: false };
    }
  });

  // [REQ 2] auth:logout — clear session and reload login
  ipcMain.on('auth:logout', (event) => {
    if (!validateSender(event)) return;
    log.info('User initiated logout');

    // Clear all session data (cookies, storage, cache)
    session.defaultSession.clearStorageData().then(() => {
      if (mainWindow) {
        mainWindow.loadURL(`${BACKEND_ORIGIN}/web/login`);
      }
    });
  });
}

// =============================================================
// 7. AUTO-UPDATER
// =============================================================

function setupAutoUpdater() {
  if (!IS_PROD) return;

  let autoUpdater;
  try {
    autoUpdater = require('electron-updater').autoUpdater;
  } catch (err) {
    log.warn('electron-updater not available:', err.message);
    return;
  }

  // [REQ 9] Signed updates only
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;

  autoUpdater.on('update-available', (info) => {
    log.info(`Update available: v${info.version}`);
    if (mainWindow) {
      mainWindow.webContents.send('app:update-available', { version: info.version });
    }
    autoUpdater.downloadUpdate();
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info(`Update downloaded: v${info.version}`);
    if (mainWindow) {
      mainWindow.webContents.send('app:update-downloaded', { version: info.version });
    }
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: `Version ${info.version} is ready to install. Restart now?`,
        buttons: ['Restart', 'Later'],
        defaultId: 0,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall(false, true);
        }
      });
  });

  autoUpdater.on('error', (err) => {
    log.error('Auto-updater error:', err.message);
  });

  // Check on startup + every 4 hours
  autoUpdater.checkForUpdates().catch(() => {});
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 4 * 60 * 60 * 1000);
}

// =============================================================
// 8. NETWORK STATUS MONITORING
// =============================================================

function setupNetworkMonitoring() {
  let wasOnline = net.isOnline();

  // Poll network status (Electron's net.isOnline() is synchronous)
  setInterval(() => {
    const isOnline = net.isOnline();
    if (isOnline !== wasOnline) {
      wasOnline = isOnline;
      if (mainWindow) {
        if (isOnline) {
          log.info('Network restored — reloading ERP');
          mainWindow.webContents.send('app:online');
          loadErp();
        } else {
          log.warn('Network lost — showing offline page');
          mainWindow.webContents.send('app:offline');
          loadSplash('offline');
        }
      }
    }
  }, 5000);
}

// =============================================================
// 9. APP LIFECYCLE
// =============================================================

app.on('ready', () => {
  if (!config) return; // Config error — dialog already shown

  setupSessionSecurity();
  setupGlobalSecurity();
  setupIpcHandlers();
  createMainWindow();
  setupAutoUpdater();
  setupNetworkMonitoring();

  log.info(`MR Traders ERP v${app.getVersion()} started (${IS_PROD ? 'production' : 'development'})`);
});

// Re-focus existing window when second instance tries to launch
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && config) {
    createMainWindow();
  }
});

// ── Prevent new windows from being created via app API ──────
app.on('browser-window-created', (_event, window) => {
  if (window !== mainWindow) {
    log.warn('Blocked unexpected BrowserWindow creation');
    window.close();
  }
});
