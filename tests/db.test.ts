import { beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { createDatabase, setDatabaseForTests } from '../src/main/db/db';
import { runMigrations } from '../src/main/db/migrations';
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

  it('upgrades old asset tables before creating duplicate indexes', () => {
    const oldDb = new Database(':memory:');
    try {
      oldDb.exec(`
        CREATE TABLE assets (
          id TEXT PRIMARY KEY,
          original_path TEXT NOT NULL,
          normalized_path TEXT NOT NULL UNIQUE,
          filename TEXT NOT NULL,
          ext TEXT NOT NULL,
          mime TEXT NOT NULL,
          kind TEXT NOT NULL CHECK(kind IN ('image', 'gif', 'video')),
          file_size INTEGER NOT NULL DEFAULT 0,
          sha256 TEXT,
          phash TEXT,
          width INTEGER,
          height INTEGER,
          duration_ms INTEGER,
          thumbnail_path TEXT,
          preview_path TEXT,
          ocr_text TEXT DEFAULT '',
          favorite INTEGER NOT NULL DEFAULT 0,
          use_count INTEGER NOT NULL DEFAULT 0,
          last_used_at TEXT,
          imported_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          file_created_at TEXT,
          file_modified_at TEXT,
          missing INTEGER NOT NULL DEFAULT 0,
          deleted_at TEXT
        );
      `);

      expect(() => runMigrations(oldDb)).not.toThrow();

      const columns = oldDb
        .prepare('PRAGMA table_info(assets)')
        .all()
        .map((row) => (row as { name: string }).name);
      const indexes = oldDb
        .prepare('PRAGMA index_list(assets)')
        .all()
        .map((row) => (row as { name: string }).name);

      expect(columns).toContain('duplicate_of_asset_id');
      expect(columns).toContain('duplicate_status');
      expect(indexes).toContain('idx_assets_duplicate_status');
    } finally {
      oldDb.close();
    }
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
