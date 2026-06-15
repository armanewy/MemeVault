import { basename, extname } from 'node:path';
import { stat } from 'node:fs/promises';
import type { Asset, ImportResult } from '../types/domain';
import {
  createAsset,
  findByNormalizedPath,
  findBySha256,
  getAssetOrThrow,
  listAssets,
  updateAsset
} from '../db/repositories/assetRepo';
import { addTagToAsset } from '../db/repositories/tagRepo';
import { inferKind, inferMime, normalizePath, scanPath } from './fileScanner';
import { sha256File } from './hashService';
import { computeImageAHash } from './perceptualHash';
import { probeAsset } from './mediaProbeService';
import { generateThumbnail } from './thumbnailService';
import { recognizeAsset } from './ocrService';
import { enqueueJob, registerJobHandler } from './jobQueue';
import { logger } from './logger';

type SourceType = 'manual_import' | 'watched_folder' | 'clipboard' | 'export';

export interface ImportSummary {
  asset?: Asset;
  skipped: boolean;
  jobIds: string[];
}

export function enqueueProcessing(asset: Asset): string[] {
  const jobIds = [
    enqueueJob('hash_asset', { assetId: asset.id }, asset.id).id,
    enqueueJob('probe_media', { assetId: asset.id }, asset.id).id,
    enqueueJob('generate_thumbnail', { assetId: asset.id }, asset.id).id
  ];
  if (asset.kind === 'image') {
    jobIds.push(enqueueJob('ocr_asset', { assetId: asset.id }, asset.id).id);
  }
  return jobIds;
}

export async function importFile(
  filePath: string,
  sourceType: SourceType = 'manual_import',
  sourceDetail?: string
): Promise<ImportSummary> {
  const normalizedPath = normalizePath(filePath);
  const existingPath = findByNormalizedPath(normalizedPath);
  if (existingPath) return { asset: existingPath, skipped: true, jobIds: [] };
  const info = await stat(normalizedPath);
  if (!info.isFile()) return { skipped: true, jobIds: [] };
  const asset = createAsset({
    originalPath: normalizedPath,
    normalizedPath,
    filename: basename(normalizedPath),
    ext: extname(normalizedPath).toLowerCase(),
    mime: inferMime(normalizedPath),
    kind: inferKind(normalizedPath),
    fileSize: info.size,
    fileCreatedAt: info.birthtime?.toISOString(),
    fileModifiedAt: info.mtime?.toISOString(),
    sourceType,
    sourceDetail
  });
  return { asset, skipped: false, jobIds: enqueueProcessing(asset) };
}

export async function importMany(paths: string[], sourceType: SourceType = 'manual_import'): Promise<ImportResult> {
  let imported = 0;
  let skipped = 0;
  const jobIds: string[] = [];
  for (const inputPath of paths) {
    try {
      const files = await scanPath(inputPath);
      for (const file of files) {
        const result = await importFile(file, sourceType, inputPath);
        if (result.skipped) skipped += 1;
        else imported += 1;
        jobIds.push(...result.jobIds);
      }
    } catch (error) {
      skipped += 1;
      logger.warn('Import skipped.', { inputPath, error });
    }
  }
  return { imported, skipped, jobIds };
}

export async function importExportedFile(filePath: string, sourceDetail: string, tags: string[] = []): Promise<Asset> {
  const result = await importFile(filePath, 'export', sourceDetail);
  const asset = result.asset;
  if (!asset) throw new Error('Exported file could not be imported.');
  let current = asset;
  for (const tag of tags) {
    current = addTagToAsset(current.id, tag);
  }
  return current;
}

export function registerAssetJobHandlers(): void {
  registerJobHandler('scan_folder', async (input, _job, progress) => {
    const files = await scanPath(String(input.path), input.recursive !== false);
    let processed = 0;
    let imported = 0;
    let skipped = 0;
    for (const file of files) {
      const result = await importFile(file, input.sourceType ?? 'manual_import', String(input.path));
      if (result.skipped) skipped += 1;
      else imported += 1;
      processed += 1;
      progress(processed / Math.max(files.length, 1));
    }
    return { imported, skipped };
  });

  registerJobHandler('hash_asset', async (input) => {
    const asset = getAssetOrThrow(String(input.assetId));
    const sha256 = await sha256File(asset.originalPath);
    const existing = findBySha256(sha256);
    if (existing && existing.id !== asset.id) {
      logger.info('Exact duplicate detected after import.', {
        assetId: asset.id,
        duplicateOf: existing.id,
        sha256
      });
    }
    updateAsset(asset.id, { sha256 });
    return { sha256, duplicateOf: existing && existing.id !== asset.id ? existing.id : undefined };
  });

  registerJobHandler('probe_media', async (input) => {
    const asset = getAssetOrThrow(String(input.assetId));
    const info = await probeAsset(asset);
    updateAsset(asset.id, info);
    return info;
  });

  registerJobHandler('generate_thumbnail', async (input) => {
    const asset = getAssetOrThrow(String(input.assetId));
    const result = await generateThumbnail(asset);
    updateAsset(asset.id, result);
    try {
      const phashInput = result.thumbnailPath || asset.originalPath;
      const phash = await computeImageAHash(phashInput);
      updateAsset(asset.id, { phash });
    } catch (error) {
      logger.warn('Perceptual hash failed.', { assetId: asset.id, error });
    }
    return result;
  });

  registerJobHandler('ocr_asset', async (input) => recognizeAsset(String(input.assetId)));

  registerJobHandler('regenerate_thumbnails', async (_input, _job, progress) => {
    const assets = listAssets(10000, 0);
    let done = 0;
    for (const asset of assets) {
      try {
        const result = await generateThumbnail(asset);
        updateAsset(asset.id, result);
      } catch (error) {
        logger.warn('Thumbnail regeneration skipped asset.', { assetId: asset.id, error });
      }
      done += 1;
      progress(done / Math.max(assets.length, 1));
    }
    return { regenerated: done };
  });
}
