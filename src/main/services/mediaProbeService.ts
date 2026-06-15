import sharp from 'sharp';
import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import type { Asset } from '../types/domain';

export interface MediaInfo {
  width?: number;
  height?: number;
  durationMs?: number;
}

export async function probeImage(filePath: string): Promise<MediaInfo> {
  const metadata = await sharp(filePath, { animated: false, limitInputPixels: false }).metadata();
  return {
    width: metadata.width,
    height: metadata.height
  };
}

function parseFfmpegInfo(stderr: string): MediaInfo {
  const durationMatch = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr);
  const streamMatch = /Video:.*?(\d{2,5})x(\d{2,5})/.exec(stderr);
  const info: MediaInfo = {};
  if (durationMatch) {
    const [, hours, minutes, seconds] = durationMatch;
    info.durationMs =
      (Number(hours) * 60 * 60 + Number(minutes) * 60 + Number.parseFloat(seconds)) * 1000;
  }
  if (streamMatch) {
    info.width = Number(streamMatch[1]);
    info.height = Number(streamMatch[2]);
  }
  return info;
}

export function probeVideo(filePath: string): Promise<MediaInfo> {
  const binary = ffmpegPath;
  if (!binary) return Promise.resolve({});
  return new Promise((resolve) => {
    const child = spawn(binary, ['-hide_banner', '-i', filePath]);
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += String(chunk);
    });
    child.on('close', () => resolve(parseFfmpegInfo(stderr)));
    child.on('error', () => resolve({}));
  });
}

export async function probeAsset(asset: Asset): Promise<MediaInfo> {
  if (asset.kind === 'video') return probeVideo(asset.originalPath);
  return probeImage(asset.originalPath);
}
