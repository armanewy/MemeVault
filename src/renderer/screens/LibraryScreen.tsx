import { useCallback, useEffect, useMemo, useState } from 'react';
import { FolderPlus, Images, RefreshCcw, Scissors } from 'lucide-react';
import { api } from '../lib/api';
import type { Asset, SearchQuery } from '../types/api';
import type { LibraryFilter } from '../components/Layout';
import { SearchInput } from '../components/SearchInput';
import { AssetGrid } from '../components/AssetGrid';
import { AssetDetailDrawer } from '../components/AssetDetailDrawer';
import { EmptyState } from '../components/EmptyState';

export function LibraryScreen({
  filter,
  refreshNonce,
  onOpenReceipt,
  onOpenClip,
  onOpenSettings
}: {
  filter: LibraryFilter;
  refreshNonce: number;
  onOpenReceipt: (asset: Asset, stitchIds?: string[]) => void;
  onOpenClip: (asset: Asset) => void;
  onOpenSettings: () => void;
}): JSX.Element {
  const [query, setQuery] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selected, setSelected] = useState<Asset | undefined>();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [stitchIds, setStitchIds] = useState<string[]>([]);

  const searchQuery = useMemo<SearchQuery>(() => {
    const base: SearchQuery = { q: query, limit: 200, sort: filter.type === 'recent' ? 'recent' : 'relevance' };
    if (filter.type === 'favorites') base.favoritesOnly = true;
    if (filter.type === 'kind') base.kind = filter.kind;
    if (filter.type === 'screenshots') {
      base.kind = 'image';
      base.q = `${query} screenshot`.trim();
    }
    if (filter.type === 'tag') base.tags = [filter.tag];
    if (filter.type === 'collection') base.collectionId = filter.collectionId;
    if (filter.type === 'asset') base.q = query;
    return base;
  }, [query, filter]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const results = await api.assets.search(searchQuery);
      const nextAssets = results.map((result) => result.asset);
      setAssets(nextAssets);
      if (filter.type === 'asset') {
        const asset = await api.assets.get({ id: filter.assetId });
        setSelected(asset);
      } else if (selected && !nextAssets.some((asset) => asset.id === selected.id)) {
        setSelected(nextAssets[0]);
      } else if (!selected && nextAssets.length) {
        setSelected(nextAssets[0]);
      }
    } finally {
      setLoading(false);
    }
  }, [filter, searchQuery, selected]);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshNonce]);

  useEffect(() => {
    return api.jobs.onUpdate((job) => {
      if (job.status === 'succeeded' || job.status === 'failed') void refresh();
    });
  }, [refresh]);

  async function importFiles(): Promise<void> {
    const result = await api.library.importFiles();
    setMessage(result.imported ? `Imported ${result.imported} item${result.imported === 1 ? '' : 's'}.` : 'No new files imported.');
    void refresh();
  }

  async function copy(asset: Asset): Promise<void> {
    const result = await api.assets.copyToClipboard({ id: asset.id });
    setMessage(result.message);
    void refresh();
  }

  async function toggleFavorite(asset: Asset): Promise<void> {
    await api.assets.toggleFavorite({ id: asset.id });
    await refresh();
  }

  function toggleStitch(asset: Asset): void {
    if (asset.kind !== 'image') return;
    setStitchIds((current) => (current.includes(asset.id) ? current.filter((id) => id !== asset.id) : [...current, asset.id]));
  }

  return (
    <div className="grid h-full grid-cols-[1fr_360px]">
      <section className="flex min-w-0 flex-col">
        <header className="border-b border-border bg-bg/95 px-5 py-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">Library</h1>
              <p className="text-sm text-textSecondary">MemeVault is local-first. Your files are not uploaded.</p>
            </div>
            <div className="flex gap-2">
              {stitchIds.length >= 2 && selected ? (
                <button className="btn" onClick={() => onOpenReceipt(selected, stitchIds)}>
                  <Images size={16} aria-hidden />
                  Stitch selected
                </button>
              ) : null}
              <button className="btn" onClick={() => void refresh()}>
                <RefreshCcw size={16} aria-hidden />
                Refresh
              </button>
              <button className="btn-primary btn" onClick={() => void importFiles()}>
                <FolderPlus size={16} aria-hidden />
                Import
              </button>
            </div>
          </div>
          <SearchInput value={query} onChange={setQuery} />
          {message ? <div className="mt-2 text-sm text-textSecondary">{message}</div> : null}
        </header>
        <div className="scrollbar min-h-0 flex-1 overflow-auto">
          {!loading && !assets.length ? (
            <EmptyState onImport={() => void importFiles()} />
          ) : (
            <AssetGrid
              assets={assets}
              selectedId={selected?.id}
              stitchIds={stitchIds}
              onSelect={setSelected}
              onCopy={(asset) => void copy(asset)}
              onToggleFavorite={(asset) => void toggleFavorite(asset)}
              onToggleStitch={toggleStitch}
            />
          )}
          {loading ? <div className="p-5 text-sm text-textSecondary">Loading assets...</div> : null}
        </div>
      </section>
      <AssetDetailDrawer
        asset={selected}
        onChanged={() => void refresh()}
        onOpenReceipt={(asset) => onOpenReceipt(asset, stitchIds)}
        onOpenClip={(asset) => {
          setMessage(asset.kind === 'image' ? 'Tiny edits only. No timeline. No nonsense.' : '');
          onOpenClip(asset);
        }}
      />
      {!selected && assets.length ? (
        <button className="absolute bottom-5 left-5 btn" onClick={onOpenSettings}>
          <Scissors size={15} aria-hidden />
          Settings
        </button>
      ) : null}
    </div>
  );
}

