import type { Asset, SearchQuery, SearchResult } from '../types/domain';
import { getDb } from '../db/db';
import { listCollectionsForAsset, listTagsForAsset, rowToAsset } from '../db/repositories/assetRepo';

type AssetRow = Record<string, unknown>;

function tokensForQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

export function rankAssetForQuery(asset: Asset, rawQuery: string): { score: number; matchedFields: string[] } {
  const tokens = tokensForQuery(rawQuery);
  if (!tokens.length) return { score: 1, matchedFields: [] };
  const filename = asset.filename.toLowerCase();
  const ocr = asset.ocrText.toLowerCase();
  const tags = asset.tags.map((tag) => tag.name.toLowerCase());
  const collections = (asset.collections ?? []).map((collection) => collection.name.toLowerCase());
  let score = 0;
  const matched = new Set<string>();
  for (const token of tokens) {
    if (filename.includes(token)) {
      score += 120;
      matched.add('filename');
    }
    if (tags.some((tag) => tag.includes(token))) {
      score += 105;
      matched.add('tags');
    }
    if (collections.some((collection) => collection.includes(token))) {
      score += 80;
      matched.add('collections');
    }
    if (ocr.includes(token)) {
      score += 55;
      matched.add('ocr');
    }
  }
  score += Math.min(asset.useCount, 20);
  if (asset.favorite) score += 8;
  return { score, matchedFields: [...matched] };
}

function parseKindFromText(q: string): { q: string; kind?: SearchQuery['kind'] } {
  const match = /\bkind:(image|gif|video|screenshot)\b/i.exec(q);
  if (!match) return { q };
  const kind = match[1].toLowerCase() === 'screenshot' ? 'image' : (match[1].toLowerCase() as SearchQuery['kind']);
  return { q: q.replace(match[0], '').trim(), kind };
}

export function searchAssets(query: SearchQuery): SearchResult[] {
  const parsed = parseKindFromText(query.q ?? '');
  const q = parsed.q;
  const kind = query.kind && query.kind !== 'all' ? query.kind : parsed.kind;
  const clauses = ['a.deleted_at IS NULL'];
  const params: unknown[] = [];
  if (kind && kind !== 'all') {
    clauses.push('a.kind = ?');
    params.push(kind);
  }
  if (query.favoritesOnly) clauses.push('a.favorite = 1');
  if (query.collectionId) {
    clauses.push('EXISTS (SELECT 1 FROM collection_assets ca WHERE ca.asset_id = a.id AND ca.collection_id = ?)');
    params.push(query.collectionId);
  }
  if (query.tags?.length) {
    for (const tag of query.tags) {
      clauses.push(
        `EXISTS (
          SELECT 1 FROM asset_tags at
          INNER JOIN tags t ON t.id = at.tag_id
          WHERE at.asset_id = a.id AND lower(t.name) = lower(?)
        )`
      );
      params.push(tag);
    }
  }
  const rows = getDb()
    .prepare(
      `SELECT a.* FROM assets a
       WHERE ${clauses.join(' AND ')}
       ORDER BY COALESCE(a.last_used_at, a.imported_at) DESC
       LIMIT 1000`
    )
    .all(...params) as AssetRow[];
  const results = rows
    .map((row) => rowToAsset(row, listTagsForAsset(String(row.id)), listCollectionsForAsset(String(row.id))))
    .map((asset) => ({ asset, ...rankAssetForQuery(asset, q) }))
    .filter((result) => !tokensForQuery(q).length || result.score > 0);
  const sorted =
    query.sort === 'recent'
      ? results.sort((a, b) => b.asset.importedAt.localeCompare(a.asset.importedAt))
      : query.sort === 'used'
        ? results.sort((a, b) => (b.asset.lastUsedAt ?? '').localeCompare(a.asset.lastUsedAt ?? ''))
        : results.sort((a, b) => b.score - a.score || b.asset.importedAt.localeCompare(a.asset.importedAt));
  const offset = query.offset ?? 0;
  const limit = query.limit ?? 80;
  return sorted.slice(offset, offset + limit);
}

