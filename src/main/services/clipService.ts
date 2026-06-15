import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import type { Asset, ExportPreset } from '../types/domain';
import { getExportDir, getTempDir } from './appPaths';
import { getAssetOrThrow } from '../db/repositories/assetRepo';
import { importExportedFile } from './assetImporter';
import { makeCaptionSvg } from './receiptService';
import { probeVideo } from './mediaProbeService';
import { logger } from './logger';

interface ImageMemeOptions {
  assetId: string;
  topText?: string;
  bottomText?: string;
  preset: ExportPreset;
  textColor: 'white' | 'black';
  stroke: boolean;
  uppercase: boolean;
}

export interface VideoClipOptions {
  assetId: string;
  startMs: number;
  endMs: number;
  format: 'mp4' | 'gif';
  preset: ExportPreset;
  topText?: string;
  bottomText?: string;
}

function slug(value: string): string {
  return value.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'asset';
}

function outputPath(asset: Asset, operation: string, ext: string): string {
  const dir = getExportDir(operation);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13);
  return join(dir, `${slug(asset.filename)}-${operation}-${stamp}-${crypto.randomUUID().slice(0, 8)}.${ext}`);
}

function presetDimensions(preset: ExportPreset, originalWidth: number, originalHeight: number): { width: number; height?: number; fit: keyof sharp.FitEnum } {
  switch (preset) {
    case 'square':
      return { width: 1080, height: 1080, fit: 'cover' };
    case 'vertical':
      return { width: 1080, height: 1920, fit: 'cover' };
    case 'horizontal':
      return { width: 1920, height: 1080, fit: 'cover' };
    case 'discord':
      return { width: Math.min(1280, originalWidth), fit: 'inside' };
    default:
      return { width: originalWidth, height: originalHeight, fit: 'inside' };
  }
}

export async function exportImageMeme(options: ImageMemeOptions): Promise<{ asset: Asset }> {
  const asset = getAssetOrThrow(options.assetId);
  if (asset.kind === 'video') throw new Error('Use video export for video assets.');
  const metadata = await sharp(asset.originalPath, { animated: false, limitInputPixels: false }).metadata();
  const originalWidth = metadata.width ?? asset.width ?? 1080;
  const originalHeight = metadata.height ?? asset.height ?? 1080;
  const preset = presetDimensions(options.preset, originalWidth, originalHeight);
  const resized = await sharp(asset.originalPath, { animated: false, limitInputPixels: false })
    .rotate()
    .resize(preset.width, preset.height, { fit: preset.fit, withoutEnlargement: options.preset === 'original' })
    .png()
    .toBuffer();
  const finalMeta = await sharp(resized).metadata();
  const width = finalMeta.width ?? preset.width;
  const height = finalMeta.height ?? preset.height ?? originalHeight;
  const topText = options.uppercase === false ? (options.topText ?? '') : (options.topText ?? '').toUpperCase();
  const bottomText = options.uppercase === false ? (options.bottomText ?? '') : (options.bottomText ?? '').toUpperCase();
  await mkdir(getExportDir('captioned'), { recursive: true });
  const out = outputPath(asset, 'captioned', 'png');
  await sharp(resized)
    .composite([{ input: makeCaptionSvg(width, height, topText, bottomText, options.textColor, options.stroke), left: 0, top: 0 }])
    .png()
    .toFile(out);
  return { asset: await importExportedFile(out, `Captioned from ${asset.filename}`, ['meme', 'edited']) };
}

function seconds(ms: number): string {
  return (Math.max(0, ms) / 1000).toFixed(3);
}

function videoScaleFilter(preset: ExportPreset): string {
  switch (preset) {
    case 'square':
      return 'scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080';
    case 'vertical':
      return 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920';
    case 'horizontal':
      return 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080';
    case 'discord':
      return 'scale=min(1280\\,iw):-2';
    default:
      return 'scale=trunc(iw/2)*2:trunc(ih/2)*2';
  }
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

export async function exportVideoClip(options: VideoClipOptions): Promise<{ asset: Asset; warning?: string }> {
  const asset = getAssetOrThrow(options.assetId);
  if (asset.kind !== 'video' && asset.kind !== 'gif') throw new Error('ClipMeme Studio supports GIF and video assets.');
  if (options.endMs <= options.startMs) throw new Error('End time must be after start time.');
  await mkdir(getExportDir('clip'), { recursive: true });
  await mkdir(getTempDir(), { recursive: true });
  const ext = options.format === 'gif' ? 'gif' : 'mp4';
  const out = outputPath(asset, 'clip', ext);
  const hasCaption = Boolean(options.topText || options.bottomText);
  let warning: string | undefined;
  const baseFilter = videoScaleFilter(options.preset);
  const durationMs = options.endMs - options.startMs;
  const args = ['-y', '-ss', seconds(options.startMs), '-i', asset.originalPath, '-t', seconds(durationMs)];
  if (options.format === 'gif') {
    args.push('-vf', `${baseFilter},fps=12`, '-loop', '0', out);
  } else {
    args.push('-vf', baseFilter, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', out);
  }
  if (hasCaption) {
    try {
      const info = await probeVideo(asset.originalPath);
      const width = options.preset === 'square' ? 1080 : options.preset === 'vertical' ? 1080 : options.preset === 'horizontal' ? 1920 : Math.min(info.width ?? 1280, 1280);
      const height = options.preset === 'square' ? 1080 : options.preset === 'vertical' ? 1920 : options.preset === 'horizontal' ? 1080 : Math.round(width * ((info.height ?? 720) / (info.width ?? 1280)));
      const overlay = join(getTempDir(), `caption-${crypto.randomUUID()}.png`);
      await sharp(makeCaptionSvg(width, height, options.topText, options.bottomText, 'white', true)).png().toFile(overlay);
      const captionFilter = `${baseFilter}[v];[v][1:v]overlay=0:0`;
      const captionArgs = ['-y', '-ss', seconds(options.startMs), '-i', asset.originalPath, '-i', overlay, '-t', seconds(durationMs)];
      if (options.format === 'gif') {
        captionArgs.push('-filter_complex', `${captionFilter},fps=12`, '-loop', '0', out);
      } else {
        captionArgs.push('-filter_complex', captionFilter, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', out);
      }
      await runFfmpeg(captionArgs);
    } catch (error) {
      warning = 'Caption overlay failed, exported without captions.';
      logger.warn(warning, error);
      await runFfmpeg(args);
    }
  } else {
    await runFfmpeg(args);
  }
  return { asset: await importExportedFile(out, `Clip export from ${asset.filename}`, ['clip', 'edited']), warning };
}

export async function getVideoInfo(assetId: string): Promise<{ durationMs?: number; width?: number; height?: number }> {
  const asset = getAssetOrThrow(assetId);
  if (asset.kind !== 'video' && asset.kind !== 'gif') return {};
  return {
    durationMs: asset.durationMs,
    width: asset.width,
    height: asset.height
  };
}
