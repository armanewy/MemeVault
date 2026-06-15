import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import type { Asset } from '../types/domain';
import { getPreviewDir, getThumbnailDir } from './appPaths';
import { logger } from './logger';

const MAX_STILL_IMAGE_MEGAPIXELS = 80;

async function ensureDirs(): Promise<void> {
  await Promise.all([mkdir(getThumbnailDir(), { recursive: true }), mkdir(getPreviewDir(), { recursive: true })]);
}

function tooLargeMessage(width: number, height: number): string {
  return `Image is too large for thumbnail generation (${width}x${height}, max ${MAX_STILL_IMAGE_MEGAPIXELS}MP).`;
}

async function assertStillImageSize(filePath: string): Promise<void> {
  const metadata = await sharp(filePath, { animated: false }).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (!width || !height) throw new Error('Could not read image dimensions for thumbnail generation.');
  if ((width * height) / 1_000_000 > MAX_STILL_IMAGE_MEGAPIXELS) {
    throw new Error(tooLargeMessage(width, height));
  }
}

export async function generateImageThumbnail(asset: Asset): Promise<{ thumbnailPath: string; previewPath: string }> {
  await ensureDirs();
  await assertStillImageSize(asset.originalPath);
  const thumbnailPath = join(getThumbnailDir(), `${asset.id}.jpg`);
  const previewPath = join(getPreviewDir(), `${asset.id}.jpg`);
  await sharp(asset.originalPath, { animated: false, limitInputPixels: MAX_STILL_IMAGE_MEGAPIXELS * 1_000_000 })
    .rotate()
    .resize(420, 420, { fit: 'cover' })
    .jpeg({ quality: 78 })
    .toFile(thumbnailPath);
  await sharp(asset.originalPath, { animated: false, limitInputPixels: MAX_STILL_IMAGE_MEGAPIXELS * 1_000_000 })
    .rotate()
    .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 86 })
    .toFile(previewPath);
  return { thumbnailPath, previewPath };
}

export async function generateGifThumbnail(asset: Asset): Promise<{ thumbnailPath: string; previewPath: string }> {
  return generateVideoThumbnail(asset);
}

function runFfmpeg(args: string[]): Promise<void> {
  const binary = ffmpegPath;
  if (!binary) return Promise.reject(new Error('FFmpeg binary was not found.'));
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args);
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += String(chunk);
    });
    child.on('error', reject);
    child.on('close', (code: number | null) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `FFmpeg failed with exit code ${code}.`));
    });
  });
}

export async function generateVideoThumbnail(asset: Asset): Promise<{ thumbnailPath: string; previewPath: string }> {
  await ensureDirs();
  const thumbnailPath = join(getThumbnailDir(), `${asset.id}.jpg`);
  const previewPath = join(getPreviewDir(), `${asset.id}.jpg`);
  const attempts = ['00:00:01', '00:00:00.100'];
  for (const timestamp of attempts) {
    try {
      await runFfmpeg([
        '-y',
        '-ss',
        timestamp,
        '-i',
        asset.originalPath,
        '-frames:v',
        '1',
        '-vf',
        'scale=640:-1',
        thumbnailPath
      ]);
      await sharp(thumbnailPath).resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 86 }).toFile(previewPath);
      return { thumbnailPath, previewPath };
    } catch (error) {
      logger.warn('Video thumbnail extraction attempt failed.', { assetId: asset.id, timestamp, error });
    }
  }
  await generateVideoPlaceholder(asset, thumbnailPath, previewPath);
  logger.warn('Video thumbnail extraction failed; generated placeholder.', { assetId: asset.id });
  return { thumbnailPath, previewPath };
}

async function generateVideoPlaceholder(asset: Asset, thumbnailPath: string, previewPath: string): Promise<void> {
  const label = asset.kind === 'gif' ? 'GIF' : 'VIDEO';
  const svg = Buffer.from(`
    <svg width="640" height="360" xmlns="http://www.w3.org/2000/svg">
      <rect width="640" height="360" fill="#11151B"/>
      <rect x="1" y="1" width="638" height="358" fill="none" stroke="#26303A" stroke-width="2"/>
      <polygon points="284,130 284,230 372,180" fill="#8B5CF6"/>
      <text x="320" y="292" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif" font-size="34" font-weight="700" fill="#F4F7FA">${label}</text>
    </svg>
  `);
  await sharp(svg).jpeg({ quality: 82 }).toFile(thumbnailPath);
  await sharp(svg).resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 86 }).toFile(previewPath);
}

export async function generateThumbnail(asset: Asset): Promise<{ thumbnailPath: string; previewPath: string }> {
  if (asset.kind === 'video') return generateVideoThumbnail(asset);
  if (asset.kind === 'gif') return generateGifThumbnail(asset);
  return generateImageThumbnail(asset);
}
