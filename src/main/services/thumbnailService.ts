import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import type { Asset } from '../types/domain';
import { getPreviewDir, getThumbnailDir } from './appPaths';
import { logger } from './logger';

async function ensureDirs(): Promise<void> {
  await Promise.all([mkdir(getThumbnailDir(), { recursive: true }), mkdir(getPreviewDir(), { recursive: true })]);
}

export async function generateImageThumbnail(asset: Asset): Promise<{ thumbnailPath: string; previewPath: string }> {
  await ensureDirs();
  const thumbnailPath = join(getThumbnailDir(), `${asset.id}.jpg`);
  const previewPath = join(getPreviewDir(), `${asset.id}.jpg`);
  await sharp(asset.originalPath, { animated: false, limitInputPixels: false })
    .rotate()
    .resize(420, 420, { fit: 'cover' })
    .jpeg({ quality: 78 })
    .toFile(thumbnailPath);
  await sharp(asset.originalPath, { animated: false, limitInputPixels: false })
    .rotate()
    .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 86 })
    .toFile(previewPath);
  return { thumbnailPath, previewPath };
}

export async function generateGifThumbnail(asset: Asset): Promise<{ thumbnailPath: string; previewPath: string }> {
  return generateImageThumbnail(asset);
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
  try {
    await runFfmpeg([
      '-y',
      '-ss',
      '00:00:01',
      '-i',
      asset.originalPath,
      '-frames:v',
      '1',
      '-vf',
      'scale=640:-1',
      thumbnailPath
    ]);
    await sharp(thumbnailPath).resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 86 }).toFile(previewPath);
  } catch (error) {
    logger.warn('Video thumbnail generation failed.', { assetId: asset.id, error });
    throw error;
  }
  return { thumbnailPath, previewPath };
}

export async function generateThumbnail(asset: Asset): Promise<{ thumbnailPath: string; previewPath: string }> {
  if (asset.kind === 'video') return generateVideoThumbnail(asset);
  if (asset.kind === 'gif') return generateGifThumbnail(asset);
  return generateImageThumbnail(asset);
}
