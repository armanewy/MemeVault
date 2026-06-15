import { randomUUID } from 'node:crypto';
import type { Job, JobStatus } from '../../types/domain';
import { getDb } from '../db';

function iso(): string {
  return new Date().toISOString();
}

function rowToJob(row: Record<string, unknown>): Job {
  return {
    id: String(row.id),
    type: String(row.type),
    status: row.status as JobStatus,
    progress: Number(row.progress ?? 0),
    assetId: typeof row.asset_id === 'string' ? row.asset_id : undefined,
    inputJson: typeof row.input_json === 'string' ? row.input_json : undefined,
    outputJson: typeof row.output_json === 'string' ? row.output_json : undefined,
    error: typeof row.error === 'string' ? row.error : undefined,
    createdAt: String(row.created_at),
    startedAt: typeof row.started_at === 'string' ? row.started_at : undefined,
    finishedAt: typeof row.finished_at === 'string' ? row.finished_at : undefined
  };
}

export function createJob(type: string, input: unknown, assetId?: string): Job {
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO jobs (id, type, status, progress, asset_id, input_json, created_at)
       VALUES (?, ?, 'queued', 0, ?, ?, ?)`
    )
    .run(id, type, assetId ?? null, JSON.stringify(input ?? {}), iso());
  return getJob(id)!;
}

export function getJob(id: string): Job | undefined {
  const row = getDb().prepare('SELECT * FROM jobs WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? rowToJob(row) : undefined;
}

export function listJobs(status?: string): Job[] {
  const rows = status
    ? (getDb().prepare('SELECT * FROM jobs WHERE status = ? ORDER BY created_at DESC LIMIT 200').all(status) as Record<
        string,
        unknown
      >[])
    : (getDb().prepare('SELECT * FROM jobs ORDER BY created_at DESC LIMIT 200').all() as Record<string, unknown>[]);
  return rows.map(rowToJob);
}

export function markJobRunning(id: string): Job {
  const now = iso();
  getDb().prepare("UPDATE jobs SET status = 'running', started_at = ?, progress = 0 WHERE id = ?").run(now, id);
  return getJob(id)!;
}

export function updateJobProgress(id: string, progress: number): Job {
  getDb().prepare('UPDATE jobs SET progress = ? WHERE id = ?').run(Math.max(0, Math.min(1, progress)), id);
  return getJob(id)!;
}

export function completeJob(id: string, output?: unknown): Job {
  const now = iso();
  getDb()
    .prepare("UPDATE jobs SET status = 'succeeded', progress = 1, output_json = ?, finished_at = ? WHERE id = ?")
    .run(JSON.stringify(output ?? {}), now, id);
  return getJob(id)!;
}

export function failJob(id: string, error: string): Job {
  const now = iso();
  getDb()
    .prepare("UPDATE jobs SET status = 'failed', error = ?, finished_at = ? WHERE id = ?")
    .run(error, now, id);
  return getJob(id)!;
}

export function cancelJob(id: string): Job {
  const now = iso();
  getDb()
    .prepare("UPDATE jobs SET status = 'cancelled', error = 'Cancelled.', finished_at = ? WHERE id = ?")
    .run(now, id);
  return getJob(id)!;
}

