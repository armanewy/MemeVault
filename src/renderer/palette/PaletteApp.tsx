import { useCallback, useEffect, useRef, useState } from 'react';
import { CornerDownLeft, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';
import type { SearchResult } from '../types/api';

export function PaletteApp(): JSX.Element {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (value: string) => {
    const next = await api.assets.search({ q: value, limit: 30 });
    setResults(next);
    setSelected(0);
  }, []);

  useEffect(() => {
    void search('');
    inputRef.current?.focus();
    return api.window.onPaletteFocus(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
      void search(query);
    });
  }, [query, search]);

  useEffect(() => {
    const handle = setTimeout(() => void search(query), 120);
    return () => clearTimeout(handle);
  }, [query, search]);

  async function copy(autoPaste: boolean): Promise<void> {
    const asset = results[selected]?.asset;
    if (!asset) return;
    const result = autoPaste ? await api.assets.autoPaste({ id: asset.id }) : await api.assets.copyToClipboard({ id: asset.id });
    setMessage(result.message);
    if (result.ok) setTimeout(() => void api.window.hidePalette(), 350);
  }

  async function openAsset(): Promise<void> {
    const asset = results[selected]?.asset;
    if (!asset) return;
    await api.window.openAsset({ id: asset.id });
    await api.window.hidePalette();
  }

  return (
    <div
      className="flex h-screen flex-col bg-bg text-textPrimary"
      onKeyDown={(event) => {
        if (event.key === 'Escape') void api.window.hidePalette();
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelected((value) => Math.min(value + 1, results.length - 1));
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelected((value) => Math.max(value - 1, 0));
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          if (event.metaKey || event.ctrlKey) void openAsset();
          else void copy(event.shiftKey);
        }
      }}
    >
      <div className="border-b border-border p-4">
        <input
          ref={inputRef}
          className="w-full bg-transparent text-xl font-semibold outline-none placeholder:text-textSecondary"
          placeholder="Search memes, screenshots, GIFs..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {message ? <div className="mt-2 text-sm text-success">{message}</div> : null}
      </div>
      <div className="scrollbar min-h-0 flex-1 overflow-auto p-2">
        {results.map((result, index) => (
          <button
            key={result.asset.id}
            className={`grid w-full grid-cols-[56px_1fr_auto] items-center gap-3 rounded-md px-3 py-2 text-left ${
              selected === index ? 'bg-panelAlt' : 'hover:bg-panel'
            }`}
            onMouseEnter={() => setSelected(index)}
            onClick={() => void copy(false)}
          >
            {result.asset.thumbnailUrl ? (
              <img src={result.asset.thumbnailUrl} alt="" className="h-12 w-12 rounded object-cover" />
            ) : (
              <div className="h-12 w-12 rounded bg-panelAlt" />
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{result.asset.filename}</div>
              <div className="truncate text-xs text-textSecondary">
                {[...result.asset.tags.map((tag) => tag.name), result.matchedFields.join(', ')].filter(Boolean).join(' · ')}
              </div>
            </div>
            <span className="badge bg-panel text-textSecondary">{result.asset.kind}</span>
          </button>
        ))}
        {!results.length ? <div className="p-8 text-center text-sm text-textSecondary">No matching assets.</div> : null}
      </div>
      <footer className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-textSecondary">
        <span className="inline-flex items-center gap-2"><CornerDownLeft size={14} aria-hidden /> Enter Copy</span>
        <span>Shift+Enter Paste</span>
        <span className="inline-flex items-center gap-2"><ExternalLink size={14} aria-hidden /> Cmd/Ctrl+Enter Open</span>
        <span>Esc Close</span>
      </footer>
    </div>
  );
}

