import { beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, setDatabaseForTests } from '../src/main/db/db';
import { createAsset, updateAsset } from '../src/main/db/repositories/assetRepo';
import { addTagToAsset } from '../src/main/db/repositories/tagRepo';
import { rankAssetForQuery, searchAssets } from '../src/main/services/searchService';

beforeEach(() => {
  const db = createDatabase(':memory:');
  setDatabaseForTests(db);
});

describe('searchService', () => {
  it('filename match ranks above OCR match', () => {
    const filenameAsset = createAsset({
      originalPath: '/tmp/cat.png',
      normalizedPath: '/tmp/cat.png',
      filename: 'cat-reaction.png',
      ext: '.png',
      mime: 'image/png',
      kind: 'image',
      fileSize: 10,
      sourceType: 'manual_import'
    });
    const ocrAsset = createAsset({
      originalPath: '/tmp/other.png',
      normalizedPath: '/tmp/other.png',
      filename: 'other.png',
      ext: '.png',
      mime: 'image/png',
      kind: 'image',
      fileSize: 10,
      sourceType: 'manual_import'
    });
    const ocrUpdated = updateAsset(ocrAsset.id, { ocrText: 'cat' });
    expect(rankAssetForQuery(filenameAsset, 'cat').score).toBeGreaterThan(rankAssetForQuery(ocrUpdated, 'cat').score);
  });

  it('tag match works', () => {
    const asset = createAsset({
      originalPath: '/tmp/angry.png',
      normalizedPath: '/tmp/angry.png',
      filename: 'face.png',
      ext: '.png',
      mime: 'image/png',
      kind: 'image',
      fileSize: 10,
      sourceType: 'manual_import'
    });
    addTagToAsset(asset.id, 'reaction');
    expect(searchAssets({ q: 'reaction' })[0].asset.id).toBe(asset.id);
  });

  it('kind filter works', () => {
    createAsset({
      originalPath: '/tmp/a.png',
      normalizedPath: '/tmp/a.png',
      filename: 'a.png',
      ext: '.png',
      mime: 'image/png',
      kind: 'image',
      fileSize: 10,
      sourceType: 'manual_import'
    });
    const video = createAsset({
      originalPath: '/tmp/a.mp4',
      normalizedPath: '/tmp/a.mp4',
      filename: 'a.mp4',
      ext: '.mp4',
      mime: 'video/mp4',
      kind: 'video',
      fileSize: 10,
      sourceType: 'manual_import'
    });
    expect(searchAssets({ q: '', kind: 'video' })[0].asset.id).toBe(video.id);
  });

  it('favorites filter works', () => {
    const asset = createAsset({
      originalPath: '/tmp/fav.png',
      normalizedPath: '/tmp/fav.png',
      filename: 'fav.png',
      ext: '.png',
      mime: 'image/png',
      kind: 'image',
      fileSize: 10,
      sourceType: 'manual_import'
    });
    updateAsset(asset.id, { favorite: true });
    expect(searchAssets({ q: '', favoritesOnly: true })).toHaveLength(1);
  });
});

