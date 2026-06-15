import chokidar, { FSWatcher } from 'chokidar';
import { stat } from 'node:fs/promises';
import type { WatchFolder } from '../types/domain';
import { listWatchFolders } from '../db/repositories/settingsRepo';
import { importFile } from './assetImporter';
import { markMissingByPath } from '../db/repositories/assetRepo';
import { normalizePath, shouldIgnoreWatchPath } from './fileScanner';
import { logger } from './logger';

const watchers = new Map<string, FSWatcher>();
const debounce = new Map<string, NodeJS.Timeout>();

function schedule(filePath: string, action: () => Promise<void>): void {
  const key = normalizePath(filePath);
  const existing = debounce.get(key);
  if (existing) clearTimeout(existing);
  debounce.set(
    key,
    setTimeout(() => {
      debounce.delete(key);
      action().catch((error) => logger.warn('Watcher action failed.', { filePath, error }));
    }, 500)
  );
}

export function addWatcher(folder: WatchFolder): void {
  if (!folder.enabled || watchers.has(folder.id)) return;
  const watcher = chokidar.watch(folder.path, {
    persistent: true,
    ignoreInitial: true,
    depth: folder.recursive ? undefined : 0,
    ignored: (path) => shouldIgnoreWatchPath(path)
  });
  watcher.on('add', (filePath) => {
    schedule(filePath, async () => {
      const info = await stat(filePath);
      if (info.isFile()) await importFile(filePath, 'watched_folder', folder.path);
    });
  });
  watcher.on('change', (filePath) => {
    schedule(filePath, async () => {
      const info = await stat(filePath);
      if (info.isFile()) await importFile(filePath, 'watched_folder', folder.path);
    });
  });
  watcher.on('unlink', (filePath) => markMissingByPath(normalizePath(filePath)));
  watcher.on('error', (error) => logger.warn('Folder watcher failed.', { folder, error }));
  watchers.set(folder.id, watcher);
}

export function removeWatcher(id: string): void {
  const watcher = watchers.get(id);
  if (watcher) void watcher.close();
  watchers.delete(id);
}

export function startAllWatchers(): void {
  for (const folder of listWatchFolders()) addWatcher(folder);
}

export function stopAllWatchers(): void {
  for (const id of [...watchers.keys()]) removeWatcher(id);
}

export function restartWatchers(): void {
  stopAllWatchers();
  startAllWatchers();
}

