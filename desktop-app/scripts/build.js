// =============================================================
// MR Traders ERP — Build Pipeline
// =============================================================
// Orchestrates: audit → lint → build → fuses → verify
// Usage:  node scripts/build.js [--skip-audit] [--skip-sign]
// =============================================================
'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const skipAudit = args.includes('--skip-audit');
const skipSign  = args.includes('--skip-sign');

function run(cmd, label) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`▶ ${label}`);
  console.log(`  $ ${cmd}`);
  console.log('─'.repeat(60));
  execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
}

function checkConfigExists() {
  const configPath = path.join(ROOT, 'client-config.json');
  if (!fs.existsSync(configPath)) {
    console.error('\n❌ client-config.json not found!');
    console.error('   Copy client-config.json.example and fill in the values.');
    process.exit(1);
  }
  // Validate it's real config, not the example
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  if (config.apiUrl.includes('example') || config.appKey.includes('CHANGE_ME')) {
    console.error('\n❌ client-config.json still has placeholder values!');
    console.error('   Replace apiUrl and appKey with real values before building.');
    process.exit(1);
  }
  console.log('✅ client-config.json validated');
}

async function main() {
  console.log('🔨 MR Traders ERP — Desktop Client Build\n');

  // 1. Verify config
  checkConfigExists();

  // 2. Install dependencies
  run('npm ci --production=false', 'Installing dependencies');

  // 3. Security audit
  if (!skipAudit) {
    try {
      run('npm audit --production --audit-level=high', 'Security audit');
    } catch {
      console.warn('⚠️  npm audit found issues — review before shipping!');
    }
  }

  // 4. Build with electron-builder
  const signEnv = skipSign ? 'cross-env CSC_IDENTITY_AUTO_DISCOVERY=false ' : '';
  run(`${signEnv}npx electron-builder --win --x64`, 'Building Windows installer');

  // 5. Fuses are set by afterPack hook automatically

  // 6. Verify output
  const distDir = path.join(ROOT, 'dist');
  if (fs.existsSync(distDir)) {
    const files = fs.readdirSync(distDir).filter(f => f.endsWith('.exe'));
    if (files.length > 0) {
      console.log(`\n✅ Build complete! Installer: dist/${files[0]}`);
      console.log(`   Size: ${(fs.statSync(path.join(distDir, files[0])).size / 1024 / 1024).toFixed(1)} MB`);
    }
  }

  // 7. Post-build reminders
  console.log('\n📋 Post-build checklist:');
  console.log('   ☐ Test the installer on a clean Windows machine');
  console.log('   ☐ Verify fuses: npx @electron/fuses read dist/win-unpacked/MR\\ Traders\\ ERP.exe');
  console.log('   ☐ Check ASAR: npx @electron/asar list dist/win-unpacked/resources/app.asar');
  console.log('   ☐ Run strings scan: strings dist/*.exe | findstr /i "app-key"');
  console.log('   ☐ Code-sign the installer if --skip-sign was used');
}

main().catch((err) => {
  console.error('\n❌ Build failed:', err.message);
  process.exit(1);
});
