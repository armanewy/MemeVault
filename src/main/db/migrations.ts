import type Database from 'better-sqlite3';

function columnExists(db: Database.Database, table: string, column: string): boolean {
  return db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .some((row) => (row as { name?: string }).name === column);
}

function addColumnIfMissing(db: Database.Database, table: string, column: string, definition: string): void {
  if (!columnExists(db, table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function runMigrations(db: Database.Database): void {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS assets (
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
      duplicate_of_asset_id TEXT REFERENCES assets(id),
      duplicate_status TEXT NOT NULL DEFAULT 'unique' CHECK(duplicate_status IN ('unique', 'duplicate')),
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS asset_sources (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      source_type TEXT NOT NULL CHECK(source_type IN ('manual_import', 'watched_folder', 'clipboard', 'export')),
      source_detail TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ocr_blocks (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      confidence REAL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      width REAL NOT NULL,
      height REAL NOT NULL,
      block_type TEXT NOT NULL DEFAULT 'word',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS asset_tags (
      asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY(asset_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS collection_assets (
      collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      PRIMARY KEY(collection_id, asset_id)
    );

    CREATE TABLE IF NOT EXISTS watch_folders (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL UNIQUE,
      enabled INTEGER NOT NULL DEFAULT 1,
      recursive INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_scan_at TEXT
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
      progress REAL NOT NULL DEFAULT 0,
      asset_id TEXT,
      input_json TEXT,
      output_json TEXT,
      error TEXT,
      created_at TEXT NOT NULL,
      started_at TEXT,
      finished_at TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS asset_fts USING fts5(
      asset_id UNINDEXED,
      filename,
      ocr_text,
      tags,
      collections
    );
  `);

  addColumnIfMissing(db, 'assets', 'duplicate_of_asset_id', 'TEXT REFERENCES assets(id)');
  addColumnIfMissing(
    db,
    'assets',
    'duplicate_status',
    "TEXT NOT NULL DEFAULT 'unique' CHECK(duplicate_status IN ('unique', 'duplicate'))"
  );

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_assets_kind ON assets(kind);
    CREATE INDEX IF NOT EXISTS idx_assets_favorite ON assets(favorite);
    CREATE INDEX IF NOT EXISTS idx_assets_imported_at ON assets(imported_at);
    CREATE INDEX IF NOT EXISTS idx_assets_last_used_at ON assets(last_used_at);
    CREATE INDEX IF NOT EXISTS idx_assets_sha256 ON assets(sha256);
    CREATE INDEX IF NOT EXISTS idx_assets_phash ON assets(phash);
    CREATE INDEX IF NOT EXISTS idx_assets_duplicate_status ON assets(duplicate_status);
    CREATE INDEX IF NOT EXISTS idx_ocr_blocks_asset ON ocr_blocks(asset_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_asset ON jobs(asset_id);
  `);
}
