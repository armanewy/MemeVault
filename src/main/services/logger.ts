import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getLogsDir } from './appPaths';

function write(level: string, message: string, meta?: unknown): void {
  try {
    mkdirSync(getLogsDir(), { recursive: true });
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      message,
      meta: meta instanceof Error ? { name: meta.name, message: meta.message, stack: meta.stack } : meta
    });
    appendFileSync(join(getLogsDir(), 'app.log'), `${line}\n`, 'utf8');
  } catch {
    // Logging must never break the app.
  }
}

export const logger = {
  info: (message: string, meta?: unknown) => write('info', message, meta),
  warn: (message: string, meta?: unknown) => write('warn', message, meta),
  error: (message: string, meta?: unknown) => write('error', message, meta)
};

