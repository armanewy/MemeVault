import { copyFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { getBackupsDir, getDbPath, getLogsDir, getPreviewDir, getThumbnailDir } from './appPaths';
import { closeDatabase, initializeDatabase } from '../db/db';

export async function exportBackup(destination?: string): Promise<string> {
  await mkdir(getBackupsDir(), { recursive: true });
  const filePath =
    destination ??
    join(getBackupsDir(), `memevault-backup-${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID().slice(0, 8)}.sqlite`);
  await copyFile(getDbPath(), filePath);
  return filePath;
}

export async function importBackup(path: string): Promise<{ ok: true }> {
  closeDatabase();
  await copyFile(path, getDbPath());
  initializeDatabase();
  return { ok: true };
}

export async function clearGeneratedThumbnails(): Promise<void> {
  await Promise.all([
    rm(getThumbnailDir(), { recursive: true, force: true }),
    rm(getPreviewDir(), { recursive: true, force: true })
  ]);
  await Promise.all([mkdir(getThumbnailDir(), { recursive: true }), mkdir(getPreviewDir(), { recursive: true })]);
}

export function getLogFolder(): string {
  return getLogsDir();
}

