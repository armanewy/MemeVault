import { app, BrowserWindow, globalShortcut, powerSaveBlocker } from 'electron';
import { createMainWindow, getMainWindow } from './windows/mainWindow';
import { createPaletteWindow, getPaletteWindow, showPaletteWindow } from './windows/paletteWindow';
import { ensureAppDirs } from './services/appPaths';
import { initializeDatabase, closeDatabase } from './db/db';
import { getSettings } from './db/repositories/settingsRepo';
import { registerIpc } from './ipc/registerIpc';
import { registerAssetJobHandlers } from './services/assetImporter';
import { startAllWatchers, stopAllWatchers } from './services/folderWatcher';
import { jobEvents } from './services/jobQueue';
import { startClipboardWatcher, stopClipboardWatcher } from './services/clipboardService';
import { logger } from './services/logger';

let powerBlockId: number | undefined;

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload);
  }
}

function registerShortcut(): void {
  globalShortcut.unregisterAll();
  const shortcut = getSettings().globalShortcut || 'CommandOrControl+Shift+M';
  const ok = globalShortcut.register(shortcut, () => showPaletteWindow());
  if (!ok) {
    logger.warn('Could not register global shortcut.', { shortcut });
    getMainWindow()?.webContents.send('settings:shortcutFailed', { shortcut });
  }
}

app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event) => event.preventDefault());
});

app.whenReady().then(() => {
  ensureAppDirs();
  initializeDatabase();
  registerAssetJobHandlers();
  registerIpc(registerShortcut);
  createMainWindow();
  createPaletteWindow();
  registerShortcut();
  startAllWatchers();
  if (getSettings().clipboardWatcherEnabled) startClipboardWatcher();
  powerBlockId = powerSaveBlocker.start('prevent-app-suspension');
  jobEvents.on('update', (job) => broadcast('jobs:update', job));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  stopAllWatchers();
  stopClipboardWatcher();
  if (powerBlockId !== undefined) powerSaveBlocker.stop(powerBlockId);
  closeDatabase();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

