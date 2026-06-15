import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import type { Asset } from '../src/main/types/domain';

let userDataDir = '';

vi.mock('electron', () => ({
  app: {
    getPath: () => userDataDir
  }
}));

vi.mock('ffmpeg-static', () => ({ default: null }));

describe('thumbnailService', () => {
  beforeEach(async () => {
    userDataDir = await mkdtemp(join(tmpdir(), 'memevault-thumb-test-'));
  });

  afterEach(async () => {
    sharp.cache(false);
    await rm(userDataDir, { recursive: true, force: true });
  });

  function baseAsset(path: string, kind: Asset['kind'] = 'image'): Asset {
    return {
      id: randomUUID(),
      originalPath: path,
      normalizedPath: path,
      filename: 'fixture.png',
      ext: kind === 'video' ? '.mp4' : '.png',
      mime: kind === 'video' ? 'video/mp4' : 'image/png',
      kind,
      fileSize: 1,
      ocrText: '',
      favorite: false,
      useCount: 0,
      importedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      missing: false,
      duplicateStatus: 'unique',
      tags: []
    };
  }

  it('rejects oversized still images before thumbnailing', async () => {
    const oversized = join(userDataDir, 'oversized.svg');
    await writeFile(oversized, '<svg xmlns="http://www.w3.org/2000/svg" width="9000" height="9000"><rect width="100%" height="100%" fill="#fff"/></svg>');
    const { generateImageThumbnail } = await import('../src/main/services/thumbnailService');
    await expect(generateImageThumbnail(baseAsset(oversized))).rejects.toThrow(/too large/i);
  });

  it('creates a placeholder when video frame extraction fails', async () => {
    const { generateVideoThumbnail } = await import('../src/main/services/thumbnailService');
    const result = await generateVideoThumbnail(baseAsset(join(userDataDir, 'missing.mp4'), 'video'));
    await expect(sharp(result.thumbnailPath).metadata()).resolves.toMatchObject({ width: 640, height: 360 });
  }, 20_000);
});
