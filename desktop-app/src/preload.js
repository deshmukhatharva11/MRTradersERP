// =============================================================
// MR Traders ERP — Preload Script (Renderer Bridge)
// =============================================================
// Runs in a sandboxed context with contextIsolation = true.
// Exposes ONLY the minimal API surface needed by the renderer
// through contextBridge.  No Node.js APIs leak to the page.
// =============================================================
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// ── Allowed IPC channels (whitelist) ─────────────────────────
// Renderer → Main  (invoke = request/response, send = fire-and-forget)
const INVOKE_CHANNELS = new Set([
  'app:get-version',
  'app:check-update',
]);

const SEND_CHANNELS = new Set([
  'auth:logout',
]);

// Main → Renderer  (one-way push)
const RECEIVE_CHANNELS = new Set([
  'app:update-available',
  'app:update-downloaded',
  'app:offline',
  'app:online',
  'auth:session-expired',
]);

// ── Exposed API ──────────────────────────────────────────────
contextBridge.exposeInMainWorld('erpBridge', {
  /**
   * Get the application version string.
   * @returns {Promise<string>}
   */
  getVersion: () => ipcRenderer.invoke('app:get-version'),

  /**
   * Trigger a manual update check.
   * @returns {Promise<{available: boolean, version?: string}>}
   */
  checkUpdate: () => ipcRenderer.invoke('app:check-update'),

  /**
   * Tell the main process to clear session and navigate to login.
   */
  logout: () => {
    if (SEND_CHANNELS.has('auth:logout')) {
      ipcRenderer.send('auth:logout');
    }
  },

  // ── Event listeners (Main → Renderer) ─────────────────────

  /**
   * @param {Function} callback - Called when the app goes offline.
   * @returns {Function} unsubscribe
   */
  onOffline: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = () => callback();
    ipcRenderer.on('app:offline', handler);
    return () => ipcRenderer.removeListener('app:offline', handler);
  },

  /**
   * @param {Function} callback - Called when the app comes back online.
   * @returns {Function} unsubscribe
   */
  onOnline: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = () => callback();
    ipcRenderer.on('app:online', handler);
    return () => ipcRenderer.removeListener('app:online', handler);
  },

  /**
   * @param {Function} callback - Called when the backend returns 401.
   * @returns {Function} unsubscribe
   */
  onSessionExpired: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = () => callback();
    ipcRenderer.on('auth:session-expired', handler);
    return () => ipcRenderer.removeListener('auth:session-expired', handler);
  },

  /**
   * @param {Function} callback - Called with { version } when an update is ready.
   * @returns {Function} unsubscribe
   */
  onUpdateAvailable: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, info) => {
      // Only pass safe, primitive data to the renderer
      if (info && typeof info.version === 'string') {
        callback({ version: info.version });
      }
    };
    ipcRenderer.on('app:update-available', handler);
    return () => ipcRenderer.removeListener('app:update-available', handler);
  },

  /**
   * @param {Function} callback - Called with { version } when update is downloaded.
   * @returns {Function} unsubscribe
   */
  onUpdateDownloaded: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, info) => {
      if (info && typeof info.version === 'string') {
        callback({ version: info.version });
      }
    };
    ipcRenderer.on('app:update-downloaded', handler);
    return () => ipcRenderer.removeListener('app:update-downloaded', handler);
  },
});
