import { EventEmitter } from 'node:events';
import type { Job } from '../types/domain';
import {
  completeJob,
  createJob,
  failJob,
  getJob,
  markJobRunning,
  updateJobProgress
} from '../db/repositories/jobRepo';
import { logger } from './logger';

type ProgressFn = (progress: number) => void;
type JobHandler = (input: any, job: Job, progress: ProgressFn) => Promise<unknown>;

const handlers = new Map<string, JobHandler>();
const pending: Job[] = [];
const active = new Map<string, number>();
const concurrency = new Map<string, number>([
  ['scan', 2],
  ['import', 2],
  ['thumb', 2],
  ['ocr', 1],
  ['video', 1],
  ['default', 2]
]);

export const jobEvents = new EventEmitter();

function laneFor(type: string): string {
  if (type.includes('scan') || type.includes('import')) return 'import';
  if (type.includes('thumbnail')) return 'thumb';
  if (type.includes('ocr')) return 'ocr';
  if (type.includes('video') || type.includes('clip') || type.includes('gif')) return 'video';
  return 'default';
}

function emit(job: Job): void {
  jobEvents.emit('update', job);
}

export function registerJobHandler(type: string, handler: JobHandler): void {
  handlers.set(type, handler);
}

export function enqueueJob(type: string, input: unknown = {}, assetId?: string): Job {
  const job = createJob(type, input, assetId);
  pending.push(job);
  emit(job);
  queueMicrotask(processJobs);
  return job;
}

function canRun(job: Job): boolean {
  const lane = laneFor(job.type);
  return (active.get(lane) ?? 0) < (concurrency.get(lane) ?? 1);
}

function inc(job: Job): void {
  const lane = laneFor(job.type);
  active.set(lane, (active.get(lane) ?? 0) + 1);
}

function dec(job: Job): void {
  const lane = laneFor(job.type);
  active.set(lane, Math.max(0, (active.get(lane) ?? 1) - 1));
}

export function processJobs(): void {
  for (let index = 0; index < pending.length; index += 1) {
    const job = pending[index];
    if (!canRun(job)) continue;
    pending.splice(index, 1);
    index -= 1;
    void runJob(job);
  }
}

async function runJob(job: Job): Promise<void> {
  const handler = handlers.get(job.type);
  if (!handler) {
    emit(failJob(job.id, `No job handler registered for ${job.type}.`));
    return;
  }
  inc(job);
  let running: Job | undefined;
  try {
    running = markJobRunning(job.id);
    emit(running);
    const input = running.inputJson ? JSON.parse(running.inputJson) : {};
    const output = await handler(input, running, (progress) => {
      const latest = getJob(job.id);
      if (latest?.status === 'running') emit(updateJobProgress(job.id, progress));
    });
    emit(completeJob(job.id, output));
  } catch (error) {
    logger.error('Job failed.', { job, error });
    emit(failJob(job.id, error instanceof Error ? error.message : String(error)));
  } finally {
    dec(job);
    queueMicrotask(processJobs);
  }
}

