import { randomUUID } from 'node:crypto';
import type { Collection } from '../../types/domain';
import { getDb } from '../db';
import { updateFtsForAsset } from './assetRepo';

function iso(): string {
  return new Date().toISOString();
}

function rowToCollection(row: Record<string, unknown>): Collection {
  return {
    id: String(row.id),
    name: String(row.name),
    description: typeof row.description === 'string' ? row.description : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export function listCollections(): Collection[] {
  return (getDb().prepare('SELECT * FROM collections ORDER BY lower(name)').all() as Record<string, unknown>[]).map(
    rowToCollection
  );
}

export function createCollection(name: string, description?: string): Collection {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Collection name is required.');
  const existing = getDb().prepare('SELECT * FROM collections WHERE lower(name) = lower(?)').get(trimmed) as
    | Record<string, unknown>
    | undefined;
  if (existing) return rowToCollection(existing);
  const id = randomUUID();
  const now = iso();
  getDb()
    .prepare('INSERT INTO collections (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, trimmed, description ?? null, now, now);
  return rowToCollection(getDb().prepare('SELECT * FROM collections WHERE id = ?').get(id) as Record<string, unknown>);
}

export function addAssetToCollection(collectionId: string, assetId: string): void {
  const position = Number(
    (
      getDb()
        .prepare('SELECT COALESCE(MAX(position), 0) + 1 AS position FROM collection_assets WHERE collection_id = ?')
        .get(collectionId) as { position: number }
    ).position
  );
  getDb()
    .prepare('INSERT OR IGNORE INTO collection_assets (collection_id, asset_id, position, created_at) VALUES (?, ?, ?, ?)')
    .run(collectionId, assetId, position, iso());
  updateFtsForAsset(assetId);
}

export function removeAssetFromCollection(collectionId: string, assetId: string): void {
  getDb().prepare('DELETE FROM collection_assets WHERE collection_id = ? AND asset_id = ?').run(collectionId, assetId);
  updateFtsForAsset(assetId);
}

