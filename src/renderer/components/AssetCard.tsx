import { Check, Copy, Heart, ImageOff } from 'lucide-react';
import { cn } from '../lib/cn';
import type { Asset } from '../types/api';
import { TagPill } from './TagPill';

export function AssetCard({
  asset,
  selected,
  stitchSelected,
  onSelect,
  onCopy,
  onToggleFavorite,
  onToggleStitch
}: {
  asset: Asset;
  selected: boolean;
  stitchSelected: boolean;
  onSelect: () => void;
  onCopy: () => void;
  onToggleFavorite: () => void;
  onToggleStitch: () => void;
}): JSX.Element {
  return (
    <article
      className={cn(
        'group overflow-hidden rounded-md border bg-panel transition hover:border-accent',
        selected ? 'border-accent' : 'border-border'
      )}
    >
      <button className="relative block aspect-square w-full bg-panelAlt text-left" onClick={onSelect}>
        {asset.thumbnailUrl || asset.previewUrl ? (
          <img
            src={asset.thumbnailUrl ?? asset.previewUrl}
            alt={asset.filename}
            className={cn('h-full w-full object-cover', asset.missing && 'opacity-40')}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-textSecondary">
            <ImageOff size={32} aria-hidden />
          </div>
        )}
        <span className="badge absolute left-2 top-2 bg-bg/80 text-textPrimary">{asset.kind === 'image' ? 'IMG' : asset.kind === 'gif' ? 'GIF' : 'VID'}</span>
        {asset.missing ? <span className="badge absolute bottom-2 left-2 bg-danger text-white">Missing</span> : null}
      </button>
      <div className="p-2">
        <div className="mb-2 truncate text-sm font-medium" title={asset.filename}>
          {asset.filename}
        </div>
        <div className="mb-2 flex min-h-[24px] gap-1 overflow-hidden">
          {asset.tags.slice(0, 2).map((tag) => (
            <TagPill key={tag.id} label={tag.name} color={tag.color} />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <label className="inline-flex items-center gap-1 text-xs text-textSecondary" title="Select for stitch">
            <input type="checkbox" checked={stitchSelected} onChange={onToggleStitch} disabled={asset.kind !== 'image'} />
            Stitch
          </label>
          <div className="flex gap-1">
            <button className="icon-btn h-8 w-8" onClick={onCopy} aria-label={`Copy ${asset.filename}`}>
              <Copy size={15} aria-hidden />
            </button>
            <button className="icon-btn h-8 w-8" onClick={onToggleFavorite} aria-label="Toggle favorite">
              {asset.favorite ? <Heart size={15} fill="currentColor" className="text-accent" aria-hidden /> : <Heart size={15} aria-hidden />}
            </button>
            {selected ? (
              <span className="flex h-8 w-8 items-center justify-center text-accent">
                <Check size={16} aria-hidden />
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

