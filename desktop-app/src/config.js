// =============================================================
// MR Traders ERP — Client Configuration Loader
// =============================================================
// Reads per-client config (API URL + app key).
// On first run the app key is migrated to safeStorage (DPAPI).
// This module runs ONLY in the main process.
// =============================================================
'use strict';

const { app, safeStorage } = require('electron');
const fs   = require('fs');
const path = require('path');

// ── Paths ────────────────────────────────────────────────────
const USER_DATA_DIR   = app.getPath('userData');
const CREDENTIAL_FILE = path.join(USER_DATA_DIR, '.credentials');

/**
 * Locate client-config.json.
 * Priority:
 *   1. <userData>/client-config.json  (operator override)
 *   2. <appRoot>/client-config.json   (shipped with the build)
 */
function findConfigFile() {
  const candidates = [
    path.join(USER_DATA_DIR, 'client-config.json'),
    path.join(path.dirname(process.execPath), 'client-config.json'),
    path.join(process.resourcesPath, 'client-config.json'),
    path.join(__dirname, '..', 'client-config.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    'client-config.json not found. Searched:\n  ' + candidates.join('\n  ')
  );
}

/**
 * Load and validate the configuration.
 * Returns { apiUrl: string, appKey: string }
 */
function loadConfig() {
  const configPath = findConfigFile();
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (err) {
    throw new Error(`Invalid JSON in ${configPath}: ${err.message}`);
  }

  // ── Validate apiUrl ──────────────────────────────────────
  if (!raw.apiUrl || typeof raw.apiUrl !== 'string') {
    throw new Error('client-config.json: "apiUrl" is required.');
  }
  let parsedUrl;
  try {
    parsedUrl = new URL(raw.apiUrl);
  } catch {
    throw new Error(`client-config.json: "apiUrl" is not a valid URL.`);
  }
  if (parsedUrl.protocol !== 'https:') {
    throw new Error('client-config.json: "apiUrl" must use HTTPS.');
  }

  // ── Resolve app key (safeStorage → config file) ──────────
  const appKey = resolveAppKey(raw.appKey);
  if (!appKey) {
    throw new Error(
      'No app key found. Provide "appKey" in client-config.json on first run.'
    );
  }

  return Object.freeze({
    apiUrl: parsedUrl.origin,       // normalise — strip trailing path/slash
    appKey,                          // stays in main-process memory only
  });
}

// ── safeStorage key management ───────────────────────────────

function resolveAppKey(configFileKey) {
  // 1. Try loading from safeStorage (subsequent runs)
  const stored = loadFromSafeStorage();
  if (stored) return stored;

  // 2. First run — migrate from config file
  if (configFileKey && typeof configFileKey === 'string') {
    storeInSafeStorage(configFileKey);
    return configFileKey;
  }

  return null;
}

function loadFromSafeStorage() {
  if (!safeStorage.isEncryptionAvailable()) return null;
  if (!fs.existsSync(CREDENTIAL_FILE)) return null;
  try {
    const encrypted = fs.readFileSync(CREDENTIAL_FILE);
    return safeStorage.decryptString(encrypted);
  } catch {
    return null;
  }
}

function storeInSafeStorage(key) {
  if (!safeStorage.isEncryptionAvailable()) return;
  try {
    const encrypted = safeStorage.encryptString(key);
    fs.mkdirSync(path.dirname(CREDENTIAL_FILE), { recursive: true });
    fs.writeFileSync(CREDENTIAL_FILE, encrypted, { mode: 0o600 });
  } catch {
    // Non-fatal — key still works from memory this session
  }
}

module.exports = { loadConfig };
