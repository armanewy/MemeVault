import { beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, setDatabaseForTests } from '../src/main/db/db';
import { createAsset, markDuplicate, updateAsset } from '../src/main/db/repositories/assetRepo';
import { addTagToAsset } from '../src/main/db/repositories/tagRepo';
import { rankAssetForQuery, searchAssets } from '../src/main/services/searchService';

beforeEach(() => {
  const db = createDatabase(':memory:');
  setDatabaseForTests(db);
});

describe('searchService', () => {
  function asset(filename: string, kind: 'image' | 'gif' | 'video' = 'image') {
    const ext = kind === 'video' ? '.mp4' : kind === 'gif' ? '.gif' : '.png';
    return createAsset({
      originalPath: `/tmp/${filename}`,
      normalizedPath: `/tmp/${filename}`,
      filename,
      ext,
      mime: kind === 'video' ? 'video/mp4' : kind === 'gif' ? 'image/gif' : 'image/png',
      kind,
      fileSize: 10,
      sourceType: 'manual_import'
    });
  }

  it('filename match ranks above OCR match', () => {
    const filenameAsset = asset('cat-reaction.png');
    const ocrAsset = asset('other.png');
    const ocrUpdated = updateAsset(ocrAsset.id, { ocrText: 'cat' });
    expect(rankAssetForQuery(filenameAsset, 'cat').score).toBeGreaterThan(rankAssetForQuery(ocrUpdated, 'cat').score);
  });

  it('tag:<name> syntax filters by tag', () => {
    const tagged = asset('face.png');
    asset('plain.png');
    addTagToAsset(tagged.id, 'reaction');
    expect(searchAssets({ q: 'tag:reaction' }).map((result) => result.asset.id)).toEqual([tagged.id]);
  });

  it('kind:image/gif/video syntax filters by kind', () => {
    const image = asset('a.png', 'image');
    const gif = asset('a.gif', 'gif');
    const video = asset('a.mp4', 'video');
    expect(searchAssets({ q: 'kind:image' }).map((result) => result.asset.id)).toEqual([image.id]);
    expect(searchAssets({ q: 'kind:gif' }).map((result) => result.asset.id)).toEqual([gif.id]);
    expect(searchAssets({ q: 'kind:video' }).map((result) => result.asset.id)).toEqual([video.id]);
  });

  it('fav:true syntax filters favorites', () => {
    const favorite = asset('fav.png');
    asset('not-fav.png');
    updateAsset(favorite.id, { favorite: true });
    expect(searchAssets({ q: '', favoritesOnly: true })).toHaveLength(1);
    expect(searchAssets({ q: 'fav:true' }).map((result) => result.asset.id)).toEqual([favorite.id]);
  });

  it('searches OCR text through FTS', () => {
    const ocr = asset('receipt.png');
    updateAsset(ocr.id, { ocrText: 'MEMEVAULT QA OCRTEST ALPHA' });
    expect(searchAssets({ q: 'OCRTEST ALPHA' })[0].asset.id).toBe(ocr.id);
  });

  it('falls back to raw substring matching for emoji and punctuation queries', () => {
    const emoji = asset('reaction-🔥.png');
    const punctuation = asset('what?!-receipt.png');
    asset('plain.png');
    expect(searchAssets({ q: '🔥' }).map((result) => result.asset.id)).toEqual([emoji.id]);
    expect(searchAssets({ q: '?!' }).map((result) => result.asset.id)).toEqual([punctuation.id]);
    expect(searchAssets({ q: '🧪' })).toEqual([]);
  });

  it('hides duplicates by default and includes them with duplicates:true', () => {
    const original = asset('original.png');
    const duplicate = asset('copy.png');
    markDuplicate(duplicate.id, original.id);
    expect(searchAssets({ q: '' }).map((result) => result.asset.id)).toEqual([original.id]);
    expect(new Set(searchAssets({ q: 'duplicates:true' }).map((result) => result.asset.id))).toEqual(
      new Set([original.id, duplicate.id])
    );
  });
});
