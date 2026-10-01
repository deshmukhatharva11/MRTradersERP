// =============================================================
// MR Traders ERP — Electron Fuses Configuration
// =============================================================
// Disables dangerous Electron features at the binary level.
// These fuses are baked into the exe and cannot be toggled
// at runtime, making them tamper-resistant.
//
// Run after electron-builder packs the app (afterPack hook).
// =============================================================
'use strict';

const path = require('path');
const {
  flipFuses,
  FuseVersion,
  FuseV1Options,
} = require('@electron/fuses');

async function setFuses(context) {
  // When called by electron-builder as afterPack hook
  const electronBinaryPath = context
    ? path.join(
        context.appOutDir,
        context.packager.appInfo.productFilename + '.exe'
      )
    : getLocalElectronPath();

  console.log(`\n🔒 Setting Electron Fuses on: ${electronBinaryPath}\n`);

  await flipFuses(electronBinaryPath, {
    version: FuseVersion.V1,

    // [REQ 10] Disable ELECTRON_RUN_AS_NODE
    // Prevents the exe from being used as a generic Node.js runtime
    [FuseV1Options.RunAsNode]: false,

    // [REQ 10] Disable Node.js CLI flags (--inspect, --inspect-brk)
    // Prevents attaching a debugger to the main process
    [FuseV1Options.EnableNodeCliInspectArguments]: false,

    // [REQ 10] Disable loading non-ASAR resources
    // Forces the app to load code only from the signed ASAR archive
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,

    // [REQ 10] Enforce ASAR integrity (only loads verified ASAR)
    [FuseV1Options.OnlyLoadAppFromAsar]: true,

    // Disable Node.js OPTIONS environment variable
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,

    // Enable cookie encryption
    [FuseV1Options.EnableCookieEncryption]: true,

    // Grant file access to file:// URIs (needed for splash.html)
    [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
  });

  console.log('✅ Electron Fuses set successfully.\n');
  console.log('   Disabled: RunAsNode, NodeCliInspect, NodeOptions');
  console.log('   Enabled:  ASAR integrity, Cookie encryption');
  console.log('   Disabled: OnlyLoadAppFromAsar bypass');
}

function getLocalElectronPath() {
  // For standalone execution (not via electron-builder)
  const electronPath = require('electron');
  return typeof electronPath === 'string'
    ? electronPath
    : path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe');
}

// Support both direct execution and electron-builder afterPack hook
if (require.main === module) {
  setFuses(null).catch((err) => {
    console.error('Failed to set fuses:', err);
    process.exit(1);
  });
} else {
  module.exports = setFuses;
}
