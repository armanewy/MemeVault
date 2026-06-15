import { ipcMain } from 'electron';
import { exportImageMeme, exportVideoClip, getVideoInfo } from '../services/clipService';
import { enqueueJob, registerJobHandler } from '../services/jobQueue';
import { exportImageMemeSchema, exportVideoClipSchema, idSchema } from './schemas';

export function registerClipJobHandlers(): void {
  registerJobHandler('export_video_clip', async (input) => exportVideoClip(exportVideoClipSchema.parse(input)));
}

export function registerClipIpc(): void {
  ipcMain.handle('clip:exportImageMeme', (_event, payload) => exportImageMeme(exportImageMemeSchema.parse(payload)));
  ipcMain.handle('clip:exportVideoClip', (_event, payload) => {
    const parsed = exportVideoClipSchema.parse(payload);
    const job = enqueueJob('export_video_clip', parsed, parsed.assetId);
    return { jobId: job.id };
  });
  ipcMain.handle('clip:getVideoInfo', (_event, payload) => getVideoInfo(idSchema.parse(payload).id));
}

