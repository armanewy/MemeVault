import { ipcMain, shell } from 'electron';
import {
  getAssetDetail,
  getAssetOrThrow,
  getSimilarAssets,
  removeFromVault,
  toggleFavorite
} from '../db/repositories/assetRepo';
import { addTagToAsset, removeTagFromAsset } from '../db/repositories/tagRepo';
import { searchAssets } from '../services/searchService';
import { attemptClipboardPaste, autoPasteAsset, copyAssetToClipboard } from '../services/clipboardService';
import { enqueueJob } from '../services/jobQueue';
import { addTagSchema, getManySchema, idSchema, removeTagSchema, searchSchema } from './schemas';

export function registerAssetsIpc(): void {
  ipcMain.handle('assets:search', (_event, payload) => searchAssets(searchSchema.parse(payload)));
  ipcMain.handle('assets:get', (_event, payload) => getAssetDetail(idSchema.parse(payload).id));
  ipcMain.handle('assets:getMany', (_event, payload) => {
    const { ids } = getManySchema.parse(payload);
    return ids.map((id) => getAssetOrThrow(id));
  });
  ipcMain.handle('assets:toggleFavorite', (_event, payload) => toggleFavorite(idSchema.parse(payload).id));
  ipcMain.handle('assets:addTag', (_event, payload) => {
    const parsed = addTagSchema.parse(payload);
    return addTagToAsset(parsed.assetId, parsed.tagName);
  });
  ipcMain.handle('assets:removeTag', (_event, payload) => {
    const parsed = removeTagSchema.parse(payload);
    return removeTagFromAsset(parsed.assetId, parsed.tagId);
  });
  ipcMain.handle('assets:copyToClipboard', (_event, payload) => copyAssetToClipboard(idSchema.parse(payload).id));
  ipcMain.handle('assets:autoPaste', (_event, payload) => autoPasteAsset(idSchema.parse(payload).id));
  ipcMain.handle('assets:attemptPaste', () => attemptClipboardPaste());
  ipcMain.handle('assets:revealInFileManager', (_event, payload) => {
    const asset = getAssetOrThrow(idSchema.parse(payload).id);
    shell.showItemInFolder(asset.originalPath);
    return { ok: true };
  });
  ipcMain.handle('assets:removeFromVault', (_event, payload) => {
    removeFromVault(idSchema.parse(payload).id);
    return { ok: true };
  });
  ipcMain.handle('assets:rerunOcr', (_event, payload) => {
    const { id } = idSchema.parse(payload);
    const job = enqueueJob('ocr_asset', { assetId: id }, id);
    return { jobId: job.id };
  });
  ipcMain.handle('assets:getSimilar', (_event, payload) => getSimilarAssets(idSchema.parse(payload).id, payload?.limit ?? 12));
}
