import { ipcMain } from 'electron';
import { getOcrBlocks } from '../db/repositories/assetRepo';
import { exportRedacted, exportStitch, suggestRedactions } from '../services/receiptService';
import { exportRedactedSchema, exportStitchSchema, idSchema } from './schemas';

export function registerReceiptIpc(): void {
  ipcMain.handle('receipt:getOcrBlocks', (_event, payload) => getOcrBlocks(idSchema.parse(payload).id));
  ipcMain.handle('receipt:suggestRedactions', (_event, payload) => suggestRedactions(idSchema.parse(payload).id));
  ipcMain.handle('receipt:exportRedacted', (_event, payload) => {
    const parsed = exportRedactedSchema.parse(payload);
    return exportRedacted(parsed.assetId, parsed.boxes, parsed.style);
  });
  ipcMain.handle('receipt:exportStitch', (_event, payload) => {
    const parsed = exportStitchSchema.parse(payload);
    return exportStitch(parsed.assetIds, parsed.spacing, parsed.background, parsed.maxWidth);
  });
}

