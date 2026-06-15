import { ipcMain } from 'electron';
import {
  addAssetToCollection,
  createCollection,
  listCollections,
  removeAssetFromCollection
} from '../db/repositories/collectionRepo';
import { collectionAssetSchema, createCollectionSchema } from './schemas';

export function registerCollectionsIpc(): void {
  ipcMain.handle('collections:list', () => listCollections());
  ipcMain.handle('collections:create', (_event, payload) => {
    const parsed = createCollectionSchema.parse(payload);
    return createCollection(parsed.name, parsed.description);
  });
  ipcMain.handle('collections:addAsset', (_event, payload) => {
    const parsed = collectionAssetSchema.parse(payload);
    addAssetToCollection(parsed.collectionId, parsed.assetId);
    return { ok: true };
  });
  ipcMain.handle('collections:removeAsset', (_event, payload) => {
    const parsed = collectionAssetSchema.parse(payload);
    removeAssetFromCollection(parsed.collectionId, parsed.assetId);
    return { ok: true };
  });
}

