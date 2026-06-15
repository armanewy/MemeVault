import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import type { Asset, AssetDetail, AssetKind, Collection, DuplicateStatus, OcrBlock, Tag } from '../../types/domain';
import { getDb } from '../db';
import { hammingDistance } from '../../services/perceptualHash';

type AssetRow = Record<string, unknown>;

function iso(): string {
  return new Date().toISOString();
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function toFileUrl(value?: string): string | undefined {
  return value ? pathToFileURL(value).toString() : undefined;
}

export function rowToAsset(row: AssetRow, tags: Tag[] = [], collections: Collection[] = []): Asset {
  return {
    id: String(row.id),
    originalPath: String(row.original_path),
    normalizedPath: String(row.normalized_path),
    filename: String(row.filename),
    ext: String(row.ext),
    mime: String(row.mime),
    kind: row.kind as AssetKind,
    fileSize: Number(row.file_size ?? 0),
    sha256: asOptionalString(row.sha256),
    phash: asOptionalString(row.phash),
    width: row.width == null ? undefined : Number(row.width),
    height: row.height == null ? undefined : Number(row.height),
    durationMs: row.duration_ms == null ? undefined : Number(row.duration_ms),
    thumbnailPath: asOptionalString(row.thumbnail_path),
    previewPath: asOptionalString(row.preview_path),
    thumbnailUrl: toFileUrl(asOptionalString(row.thumbnail_path)),
    previewUrl: toFileUrl(asOptionalString(row.preview_path) ?? asOptionalString(row.original_path)),
    originalUrl: toFileUrl(asOptionalString(row.original_path)),
    ocrText: String(row.ocr_text ?? ''),
    favorite: Number(row.favorite ?? 0) === 1,
    useCount: Number(row.use_count ?? 0),
    lastUsedAt: asOptionalString(row.last_used_at),
    importedAt: String(row.imported_at),
    updatedAt: String(row.updated_at),
    fileCreatedAt: asOptionalString(row.file_created_at),
    fileModifiedAt: asOptionalString(row.file_modified_at),
    missing: Number(row.missing ?? 0) === 1,
    duplicateOfAssetId: asOptionalString(row.duplicate_of_asset_id),
    duplicateStatus: (asOptionalString(row.duplicate_status) ?? 'unique') as DuplicateStatus,
    tags,
    collections
  };
}

export interface CreateAssetInput {
  originalPath: string;
  normalizedPath: string;
  filename: string;
  ext: string;
  mime: string;
  kind: AssetKind;
  fileSize: number;
  fileCreatedAt?: string;
  fileModifiedAt?: string;
  sourceType: 'manual_import' | 'watched_folder' | 'clipboard' | 'export';
  sourceDetail?: string;
  sha256?: string;
}

export function createAsset(input: CreateAssetInput): Asset {
  const db = getDb();
  const id = randomUUID();
  const now = iso();
  const asset = db.transaction(() => {
    db.prepare(
      `INSERT INTO assets (
        id, original_path, normalized_path, filename, ext, mime, kind, file_size, sha256,
        imported_at, updated_at, file_created_at, file_modified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      input.originalPath,
      input.normalizedPath,
      input.filename,
      input.ext,
      input.mime,
      input.kind,
      input.fileSize,
      input.sha256 ?? null,
      now,
      now,
      input.fileCreatedAt ?? null,
      input.fileModifiedAt ?? null
    );
    db.prepare(
      `INSERT INTO asset_sources (id, asset_id, source_type, source_detail, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(randomUUID(), id, input.sourceType, input.sourceDetail ?? null, now);
    updateFtsForAsset(id);
    return getAsset(id);
  })();
  if (!asset) {
    throw new Error('Asset insert failed.');
  }
  return asset;
}

export function getAsset(id: string): Asset | undefined {
  const row = getDb().prepare('SELECT * FROM assets WHERE id = ? AND deleted_at IS NULL').get(id) as AssetRow | undefined;
  if (!row) return undefined;
  return rowToAsset(row, listTagsForAsset(id), listCollectionsForAsset(id));
}

export function getAssetOrThrow(id: string): Asset {
  const asset = getAsset(id);
  if (!asset) {
    throw new Error('Asset not found.');
  }
  return asset;
}

export function getAssetDetail(id: string): AssetDetail {
  const asset = getAssetOrThrow(id);
  return {
    ...asset,
    ocrBlocks: getOcrBlocks(id),
    similar: getSimilarAssets(id, 8)
  };
}

export function findByNormalizedPath(normalizedPath: string): Asset | undefined {
  const row = getDb()
    .prepare('SELECT * FROM assets WHERE normalized_path = ? AND deleted_at IS NULL')
    .get(normalizedPath) as AssetRow | undefined;
  return row ? rowToAsset(row, listTagsForAsset(String(row.id)), listCollectionsForAsset(String(row.id))) : undefined;
}

export function findBySha256(sha256: string): Asset | undefined {
  const row = getDb()
    .prepare(
      `SELECT * FROM assets
       WHERE sha256 = ? AND deleted_at IS NULL AND duplicate_status != 'duplicate'
       ORDER BY imported_at ASC
       LIMIT 1`
    )
    .get(sha256) as AssetRow | undefined;
  return row ? rowToAsset(row, listTagsForAsset(String(row.id)), listCollectionsForAsset(String(row.id))) : undefined;
}

export function listAssets(limit = 200, offset = 0): Asset[] {
  const rows = getDb()
    .prepare('SELECT * FROM assets WHERE deleted_at IS NULL ORDER BY imported_at DESC LIMIT ? OFFSET ?')
    .all(limit, offset) as AssetRow[];
  return rows.map((row) => rowToAsset(row, listTagsForAsset(String(row.id)), listCollectionsForAsset(String(row.id))));
}

export function updateAsset(id: string, patch: Partial<{
  sha256: string;
  phash: string;
  width: number;
  height: number;
  durationMs: number;
  thumbnailPath: string;
  previewPath: string;
  ocrText: string;
  favorite: boolean;
  missing: boolean;
  duplicateOfAssetId: string | null;
  duplicateStatus: DuplicateStatus;
}>): Asset {
  const fields: string[] = [];
  const values: unknown[] = [];
  const mapping: Record<string, string> = {
    sha256: 'sha256',
    phash: 'phash',
    width: 'width',
    height: 'height',
    durationMs: 'duration_ms',
    thumbnailPath: 'thumbnail_path',
    previewPath: 'preview_path',
    ocrText: 'ocr_text',
    favorite: 'favorite',
    missing: 'missing',
    duplicateOfAssetId: 'duplicate_of_asset_id',
    duplicateStatus: 'duplicate_status'
  };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    fields.push(`${mapping[key]} = ?`);
    values.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
  }
  if (fields.length) {
    fields.push('updated_at = ?');
    values.push(iso(), id);
    getDb().prepare(`UPDATE assets SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    updateFtsForAsset(id);
  }
  return getAssetOrThrow(id);
}

export function markDuplicate(assetId: string, duplicateOfAssetId: string): Asset {
  return updateAsset(assetId, {
    duplicateStatus: 'duplicate',
    duplicateOfAssetId
  });
}

export function reconcileDuplicatesForSha(sha256: string): { canonicalId: string; duplicateIds: string[] } | undefined {
  const rows = getDb()
    .prepare(
      `SELECT id FROM assets
       WHERE sha256 = ? AND deleted_at IS NULL
       ORDER BY imported_at ASC, rowid ASC`
    )
    .all(sha256) as Array<{ id: string }>;
  if (!rows.length) return undefined;
  const [canonical, ...duplicates] = rows;
  const now = iso();
  getDb().transaction(() => {
    getDb()
      .prepare("UPDATE assets SET duplicate_status = 'unique', duplicate_of_asset_id = NULL, updated_at = ? WHERE id = ?")
      .run(now, canonical.id);
    const stmt = getDb().prepare(
      "UPDATE assets SET duplicate_status = 'duplicate', duplicate_of_asset_id = ?, updated_at = ? WHERE id = ?"
    );
    for (const duplicate of duplicates) {
      stmt.run(canonical.id, now, duplicate.id);
    }
  })();
  return { canonicalId: canonical.id, duplicateIds: duplicates.map((row) => row.id) };
}

export function toggleFavorite(id: string): Asset {
  const asset = getAssetOrThrow(id);
  return updateAsset(id, { favorite: !asset.favorite });
}

export function incrementUse(id: string): Asset {
  const now = iso();
  getDb()
    .prepare('UPDATE assets SET use_count = use_count + 1, last_used_at = ?, updated_at = ? WHERE id = ?')
    .run(now, now, id);
  return getAssetOrThrow(id);
}

export function markMissingByPath(normalizedPath: string): void {
  const now = iso();
  getDb().prepare('UPDATE assets SET missing = 1, updated_at = ? WHERE normalized_path = ?').run(now, normalizedPath);
}

export function removeFromVault(id: string): void {
  const now = iso();
  getDb().prepare('UPDATE assets SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, id);
  getDb().prepare('DELETE FROM asset_fts WHERE asset_id = ?').run(id);
}

export function listTagsForAsset(assetId: string): Tag[] {
  const rows = getDb()
    .prepare(
      `SELECT t.* FROM tags t
       INNER JOIN asset_tags at ON at.tag_id = t.id
       WHERE at.asset_id = ?
       ORDER BY lower(t.name)`
    )
    .all(assetId) as AssetRow[];
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    color: asOptionalString(row.color),
    createdAt: String(row.created_at)
  }));
}

export function listCollectionsForAsset(assetId: string): Collection[] {
  const rows = getDb()
    .prepare(
      `SELECT c.* FROM collections c
       INNER JOIN collection_assets ca ON ca.collection_id = c.id
       WHERE ca.asset_id = ?
       ORDER BY lower(c.name)`
    )
    .all(assetId) as AssetRow[];
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    description: asOptionalString(row.description),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  }));
}

export function getOcrBlocks(assetId: string): OcrBlock[] {
  const rows = getDb()
    .prepare('SELECT * FROM ocr_blocks WHERE asset_id = ? ORDER BY y, x')
    .all(assetId) as AssetRow[];
  return rows.map((row) => ({
    id: String(row.id),
    assetId: String(row.asset_id),
    text: String(row.text),
    confidence: row.confidence == null ? undefined : Number(row.confidence),
    x: Number(row.x),
    y: Number(row.y),
    width: Number(row.width),
    height: Number(row.height),
    blockType: String(row.block_type) === 'line' ? 'line' : 'word'
  }));
}

export function replaceOcrBlocks(assetId: string, blocks: Omit<OcrBlock, 'id' | 'assetId'>[]): void {
  const now = iso();
  getDb().transaction(() => {
    getDb().prepare('DELETE FROM ocr_blocks WHERE asset_id = ?').run(assetId);
    const stmt = getDb().prepare(
      `INSERT INTO ocr_blocks (id, asset_id, text, confidence, x, y, width, height, block_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const block of blocks) {
      stmt.run(
        randomUUID(),
        assetId,
        block.text,
        block.confidence ?? null,
        block.x,
        block.y,
        block.width,
        block.height,
        block.blockType,
        now
      );
    }
  })();
}

export function updateFtsForAsset(assetId: string): void {
  const db = getDb();
  const row = db.prepare('SELECT id, filename, ocr_text FROM assets WHERE id = ? AND deleted_at IS NULL').get(assetId) as
    | AssetRow
    | undefined;
  db.prepare('DELETE FROM asset_fts WHERE asset_id = ?').run(assetId);
  if (!row) return;
  const tags = listTagsForAsset(assetId)
    .map((tag) => tag.name)
    .join(' ');
  const collections = listCollectionsForAsset(assetId)
    .map((collection) => collection.name)
    .join(' ');
  db.prepare('INSERT INTO asset_fts(asset_id, filename, ocr_text, tags, collections) VALUES (?, ?, ?, ?, ?)').run(
    assetId,
    row.filename,
    row.ocr_text ?? '',
    tags,
    collections
  );
}

export function getSimilarAssets(assetId: string, limit = 8): Asset[] {
  const asset = getAsset(assetId);
  if (!asset?.phash) return [];
  const rows = getDb()
    .prepare('SELECT * FROM assets WHERE deleted_at IS NULL AND id != ? AND phash IS NOT NULL')
    .all(assetId) as AssetRow[];
  return rows
    .map((row) => ({
      distance: hammingDistance(asset.phash ?? '', String(row.phash ?? '')),
      asset: rowToAsset(row, listTagsForAsset(String(row.id)), listCollectionsForAsset(String(row.id)))
    }))
    .filter((item) => item.distance <= 12)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((item) => item.asset);
}
