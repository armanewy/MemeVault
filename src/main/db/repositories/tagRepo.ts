import { randomUUID } from 'node:crypto';
import type { Tag } from '../../types/domain';
import { getDb } from '../db';
import { getAssetOrThrow, updateFtsForAsset } from './assetRepo';

function iso(): string {
  return new Date().toISOString();
}

function rowToTag(row: Record<string, unknown>): Tag {
  return {
    id: String(row.id),
    name: String(row.name),
    color: typeof row.color === 'string' ? row.color : undefined,
    createdAt: String(row.created_at)
  };
}

export function listTags(): Tag[] {
  return (getDb().prepare('SELECT * FROM tags ORDER BY lower(name)').all() as Record<string, unknown>[]).map(rowToTag);
}

export function createTag(name: string, color?: string): Tag {
  const normalized = name.trim().replace(/^#/, '');
  if (!normalized) throw new Error('Tag name is required.');
  const existing = getDb().prepare('SELECT * FROM tags WHERE lower(name) = lower(?)').get(normalized) as
    | Record<string, unknown>
    | undefined;
  if (existing) return rowToTag(existing);
  const id = randomUUID();
  getDb().prepare('INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)').run(id, normalized, color ?? null, iso());
  return rowToTag(getDb().prepare('SELECT * FROM tags WHERE id = ?').get(id) as Record<string, unknown>);
}

export function deleteTag(id: string): void {
  const assetIds = getDb().prepare('SELECT asset_id FROM asset_tags WHERE tag_id = ?').all(id) as { asset_id: string }[];
  getDb().prepare('DELETE FROM tags WHERE id = ?').run(id);
  for (const row of assetIds) updateFtsForAsset(row.asset_id);
}

export function addTagToAsset(assetId: string, tagName: string): ReturnType<typeof getAssetOrThrow> {
  const tag = createTag(tagName);
  getDb().prepare('INSERT OR IGNORE INTO asset_tags (asset_id, tag_id) VALUES (?, ?)').run(assetId, tag.id);
  updateFtsForAsset(assetId);
  return getAssetOrThrow(assetId);
}

export function removeTagFromAsset(assetId: string, tagId: string): ReturnType<typeof getAssetOrThrow> {
  getDb().prepare('DELETE FROM asset_tags WHERE asset_id = ? AND tag_id = ?').run(assetId, tagId);
  updateFtsForAsset(assetId);
  return getAssetOrThrow(assetId);
}

