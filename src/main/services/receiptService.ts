import sharp from 'sharp';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import type { Asset, RedactionBox, RedactionStyle } from '../types/domain';
import { getExportDir } from './appPaths';
import { getAssetOrThrow, getOcrBlocks } from '../db/repositories/assetRepo';
import { importExportedFile } from './assetImporter';
import { suggestRedactionBoxesFromBlocks } from './redactionPatterns';

function slug(value: string): string {
  return value.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'asset';
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]!);
}

function outputPath(asset: Asset, operation: string, ext: string): string {
  const dir = getExportDir(operation);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13);
  return join(dir, `${slug(asset.filename)}-${operation}-${stamp}-${crypto.randomUUID().slice(0, 8)}.${ext}`);
}

function normalizeBox(box: RedactionBox, width: number, height: number): RedactionBox {
  const x = Math.max(0, Math.min(width, Math.round(box.x)));
  const y = Math.max(0, Math.min(height, Math.round(box.y)));
  return {
    ...box,
    x,
    y,
    width: Math.max(1, Math.min(width - x, Math.round(box.width))),
    height: Math.max(1, Math.min(height - y, Math.round(box.height)))
  };
}

export function suggestRedactions(assetId: string): RedactionBox[] {
  return suggestRedactionBoxesFromBlocks(getOcrBlocks(assetId));
}

async function blackOverlay(width: number, height: number, boxes: RedactionBox[]): Promise<Buffer> {
  const rects = boxes
    .map((box) => `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="#000"/>`)
    .join('');
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`);
}

async function regionComposite(assetPath: string, boxes: RedactionBox[], style: RedactionStyle): Promise<sharp.OverlayOptions[]> {
  const overlays: sharp.OverlayOptions[] = [];
  for (const box of boxes) {
    let input = await sharp(assetPath)
      .extract({ left: box.x, top: box.y, width: box.width, height: box.height })
      .toBuffer();
    if (style === 'blur') {
      input = await sharp(input).blur(16).png().toBuffer();
    } else if (style === 'pixelate') {
      const smallWidth = Math.max(1, Math.round(box.width / 12));
      const smallHeight = Math.max(1, Math.round(box.height / 12));
      input = await sharp(input)
        .resize(smallWidth, smallHeight, { fit: 'fill' })
        .resize(box.width, box.height, { fit: 'fill', kernel: 'nearest' })
        .png()
        .toBuffer();
    }
    overlays.push({ input, left: box.x, top: box.y });
  }
  return overlays;
}

export async function exportRedacted(
  assetId: string,
  boxes: RedactionBox[],
  style: RedactionStyle
): Promise<{ asset: Asset }> {
  const asset = getAssetOrThrow(assetId);
  if (asset.kind !== 'image') throw new Error('Receipt Studio supports still images.');
  const metadata = await sharp(asset.originalPath, { limitInputPixels: false }).metadata();
  const width = metadata.width ?? asset.width ?? 1;
  const height = metadata.height ?? asset.height ?? 1;
  const normalized = boxes.map((box) => normalizeBox(box, width, height));
  await mkdir(getExportDir('redacted'), { recursive: true });
  const out = outputPath(asset, 'redacted', 'png');
  const base = sharp(asset.originalPath, { limitInputPixels: false }).rotate().png();
  const overlays =
    style === 'black'
      ? [{ input: await blackOverlay(width, height, normalized), left: 0, top: 0 }]
      : await regionComposite(asset.originalPath, normalized, style);
  await base.composite(overlays).toFile(out);
  return { asset: await importExportedFile(out, `Redacted from ${asset.filename}`, ['redacted']) };
}

export async function exportStitch(
  assetIds: string[],
  spacing: number,
  background: string,
  maxWidth?: number
): Promise<{ asset: Asset }> {
  if (assetIds.length < 2) throw new Error('Select at least two images to stitch.');
  const assets = assetIds.map(getAssetOrThrow);
  if (assets.some((asset) => asset.kind !== 'image')) throw new Error('Stitch mode supports still images.');
  const prepared: { input: Buffer; width: number; height: number; top: number }[] = [];
  let width = 0;
  let y = 0;
  for (const asset of assets) {
    const image = sharp(asset.originalPath, { limitInputPixels: false }).rotate();
    const metadata = await image.metadata();
    const sourceWidth = metadata.width ?? 1;
    const targetWidth = maxWidth ? Math.min(maxWidth, sourceWidth) : sourceWidth;
    const buffer = await sharp(asset.originalPath, { limitInputPixels: false })
      .rotate()
      .resize(targetWidth, undefined, { withoutEnlargement: true })
      .png()
      .toBuffer();
    const resizedMeta = await sharp(buffer).metadata();
    const item = { input: buffer, width: resizedMeta.width ?? targetWidth, height: resizedMeta.height ?? 1, top: y };
    prepared.push(item);
    width = Math.max(width, item.width);
    y += item.height + spacing;
  }
  const height = Math.max(1, y - spacing);
  await mkdir(getExportDir('stitch'), { recursive: true });
  const out = join(getExportDir('stitch'), `stitched-${new Date().toISOString().replace(/[-:]/g, '').slice(0, 13)}-${crypto.randomUUID().slice(0, 8)}.png`);
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: background || '#ffffff'
    }
  })
    .composite(prepared.map((item) => ({ input: item.input, left: Math.round((width - item.width) / 2), top: item.top })))
    .png()
    .toFile(out);
  return { asset: await importExportedFile(out, 'Vertical stitch export', ['stitch']) };
}

export function makeCaptionSvg(width: number, height: number, topText = '', bottomText = '', textColor = 'white', stroke = true): Buffer {
  const escapedTop = escapeXml(topText.toUpperCase());
  const escapedBottom = escapeXml(bottomText.toUpperCase());
  const fontSize = Math.max(36, Math.round(width / 13));
  const strokeAttrs = stroke ? `stroke="${textColor === 'white' ? '#000' : '#fff'}" stroke-width="${Math.max(3, Math.round(fontSize / 12))}" paint-order="stroke"` : '';
  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        text { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-weight: 900; letter-spacing: 0; }
      </style>
      <text x="50%" y="${fontSize + 28}" text-anchor="middle" font-size="${fontSize}" fill="${textColor}" ${strokeAttrs}>${escapedTop}</text>
      <text x="50%" y="${height - 28}" text-anchor="middle" font-size="${fontSize}" fill="${textColor}" ${strokeAttrs}>${escapedBottom}</text>
    </svg>
  `);
}

