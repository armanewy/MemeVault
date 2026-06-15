import { readdir, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import type { AssetKind } from '../types/domain';

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const GIF_EXTS = new Set(['.gif']);
const VIDEO_EXTS = new Set(['.mp4', '.mov', '.webm']);
const IGNORED_DIRS = new Set(['node_modules', '.git', 'Library', 'System']);

export function normalizePath(filePath: string): string {
  return normalize(filePath);
}

export function isSupportedFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return IMAGE_EXTS.has(ext) || GIF_EXTS.has(ext) || VIDEO_EXTS.has(ext);
}

export function inferKind(filePath: string): AssetKind {
  const ext = extname(filePath).toLowerCase();
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (GIF_EXTS.has(ext)) return 'gif';
  if (VIDEO_EXTS.has(ext)) return 'video';
  throw new Error(`Unsupported file type: ${ext || filePath}`);
}

export function inferMime(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.mp4':
      return 'video/mp4';
    case '.mov':
      return 'video/quicktime';
    case '.webm':
      return 'video/webm';
    default:
      return 'application/octet-stream';
  }
}

function isHiddenOrIgnored(pathPart: string): boolean {
  return pathPart.startsWith('.') || IGNORED_DIRS.has(pathPart);
}

export async function scanFolder(folderPath: string, recursive = true): Promise<string[]> {
  const found: string[] = [];
  async function walk(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (isHiddenOrIgnored(entry.name)) continue;
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        if (recursive) await walk(fullPath);
        continue;
      }
      if (entry.isFile() && isSupportedFile(fullPath)) {
        found.push(fullPath);
      }
    }
  }
  await walk(folderPath);
  return found;
}

export async function scanPath(inputPath: string, recursive = true): Promise<string[]> {
  const normalized = normalizePath(inputPath);
  const info = await stat(normalized);
  if (info.isDirectory()) return scanFolder(normalized, recursive);
  return isSupportedFile(normalized) ? [normalized] : [];
}

export function shouldIgnoreWatchPath(filePath: string): boolean {
  return normalizePath(filePath)
    .split(sep)
    .some(isHiddenOrIgnored);
}

