import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { computeImageAHash, hammingDistance } from '../src/main/services/perceptualHash';

async function imageWithRect(left: number, color = '#000000'): Promise<Buffer> {
  return sharp({
    create: {
      width: 128,
      height: 128,
      channels: 3,
      background: '#ffffff'
    }
  })
    .composite([{ input: Buffer.from(`<svg width="128" height="128"><rect x="${left}" y="24" width="48" height="80" fill="${color}"/></svg>`), left: 0, top: 0 }])
    .png()
    .toBuffer();
}

describe('perceptualHash', () => {
  it('identical images produce the same hash', async () => {
    const image = await imageWithRect(12);
    await expect(computeImageAHash(image)).resolves.toBe(await computeImageAHash(image));
  });

  it('small modified image produces a small hamming distance', async () => {
    const a = await computeImageAHash(await imageWithRect(12));
    const b = await computeImageAHash(await imageWithRect(16));
    expect(hammingDistance(a, b)).toBeLessThanOrEqual(8);
  });

  it('different image produces a larger hamming distance', async () => {
    const a = await computeImageAHash(await imageWithRect(8));
    const b = await computeImageAHash(await imageWithRect(76));
    expect(hammingDistance(a, b)).toBeGreaterThan(8);
  });
});

