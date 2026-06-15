import Database from 'better-sqlite3';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { runMigrations } from './migrations';
import { getDbPath } from '../services/appPaths';

let db: Database.Database | undefined;

export function createDatabase(dbPath: string): Database.Database {
  if (dbPath !== ':memory:') {
    mkdirSync(dirname(dbPath), { recursive: true });
  }
  const database = new Database(dbPath);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  runMigrations(database);
  return database;
}

export function initializeDatabase(dbPath = getDbPath()): Database.Database {
  db = createDatabase(dbPath);
  db.prepare(
    "UPDATE jobs SET status = 'failed', error = 'Interrupted by app shutdown.', finished_at = ? WHERE status IN ('queued', 'running')"
  ).run(new Date().toISOString());
  return db;
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database has not been initialized.');
  }
  return db;
}

export function closeDatabase(): void {
  db?.close();
  db = undefined;
}

export function setDatabaseForTests(database: Database.Database): void {
  db = database;
}

