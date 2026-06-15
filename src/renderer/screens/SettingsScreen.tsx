import { useEffect, useState } from 'react';
import { Archive, DatabaseBackup, FolderPlus, RotateCw, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import type { AppSettings, WatchFolder } from '../types/api';

export function SettingsScreen({
  settings,
  onSettingsChange
}: {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}): JSX.Element {
  const [local, setLocal] = useState(settings);
  const [folders, setFolders] = useState<WatchFolder[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setLocal(settings);
  }, [settings]);

  useEffect(() => {
    void api.library.listWatchFolders().then(setFolders);
  }, []);

  async function save(patch: Partial<AppSettings>): Promise<void> {
    const next = await api.settings.update(patch);
    onSettingsChange(next);
    setLocal(next);
    setMessage('Settings saved.');
  }

  async function addFolder(): Promise<void> {
    await api.library.addWatchFolder();
    setFolders(await api.library.listWatchFolders());
    setMessage('Folder added and scan started.');
  }

  return (
    <div className="scrollbar h-full overflow-auto p-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="mt-1 text-sm text-textSecondary">MemeVault is local-first. Your files are not uploaded.</p>
          {message ? <p className="mt-2 text-sm text-success">{message}</p> : null}
        </header>

        <section className="mb-6 border-b border-border pb-6">
          <h2 className="mb-3 text-base font-semibold">General</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm text-textSecondary">Theme</span>
              <select className="input w-full" disabled value="dark">
                <option>Dark</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-textSecondary">Storage location</span>
              <input className="input w-full" readOnly value={local.storageLocation} />
            </label>
          </div>
        </section>

        <section className="mb-6 border-b border-border pb-6">
          <h2 className="mb-3 text-base font-semibold">Shortcuts</h2>
          <div className="flex flex-wrap gap-3">
            <input
              className="input w-80"
              value={local.globalShortcut}
              onChange={(event) => setLocal((current) => ({ ...current, globalShortcut: event.target.value }))}
            />
            <button className="btn" onClick={() => void save({ globalShortcut: local.globalShortcut })}>
              Save shortcut
            </button>
            <button className="btn" onClick={() => void api.window.showPalette()}>
              Test shortcut
            </button>
            <button
              className="btn"
              onClick={() => void save({ globalShortcut: 'CommandOrControl+Shift+M' })}
            >
              Reset
            </button>
          </div>
        </section>

        <section className="mb-6 border-b border-border pb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Library</h2>
            <button className="btn" onClick={() => void addFolder()}>
              <FolderPlus size={16} aria-hidden />
              Add folder
            </button>
          </div>
          <div className="overflow-hidden rounded-md border border-border">
            {folders.map((folder) => (
              <div key={folder.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border bg-panel px-3 py-2 last:border-b-0">
                <div className="min-w-0">
                  <div className="truncate text-sm">{folder.path}</div>
                  <div className="text-xs text-textSecondary">Last scan: {folder.lastScanAt ?? 'Never'}</div>
                </div>
                <button
                  className="icon-btn"
                  onClick={async () => {
                    await api.library.rescanFolder({ id: folder.id });
                    setMessage('Rescan started.');
                  }}
                  aria-label="Rescan folder"
                >
                  <RotateCw size={16} aria-hidden />
                </button>
                <button
                  className="icon-btn"
                  onClick={async () => {
                    await api.library.removeWatchFolder({ id: folder.id });
                    setFolders(await api.library.listWatchFolders());
                  }}
                  aria-label="Remove folder"
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              </div>
            ))}
            {!folders.length ? <div className="bg-panel px-3 py-6 text-sm text-textSecondary">No watched folders.</div> : null}
          </div>
        </section>

        <section className="mb-6 grid gap-6 border-b border-border pb-6 md:grid-cols-2">
          <div>
            <h2 className="mb-3 text-base font-semibold">OCR</h2>
            <label className="mb-3 flex items-center justify-between rounded-md border border-border bg-panel p-3">
              <span>Enable OCR</span>
              <input type="checkbox" checked={local.ocrEnabled} onChange={(event) => void save({ ocrEnabled: event.target.checked })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-textSecondary">Language</span>
              <input className="input w-full" value={local.ocrLanguage} onChange={(event) => setLocal((current) => ({ ...current, ocrLanguage: event.target.value }))} onBlur={() => void save({ ocrLanguage: local.ocrLanguage })} />
            </label>
          </div>
          <div>
            <h2 className="mb-3 text-base font-semibold">Clipboard</h2>
            <label className="mb-3 flex items-center justify-between rounded-md border border-border bg-panel p-3">
              <span>Enable clipboard watcher</span>
              <input type="checkbox" checked={local.clipboardWatcherEnabled} onChange={(event) => void save({ clipboardWatcherEnabled: event.target.checked })} />
            </label>
            <label className="flex items-center justify-between rounded-md border border-border bg-panel p-3">
              <span>Auto-paste enabled</span>
              <input type="checkbox" checked={local.autoPasteEnabled} onChange={(event) => void save({ autoPasteEnabled: event.target.checked })} />
            </label>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">Maintenance</h2>
          <div className="flex flex-wrap gap-3">
            <button className="btn" onClick={async () => { const result = await api.settings.exportBackup(); setMessage(`Backup exported: ${result.path}`); }}>
              <DatabaseBackup size={16} aria-hidden />
              Export database backup
            </button>
            <button className="btn" onClick={async () => { await api.settings.importBackup(); setMessage('Backup imported.'); }}>
              <Archive size={16} aria-hidden />
              Import backup
            </button>
            <button className="btn" onClick={async () => { await api.settings.clearCache(); setMessage('Thumbnail cache cleared and regeneration started.'); }}>
              <RotateCw size={16} aria-hidden />
              Clear thumbnails/cache
            </button>
            <button className="btn" onClick={() => void api.settings.openLogs()}>
              Open logs folder
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

