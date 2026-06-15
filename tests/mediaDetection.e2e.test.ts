import { existsSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: {
    getPath: () => process.env.MEMEVAULT_QA_USER_DATA || join(process.cwd(), '.memevault-qa-userData')
  },
  clipboard: {},
  nativeImage: {},
  shell: {},
  dialog: {},
  ipcMain: { handle: vi.fn() },
  BrowserWindow: class {}
}));

interface ManifestEntry {
  path: string;
  drive: string;
  kind: 'image' | 'gif' | 'video';
  ext: string;
  source: string;
  sha256: string;
}

interface Manifest {
  roots: string[];
  entries: ManifestEntry[];
}

const manifestPath = process.env.MEMEVAULT_QA_MANIFEST;
const describeIfManifest = manifestPath ? describe : describe.skip;
const userDataDir = manifestPath
  ? join(dirname(manifestPath), `.memevault-qa-userData-${basename(manifestPath, '.json')}`)
  : '';

describeIfManifest('MemeVault media detection QA fixture', () => {
  let manifest: Manifest;

  beforeAll(async () => {
    process.env.MEMEVAULT_QA_USER_DATA = userDataDir;
    process.env.TESSDATA_PREFIX = join(userDataDir, 'temp');
    await rm(userDataDir, { recursive: true, force: true });
    await mkdir(userDataDir, { recursive: true });
    manifest = JSON.parse(await readFile(manifestPath!, 'utf8')) as Manifest;
  });

  afterAll(async () => {
    const { closeDatabase } = await import('../src/main/db/db');
    closeDatabase();
    if (userDataDir && !process.env.MEMEVAULT_QA_KEEP_USER_DATA) {
      await rm(userDataDir, { recursive: true, force: true });
    }
  });

  it(
    'imports, indexes, thumbnails, and searches all scattered supported files',
    async () => {
      const { ensureAppDirs } = await import('../src/main/services/appPaths');
      const { initializeDatabase } = await import('../src/main/db/db');
      const { listJobs } = await import('../src/main/db/repositories/jobRepo');
      const { registerAssetJobHandlers, importMany } = await import('../src/main/services/assetImporter');
      const { searchAssets } = await import('../src/main/services/searchService');
      const { getAssetDetail } = await import('../src/main/db/repositories/assetRepo');

      ensureAppDirs();
      initializeDatabase(join(userDataDir, 'memevault.sqlite'));
      registerAssetJobHandlers();

      const result = await importMany(manifest.roots, 'manual_import');
      expect(result.imported).toBe(manifest.entries.length);
      expect(result.skipped).toBe(0);

      await waitForJobsToSettle(listJobs);

      const all = searchAssets({ q: '', limit: 200 }).map((result) => result.asset);
      expect(all).toHaveLength(manifest.entries.length);
      expect(new Set(all.map((asset) => asset.normalizedPath))).toEqual(new Set(manifest.entries.map((entry) => entry.path)));

      for (const entry of manifest.entries) {
        const byName = searchAssets({ q: basename(entry.path), limit: 5 });
        expect(byName[0]?.asset.normalizedPath).toBe(entry.path);
        expect(byName[0]?.asset.kind).toBe(entry.kind);
      }

      const ocrResult = searchAssets({ q: 'OCRTEST ALPHA', limit: 5 });
      expect(ocrResult.some((result) => result.asset.filename.startsWith('redaction-ocr-email-phone'))).toBe(true);

      expect(all.filter((asset) => asset.kind === 'image')).toHaveLength(manifest.entries.filter((entry) => entry.kind === 'image').length);
      expect(all.filter((asset) => asset.kind === 'gif')).toHaveLength(manifest.entries.filter((entry) => entry.kind === 'gif').length);
      expect(all.filter((asset) => asset.kind === 'video')).toHaveLength(manifest.entries.filter((entry) => entry.kind === 'video').length);

      for (const asset of all) {
        const detail = getAssetDetail(asset.id);
        expect(detail.sha256).toMatch(/^[a-f0-9]{64}$/);
        expect(detail.thumbnailPath && existsSync(detail.thumbnailPath)).toBe(true);
        if (asset.kind !== 'video') {
          expect(detail.width).toBeGreaterThan(0);
          expect(detail.height).toBeGreaterThan(0);
        }
      }

      const failures = listJobs('failed');
      expect(failures, failures.map((job) => `${job.type}: ${job.error}`).join('\n')).toHaveLength(0);
    },
    180_000
  );
});

async function waitForJobsToSettle(listJobs: (status?: string) => Array<{ status: string; type: string; error?: string }>): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < 170_000) {
    const active = listJobs().filter((job) => job.status === 'queued' || job.status === 'running');
    if (!active.length) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Timed out waiting for MemeVault background jobs to settle.');
}
