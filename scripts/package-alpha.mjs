import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const target = process.argv[2];
const builderArg = target === 'win' ? '--win' : target === 'mac' ? '--mac' : undefined;
const electronVersion = JSON.parse(readFileSync(new URL('../node_modules/electron/package.json', import.meta.url), 'utf8')).version;
const arch = process.env.npm_config_arch || process.arch;

if (!builderArg) {
  console.error('Usage: node scripts/package-alpha.mjs <win|mac>');
  process.exit(1);
}

function run(name, args) {
  const result = spawnSync(name, args, { shell: process.platform === 'win32', stdio: 'inherit' });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const error = new Error(`${name} ${args.join(' ')} failed`);
    error.status = result.status ?? 1;
    throw error;
  }
}

let exitCode = 0;

try {
  run('npm', ['run', 'build']);
  run('npx', ['electron-rebuild', '-f', '-w', 'better-sqlite3', '-v', electronVersion, '--arch', arch]);
  run('npx', ['electron-builder', builderArg, '--publish', 'never', '--config.npmRebuild=false']);
} catch (error) {
  exitCode = typeof error.status === 'number' ? error.status : 1;
} finally {
  console.log('Restoring native modules for the local Node runtime...');
  const restore = spawnSync('npm', ['rebuild', 'better-sqlite3', 'sharp'], {
    shell: process.platform === 'win32',
    stdio: 'inherit'
  });
  if (restore.error) {
    console.error(restore.error);
  }
  if (restore.status !== 0 && exitCode === 0) {
    exitCode = restore.status ?? 1;
  }
}

process.exit(exitCode);
