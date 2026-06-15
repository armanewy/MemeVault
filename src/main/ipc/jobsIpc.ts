import { ipcMain } from 'electron';
import { cancelJob, listJobs } from '../db/repositories/jobRepo';
import { idSchema, jobsListSchema } from './schemas';

export function registerJobsIpc(): void {
  ipcMain.handle('jobs:list', (_event, payload) => listJobs(jobsListSchema.parse(payload)?.status));
  ipcMain.handle('jobs:cancel', (_event, payload) => {
    cancelJob(idSchema.parse(payload).id);
    return { ok: true };
  });
}

