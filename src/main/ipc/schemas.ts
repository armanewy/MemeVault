import { z } from 'zod';

export const idSchema = z.object({ id: z.string().min(1) });
export const getManySchema = z.object({ ids: z.array(z.string().min(1)).max(500) });

export const settingsPatchSchema = z
  .object({
    firstRunComplete: z.boolean().optional(),
    globalShortcut: z.string().min(3).optional(),
    clipboardWatcherEnabled: z.boolean().optional(),
    autoPasteEnabled: z.boolean().optional(),
    ocrEnabled: z.boolean().optional(),
    ocrLanguage: z.string().min(1).optional(),
    ocrMaxFileSizeMb: z.number().positive().optional(),
    clipboardMinWidth: z.number().int().positive().optional(),
    clipboardMinHeight: z.number().int().positive().optional()
  })
  .strict();

export const importFilesSchema = z.object({ paths: z.array(z.string()).optional() }).optional();
export const watchFolderSchema = z.object({ path: z.string().optional(), recursive: z.boolean().optional() }).optional();

export const searchSchema = z.object({
  q: z.string().default(''),
  kind: z.enum(['image', 'gif', 'video', 'all']).optional(),
  tags: z.array(z.string()).optional(),
  collectionId: z.string().optional(),
  favoritesOnly: z.boolean().optional(),
  duplicates: z.boolean().optional(),
  limit: z.number().int().positive().max(500).optional(),
  offset: z.number().int().nonnegative().optional(),
  sort: z.enum(['relevance', 'recent', 'used']).optional()
});

export const addTagSchema = z.object({ assetId: z.string(), tagName: z.string().min(1) });
export const removeTagSchema = z.object({ assetId: z.string(), tagId: z.string() });
export const createTagSchema = z.object({ name: z.string().min(1), color: z.string().optional() });

export const createCollectionSchema = z.object({ name: z.string().min(1), description: z.string().optional() });
export const collectionAssetSchema = z.object({ collectionId: z.string(), assetId: z.string() });

export const jobsListSchema = z.object({ status: z.string().optional() }).optional();

export const redactionBoxSchema = z.object({
  id: z.string().optional(),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  label: z.string().optional()
});

export const exportRedactedSchema = z.object({
  assetId: z.string(),
  boxes: z.array(redactionBoxSchema),
  style: z.enum(['black', 'pixelate', 'blur'])
});

export const exportStitchSchema = z.object({
  assetIds: z.array(z.string()).min(2),
  spacing: z.number().min(0).max(200),
  background: z.string().default('#ffffff'),
  maxWidth: z.number().positive().optional()
});

export const exportImageMemeSchema = z.object({
  assetId: z.string(),
  topText: z.string().optional(),
  bottomText: z.string().optional(),
  preset: z.enum(['original', 'square', 'vertical', 'horizontal', 'discord']),
  textColor: z.enum(['white', 'black']),
  stroke: z.boolean(),
  uppercase: z.boolean()
});

export const exportVideoClipSchema = z.object({
  assetId: z.string(),
  startMs: z.number().min(0),
  endMs: z.number().positive(),
  format: z.enum(['mp4', 'gif']),
  preset: z.enum(['original', 'square', 'vertical', 'horizontal', 'discord']),
  topText: z.string().optional(),
  bottomText: z.string().optional()
});

export const importBackupSchema = z.object({ path: z.string().min(1) }).optional();
