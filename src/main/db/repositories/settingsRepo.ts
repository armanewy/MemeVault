import type { AppSettings, WatchFolder } from '../../types/domain';
import { getDb } from '../db';
import { getUserDataRoot } from '../../services/appPaths';

function iso(): string {
  return new Date().toISOString();
}

const DEFAULTS: Omit<AppSettings, 'storageLocation'> = {
  firstRunComplete: false,
  globalShortcut: 'CommandOrControl+Shift+M',
  clipboardWatcherEnabled: false,
  autoPasteEnabled: true,
  ocrEnabled: true,
  ocrLanguage: 'eng',
  ocrMaxFileSizeMb: 12,
  clipboardMinWidth: 100,
  clipboardMinHeight: 100,
  theme: 'dark'
};

export function getSettings(): AppSettings {
  const rows = getDb().prepare('SELECT key, value_json FROM settings').all() as { key: string; value_json: string }[];
  const stored: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      stored[row.key] = JSON.parse(row.value_json);
    } catch {
      stored[row.key] = undefined;
    }
  }
  return {
    ...DEFAULTS,
    ...stored,
    theme: 'dark',
    storageLocation: getUserDataRoot()
  };
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const stmt = getDb().prepare('INSERT OR REPLACE INTO settings (key, value_json, updated_at) VALUES (?, ?, ?)');
  const now = iso();
  const allowed = Object.keys(DEFAULTS);
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'storageLocation' || !allowed.includes(key)) continue;
    stmt.run(key, JSON.stringify(value), now);
  }
  return getSettings();
}

function rowToWatchFolder(row: Record<string, unknown>): WatchFolder {
  return {
    id: String(row.id),
    path: String(row.path),
    enabled: Number(row.enabled ?? 0) === 1,
    recursive: Number(row.recursive ?? 0) === 1,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    lastScanAt: typeof row.last_scan_at === 'string' ? row.last_scan_at : undefined
  };
}

export function listWatchFolders(): WatchFolder[] {
  return (getDb().prepare('SELECT * FROM watch_folders ORDER BY path').all() as Record<string, unknown>[]).map(
    rowToWatchFolder
  );
}

export function addWatchFolder(path: string, recursive = true): WatchFolder {
  const id = crypto.randomUUID();
  const now = iso();
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO watch_folders (id, path, enabled, recursive, created_at, updated_at)
       VALUES (COALESCE((SELECT id FROM watch_folders WHERE path = ?), ?), ?, 1, ?, ?, ?)`
    )
    .run(path, id, path, recursive ? 1 : 0, now, now);
  return rowToWatchFolder(getDb().prepare('SELECT * FROM watch_folders WHERE path = ?').get(path) as Record<string, unknown>);
}

export function removeWatchFolder(id: string): void {
  getDb().prepare('DELETE FROM watch_folders WHERE id = ?').run(id);
}

export function updateWatchFolderScan(id: string): void {
  const now = iso();
  getDb().prepare('UPDATE watch_folders SET last_scan_at = ?, updated_at = ? WHERE id = ?').run(now, now, id);
}

