import { app, dialog, ipcMain, shell } from 'electron';
import { getSettings, updateSettings } from '../db/repositories/settingsRepo';
import { clearGeneratedThumbnails, exportBackup, getLogFolder, importBackup } from '../services/backupService';
import { settingsPatchSchema, importBackupSchema } from './schemas';
import { restartWatchers } from '../services/folderWatcher';
import { startClipboardWatcher, stopClipboardWatcher } from '../services/clipboardService';
import { enqueueJob } from '../services/jobQueue';
import { getLogsDir, getUserDataRoot } from '../services/appPaths';

export function registerSettingsIpc(onShortcutChanged: () => void): void {
  ipcMain.handle('settings:get', () => getSettings());
  ipcMain.handle('settings:getAlphaInfo', () => ({
    name: 'MemeVault Alpha',
    version: app.getVersion(),
    dataDir: getUserDataRoot(),
    logsDir: getLogsDir(),
    packaged: app.isPackaged
  }));
  ipcMain.handle('settings:update', (_event, payload) => {
    const settings = updateSettings(settingsPatchSchema.parse(payload));
    onShortcutChanged();
    if (settings.clipboardWatcherEnabled) startClipboardWatcher();
    else stopClipboardWatcher();
    return settings;
  });
  ipcMain.handle('settings:clearCache', async () => {
    await clearGeneratedThumbnails();
    const job = enqueueJob('regenerate_thumbnails', {});
    return { ok: true, jobId: job.id };
  });
  ipcMain.handle('settings:exportBackup', async () => ({ path: await exportBackup() }));
  ipcMain.handle('settings:importBackup', async (_event, payload) => {
    const parsed = importBackupSchema.parse(payload);
    let backupPath = parsed?.path;
    if (!backupPath) {
      const result = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'SQLite', extensions: ['sqlite', 'db'] }] });
      backupPath = result.filePaths[0];
    }
    if (!backupPath) throw new Error('No backup selected.');
    const response = await importBackup(backupPath);
    restartWatchers();
    return response;
  });
  ipcMain.handle('settings:openLogs', async () => {
    await shell.openPath(getLogFolder());
    return { ok: true };
  });
}
