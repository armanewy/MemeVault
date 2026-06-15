import { dialog, ipcMain } from 'electron';
import {
  addWatchFolder,
  listWatchFolders,
  removeWatchFolder,
  updateWatchFolderScan
} from '../db/repositories/settingsRepo';
import { enqueueJob } from '../services/jobQueue';
import { addWatcher, removeWatcher } from '../services/folderWatcher';
import { importMany } from '../services/assetImporter';
import { importFilesSchema, idSchema, watchFolderSchema } from './schemas';

export function registerLibraryIpc(): void {
  ipcMain.handle('library:importFiles', async (_event, payload) => {
    const parsed = importFilesSchema.parse(payload);
    let paths = parsed?.paths;
    if (!paths?.length) {
      const result = await dialog.showOpenDialog({
        properties: ['openFile', 'openDirectory', 'multiSelections'],
        filters: [
          { name: 'Media', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'mp4', 'mov', 'webm'] }
        ]
      });
      paths = result.filePaths;
    }
    if (!paths?.length) return { imported: 0, skipped: 0, jobIds: [] };
    return importMany(paths, 'manual_import');
  });

  ipcMain.handle('library:addWatchFolder', async (_event, payload) => {
    const parsed = watchFolderSchema.parse(payload);
    let folderPath = parsed?.path;
    if (!folderPath) {
      const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
      folderPath = result.filePaths[0];
    }
    if (!folderPath) throw new Error('No folder selected.');
    const folder = addWatchFolder(folderPath, parsed?.recursive ?? true);
    addWatcher(folder);
    const job = enqueueJob('scan_folder', { path: folder.path, recursive: folder.recursive, sourceType: 'watched_folder' });
    updateWatchFolderScan(folder.id);
    return { ...folder, scanJobId: job.id };
  });

  ipcMain.handle('library:listWatchFolders', () => listWatchFolders());
  ipcMain.handle('library:removeWatchFolder', (_event, payload) => {
    const { id } = idSchema.parse(payload);
    removeWatcher(id);
    removeWatchFolder(id);
    return { ok: true };
  });
  ipcMain.handle('library:rescanFolder', (_event, payload) => {
    const { id } = idSchema.parse(payload);
    const folder = listWatchFolders().find((item) => item.id === id);
    if (!folder) throw new Error('Watch folder not found.');
    const job = enqueueJob('scan_folder', { path: folder.path, recursive: folder.recursive, sourceType: 'watched_folder' });
    updateWatchFolderScan(folder.id);
    return { jobId: job.id };
  });
}

