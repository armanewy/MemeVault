import { beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, setDatabaseForTests } from '../src/main/db/db';
import { createAsset, getAsset, reconcileDuplicatesForSha, updateAsset } from '../src/main/db/repositories/assetRepo';
import { searchAssets } from '../src/main/services/searchService';

beforeEach(() => {
  const db = createDatabase(':memory:');
  setDatabaseForTests(db);
});

describe('database', () => {
  it('runs migrations and inserts assets', () => {
    const asset = createAsset({
      originalPath: '/tmp/funny.png',
      normalizedPath: '/tmp/funny.png',
      filename: 'funny.png',
      ext: '.png',
      mime: 'image/png',
      kind: 'image',
      fileSize: 100,
      sourceType: 'manual_import'
    });
    expect(getAsset(asset.id)?.filename).toBe('funny.png');
  });

  it('updates FTS fields when OCR changes', () => {
    const asset = createAsset({
      originalPath: '/tmp/receipt.png',
      normalizedPath: '/tmp/receipt.png',
      filename: 'receipt.png',
      ext: '.png',
      mime: 'image/png',
      kind: 'image',
      fileSize: 100,
      sourceType: 'manual_import'
    });
    updateAsset(asset.id, { ocrText: 'total paid burrito' });
    expect(searchAssets({ q: 'burrito' })[0].asset.id).toBe(asset.id);
  });

  it('reconciles exact hash duplicates to the earliest asset', () => {
    const original = createAsset({
      originalPath: '/tmp/original.png',
      normalizedPath: '/tmp/original.png',
      filename: 'original.png',
      ext: '.png',
      mime: 'image/png',
      kind: 'image',
      fileSize: 100,
      sourceType: 'manual_import'
    });
    const copy = createAsset({
      originalPath: '/tmp/copy.png',
      normalizedPath: '/tmp/copy.png',
      filename: 'copy.png',
      ext: '.png',
      mime: 'image/png',
      kind: 'image',
      fileSize: 100,
      sourceType: 'manual_import'
    });
    updateAsset(copy.id, { sha256: 'abc' });
    updateAsset(original.id, { sha256: 'abc' });
    expect(reconcileDuplicatesForSha('abc')).toEqual({ canonicalId: original.id, duplicateIds: [copy.id] });
    expect(getAsset(copy.id)?.duplicateStatus).toBe('duplicate');
    expect(getAsset(copy.id)?.duplicateOfAssetId).toBe(original.id);
  });
});
