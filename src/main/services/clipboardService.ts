import { clipboard, nativeImage } from 'electron';
import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import type { ClipboardResult } from '../types/domain';
import { getAssetOrThrow, incrementUse } from '../db/repositories/assetRepo';
import { getSettings } from '../db/repositories/settingsRepo';
import { getExportDir } from './appPaths';
import { sha256Buffer } from './hashService';
import { importFile } from './assetImporter';
import { attemptPaste } from './pasteService';
import { logger } from './logger';

let clipboardTimer: NodeJS.Timeout | undefined;
let lastClipboardHash = '';

export async function copyAssetToClipboard(assetId: string): Promise<ClipboardResult> {
  const asset = getAssetOrThrow(assetId);
  if (asset.kind === 'gif') {
    clipboard.writeText(asset.originalPath);
    incrementUse(asset.id);
    return { ok: true, message: 'Copied GIF file path. GIFs are not flattened to still images.' };
  }
  if (asset.kind === 'video') {
    clipboard.writeText(asset.originalPath);
    incrementUse(asset.id);
    return { ok: true, message: 'Copied video file path.' };
  }
  const image = nativeImage.createFromPath(asset.originalPath);
  if (image.isEmpty()) {
    clipboard.writeText(asset.originalPath);
    incrementUse(asset.id);
    return { ok: true, message: 'Copied image file path because the image could not be read.' };
  }
  clipboard.write({ image });
  incrementUse(asset.id);
  return { ok: true, message: 'Copied.' };
}

export async function attemptClipboardPaste(): Promise<ClipboardResult> {
  const paste = await attemptPaste();
  if (paste.ok) return { ok: true, message: 'Copied.' };
  return {
    ok: true,
    message: 'Copied — press Cmd/Ctrl+V',
    needsPermission: paste.needsPermission
  };
}

export async function autoPasteAsset(assetId: string): Promise<ClipboardResult> {
  const copy = await copyAssetToClipboard(assetId);
  const settings = getSettings();
  if (!settings.autoPasteEnabled) return copy;
  return attemptClipboardPaste();
}

export async function captureClipboardImageIfNew(): Promise<void> {
  const settings = getSettings();
  if (!settings.clipboardWatcherEnabled) return;
  const image = clipboard.readImage();
  if (image.isEmpty()) return;
  const size = image.getSize();
  if (size.width < settings.clipboardMinWidth || size.height < settings.clipboardMinHeight) return;
  const png = image.toPNG();
  const hash = sha256Buffer(png);
  if (hash === lastClipboardHash) return;
  lastClipboardHash = hash;
  const dir = getExportDir('clipboard');
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, `clipboard-${new Date().toISOString().replace(/[-:]/g, '').slice(0, 13)}-${crypto.randomUUID().slice(0, 8)}.png`);
  await writeFile(filePath, png);
  await importFile(filePath, 'clipboard', 'Clipboard watcher');
}

export function startClipboardWatcher(): void {
  stopClipboardWatcher();
  clipboardTimer = setInterval(() => {
    captureClipboardImageIfNew().catch((error) => logger.warn('Clipboard capture failed.', error));
  }, 2000);
}

export function stopClipboardWatcher(): void {
  if (clipboardTimer) clearInterval(clipboardTimer);
  clipboardTimer = undefined;
}
