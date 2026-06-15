import sharp from 'sharp';

export async function computeImageAHash(pathOrBuffer: string | Buffer): Promise<string> {
  const { data } = await sharp(pathOrBuffer, { animated: false, limitInputPixels: false })
    .resize(8, 8, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const values = [...data];
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.map((value) => (value > average ? '1' : '0')).join('');
}

export function hammingDistance(hashA: string, hashB: string): number {
  const length = Math.min(hashA.length, hashB.length);
  let distance = Math.abs(hashA.length - hashB.length);
  for (let i = 0; i < length; i += 1) {
    if (hashA[i] !== hashB[i]) distance += 1;
  }
  return distance;
}

