import { ipcMain } from 'electron';
import { createTag, deleteTag, listTags } from '../db/repositories/tagRepo';
import { createTagSchema, idSchema } from './schemas';

export function registerTagsIpc(): void {
  ipcMain.handle('tags:list', () => listTags());
  ipcMain.handle('tags:create', (_event, payload) => {
    const parsed = createTagSchema.parse(payload);
    return createTag(parsed.name, parsed.color);
  });
  ipcMain.handle('tags:delete', (_event, payload) => {
    deleteTag(idSchema.parse(payload).id);
    return { ok: true };
  });
}

