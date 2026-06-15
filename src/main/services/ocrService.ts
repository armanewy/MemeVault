import type { Asset, OcrBlock } from '../types/domain';
import { getAssetOrThrow, replaceOcrBlocks, updateAsset } from '../db/repositories/assetRepo';
import { getSettings } from '../db/repositories/settingsRepo';
import { logger } from './logger';
import { getTempDir } from './appPaths';

export function normalizeOcrText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function extractBlocks(data: any): Omit<OcrBlock, 'id' | 'assetId'>[] {
  const words = Array.isArray(data?.words) ? data.words : [];
  return words
    .filter((word: any) => typeof word.text === 'string' && word.text.trim())
    .map((word: any) => {
      const bbox = word.bbox ?? {};
      return {
        text: word.text.trim(),
        confidence: typeof word.confidence === 'number' ? word.confidence : undefined,
        x: Number(bbox.x0 ?? 0),
        y: Number(bbox.y0 ?? 0),
        width: Math.max(1, Number((bbox.x1 ?? 0) - (bbox.x0 ?? 0))),
        height: Math.max(1, Number((bbox.y1 ?? 0) - (bbox.y0 ?? 0))),
        blockType: 'word' as const
      };
    });
}

export async function recognizeAsset(assetId: string): Promise<Asset> {
  const settings = getSettings();
  const asset = getAssetOrThrow(assetId);
  if (!settings.ocrEnabled || asset.kind !== 'image') return asset;
  if (asset.fileSize > settings.ocrMaxFileSizeMb * 1024 * 1024) return asset;
  try {
    const Tesseract = await import('tesseract.js');
    const result = await Tesseract.recognize(asset.originalPath, settings.ocrLanguage || 'eng', {
      cachePath: getTempDir()
    } as Record<string, unknown>);
    const text = normalizeOcrText(result.data.text ?? '');
    replaceOcrBlocks(assetId, extractBlocks(result.data));
    return updateAsset(assetId, { ocrText: text });
  } catch (error) {
    logger.warn('OCR failed.', { assetId, error });
    throw new Error(error instanceof Error ? error.message : 'OCR failed.');
  }
}
