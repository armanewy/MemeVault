import { useEffect, useState } from 'react';
import { Copy, ExternalLink, Heart, PenLine, Scissors, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { formatBytes, formatDuration } from '../lib/format';
import type { Asset, AssetDetail } from '../types/api';
import { TagPill } from './TagPill';
import { CollectionPicker } from './CollectionPicker';

export function AssetDetailDrawer({
  asset,
  onChanged,
  onOpenReceipt,
  onOpenClip
}: {
  asset?: Asset;
  onChanged: () => void;
  onOpenReceipt: (asset: Asset) => void;
  onOpenClip: (asset: Asset) => void;
}): JSX.Element {
  const [detail, setDetail] = useState<AssetDetail | null>(null);
  const [tagName, setTagName] = useState('');
  const current = detail ?? asset;

  useEffect(() => {
    if (!asset) {
      setDetail(null);
      return;
    }
    void api.assets.get({ id: asset.id }).then(setDetail);
  }, [asset?.id]);

  async function reload(): Promise<void> {
    if (!asset) return;
    setDetail(await api.assets.get({ id: asset.id }));
    onChanged();
  }

  async function addTag(): Promise<void> {
    if (!current || !tagName.trim()) return;
    await api.assets.addTag({ assetId: current.id, tagName });
    setTagName('');
    await reload();
  }

  if (!current) {
    return <aside className="hidden border-l border-border bg-panel xl:block" />;
  }

  return (
    <aside className="scrollbar w-[360px] overflow-auto border-l border-border bg-panel">
      <div className="p-4">
        <div className="overflow-hidden rounded-md border border-border bg-panelAlt">
          {current.kind === 'video' ? (
            <video src={current.originalUrl} controls className="max-h-80 w-full bg-bg" />
          ) : (
            <img src={current.previewUrl ?? current.originalUrl} alt={current.filename} className="max-h-80 w-full object-contain" />
          )}
        </div>
        <h2 className="mt-4 break-words text-lg font-semibold">{current.filename}</h2>
        {current.duplicateStatus === 'duplicate' ? (
          <div className="mt-3 rounded-md border border-warning/60 bg-warning/10 p-3 text-sm text-warning">
            Duplicate asset{current.duplicateOfAssetId ? ` of ${current.duplicateOfAssetId.slice(0, 8)}` : ''}.
          </div>
        ) : null}
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-textSecondary">
          <span>{current.kind.toUpperCase()}</span>
          <span>{formatBytes(current.fileSize)}</span>
          <span>{current.width && current.height ? `${current.width} x ${current.height}` : 'Processing'}</span>
          <span>{current.kind === 'video' || current.kind === 'gif' ? formatDuration(current.durationMs) : 'Still'}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="btn" onClick={() => void api.assets.copyToClipboard({ id: current.id })}>
            <Copy size={15} aria-hidden />
            Copy
          </button>
          <button className="btn" onClick={async () => { await api.assets.toggleFavorite({ id: current.id }); await reload(); }}>
            <Heart size={15} fill={current.favorite ? 'currentColor' : 'none'} aria-hidden />
            Favorite
          </button>
          <button className="btn" onClick={() => void api.assets.revealInFileManager({ id: current.id })}>
            <ExternalLink size={15} aria-hidden />
            Reveal
          </button>
          <button className="btn" onClick={() => onOpenClip(current)}>
            <Scissors size={15} aria-hidden />
            Clip
          </button>
          {current.kind === 'image' ? (
            <button className="btn col-span-2" onClick={() => onOpenReceipt(current)}>
              <PenLine size={15} aria-hidden />
              Receipt Studio
            </button>
          ) : null}
        </div>
        <section className="mt-5">
          <div className="mb-2 text-xs font-semibold uppercase text-textSecondary">Tags</div>
          <div className="mb-2 flex flex-wrap gap-2">
            {current.tags.map((tag) => (
              <TagPill
                key={tag.id}
                label={tag.name}
                color={tag.color}
                onRemove={async () => {
                  await api.assets.removeTag({ assetId: current.id, tagId: tag.id });
                  await reload();
                }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <input className="input min-w-0 flex-1" value={tagName} placeholder="Add tag" onChange={(event) => setTagName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void addTag(); }} />
            <button className="btn" onClick={addTag}>Add</button>
          </div>
        </section>
        <section className="mt-5">
          <CollectionPicker asset={current} onChanged={() => void reload()} />
        </section>
        {detail?.ocrText ? (
          <section className="mt-5">
            <div className="mb-2 text-xs font-semibold uppercase text-textSecondary">OCR text</div>
            <p className="max-h-28 overflow-auto rounded-md border border-border bg-panelAlt p-3 text-xs text-textSecondary scrollbar">
              {detail.ocrText}
            </p>
          </section>
        ) : null}
        {detail?.similar.length ? (
          <section className="mt-5">
            <div className="mb-2 text-xs font-semibold uppercase text-textSecondary">Similar assets</div>
            <div className="grid grid-cols-4 gap-2">
              {detail.similar.map((similar) => (
                <img key={similar.id} src={similar.thumbnailUrl ?? similar.previewUrl} alt={similar.filename} className="aspect-square rounded border border-border object-cover" />
              ))}
            </div>
          </section>
        ) : null}
        <button
          className="btn-danger btn mt-5 w-full"
          onClick={async () => {
            await api.assets.removeFromVault({ id: current.id });
            onChanged();
          }}
        >
          <Trash2 size={15} aria-hidden />
          Remove from vault
        </button>
      </div>
    </aside>
  );
}
