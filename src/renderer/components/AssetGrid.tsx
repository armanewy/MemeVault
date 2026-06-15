import type { Asset } from '../types/api';
import { AssetCard } from './AssetCard';

export function AssetGrid({
  assets,
  selectedId,
  stitchIds,
  onSelect,
  onCopy,
  onToggleFavorite,
  onToggleStitch
}: {
  assets: Asset[];
  selectedId?: string;
  stitchIds: string[];
  onSelect: (asset: Asset) => void;
  onCopy: (asset: Asset) => void;
  onToggleFavorite: (asset: Asset) => void;
  onToggleStitch: (asset: Asset) => void;
}): JSX.Element {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4 p-5">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          selected={selectedId === asset.id}
          stitchSelected={stitchIds.includes(asset.id)}
          onSelect={() => onSelect(asset)}
          onCopy={() => onCopy(asset)}
          onToggleFavorite={() => onToggleFavorite(asset)}
          onToggleStitch={() => onToggleStitch(asset)}
        />
      ))}
    </div>
  );
}

