import type { Asset, SearchQuery, SearchResult } from '../types/domain';
import { getDb } from '../db/db';
import { listCollectionsForAsset, listTagsForAsset, rowToAsset } from '../db/repositories/assetRepo';

type AssetRow = Record<string, unknown>;
type ParsedSearchSyntax = {
  q: string;
  kind?: SearchQuery['kind'];
  tags: string[];
  favoritesOnly?: boolean;
};

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

function parseSearchSyntax(q: string): ParsedSearchSyntax {
  let next = q;
  const tags: string[] = [];
  let kind: SearchQuery['kind'] | undefined;
  let favoritesOnly: boolean | undefined;

  next = next.replace(/\bkind:(image|gif|video|screenshot)\b/gi, (_match, value: string) => {
    kind = value.toLowerCase() === 'screenshot' ? 'image' : (value.toLowerCase() as SearchQuery['kind']);
    return ' ';
  });

  next = next.replace(/\bfav:(true|false)\b/gi, (_match, value: string) => {
    favoritesOnly = value.toLowerCase() === 'true';
    return ' ';
  });

  next = next.replace(/\btag:("[^"]+"|'[^']+'|\S+)/gi, (_match, value: string) => {
    tags.push(value.replace(/^['"]|['"]$/g, '').trim());
    return ' ';
  });

  return {
    q: next.replace(/\s+/g, ' ').trim(),
    kind,
    tags: tags.filter(Boolean),
    favoritesOnly
  };
}

function ftsTokens(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/["']/g, ' ')
    .split(/[^\p{L}\p{N}_]+/u)
    .map((token) => token.trim())
    .filter(Boolean);
}

function toFtsQuery(q: string): string | undefined {
  const tokens = ftsTokens(q);
  if (!tokens.length) return undefined;
  return tokens.map((token) => `"${token.replace(/"/g, '""')}"*`).join(' AND ');
}

export function searchAssets(query: SearchQuery): SearchResult[] {
  const parsed = parseSearchSyntax(query.q ?? '');
  const q = parsed.q;
  const ftsQuery = toFtsQuery(q);
  const kind = query.kind && query.kind !== 'all' ? query.kind : parsed.kind;
  const tags = [...(query.tags ?? []), ...parsed.tags];
  const favoritesOnly = query.favoritesOnly ?? parsed.favoritesOnly;
  const clauses = ['a.deleted_at IS NULL'];
  const params: unknown[] = [];
  const joins: string[] = [];
  if (ftsQuery) {
    joins.push('INNER JOIN asset_fts ON asset_fts.asset_id = a.id');
    clauses.push('asset_fts MATCH ?');
    params.push(ftsQuery);
  }
  if (kind && kind !== 'all') {
    clauses.push('a.kind = ?');
    params.push(kind);
  }
  if (favoritesOnly) clauses.push('a.favorite = 1');
  if (query.collectionId) {
    clauses.push('EXISTS (SELECT 1 FROM collection_assets ca WHERE ca.asset_id = a.id AND ca.collection_id = ?)');
    params.push(query.collectionId);
  }
  if (tags.length) {
    for (const tag of tags) {
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
  const offset = query.offset ?? 0;
  const limit = query.limit ?? 80;
  const orderBy =
    query.sort === 'recent'
      ? 'a.imported_at DESC'
      : query.sort === 'used'
        ? 'COALESCE(a.last_used_at, a.imported_at) DESC'
        : ftsQuery
          ? 'bm25(asset_fts, 6.0, 2.0, 5.0, 3.0), COALESCE(a.last_used_at, a.imported_at) DESC'
          : 'COALESCE(a.last_used_at, a.imported_at) DESC';

  const rows = getDb()
    .prepare(
      `SELECT a.* FROM assets a
       ${joins.join(' ')}
       WHERE ${clauses.join(' AND ')}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as AssetRow[];
  const results = rows
    .map((row) => rowToAsset(row, listTagsForAsset(String(row.id)), listCollectionsForAsset(String(row.id))))
    .map((asset) => ({ asset, ...rankAssetForQuery(asset, q || tags.join(' ')) }));
  if (query.sort === 'recent' || query.sort === 'used' || ftsQuery) return results;
  return results.sort((a, b) => b.score - a.score || b.asset.importedAt.localeCompare(a.asset.importedAt));
}
