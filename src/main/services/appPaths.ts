import { app } from 'electron';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

export function getUserDataRoot(): string {
  return join(app.getPath('userData'), 'MemeVault');
}

export function getDbPath(): string {
  return join(getUserDataRoot(), 'memevault.sqlite');
}

export function getThumbnailDir(): string {
  return join(getUserDataRoot(), 'thumbnails');
}

export function getPreviewDir(): string {
  return join(getUserDataRoot(), 'previews');
}

export function getTempDir(): string {
  return join(getUserDataRoot(), 'temp');
}

export function getLogsDir(): string {
  return join(getUserDataRoot(), 'logs');
}

export function getBackupsDir(): string {
  return join(getUserDataRoot(), 'backups');
}

export function getExportDir(operation: string): string {
  const month = new Date().toISOString().slice(0, 7);
  return join(getUserDataRoot(), 'exports', operation, month);
}

export function ensureAppDirs(): void {
  for (const dir of [
    getUserDataRoot(),
    getThumbnailDir(),
    getPreviewDir(),
    getTempDir(),
    getLogsDir(),
    getBackupsDir(),
    getExportDir('redacted'),
    getExportDir('stitch'),
    getExportDir('captioned'),
    getExportDir('clip'),
    getExportDir('clipboard')
  ]) {
    mkdirSync(dir, { recursive: true });
  }
}

