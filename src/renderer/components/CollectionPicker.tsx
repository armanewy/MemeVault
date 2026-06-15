import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import type { Asset, Collection } from '../types/api';

export function CollectionPicker({
  asset,
  onChanged
}: {
  asset: Asset;
  onChanged: () => void;
}): JSX.Element {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [name, setName] = useState('');
  const selected = new Set((asset.collections ?? []).map((collection) => collection.id));

  useEffect(() => {
    void api.collections.list().then(setCollections);
  }, []);

  async function create(): Promise<void> {
    if (!name.trim()) return;
    const collection = await api.collections.create({ name });
    await api.collections.addAsset({ collectionId: collection.id, assetId: asset.id });
    setName('');
    setCollections(await api.collections.list());
    onChanged();
  }

  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase text-textSecondary">Collections</div>
      <div className="space-y-2">
        {collections.map((collection) => (
          <label key={collection.id} className="flex items-center justify-between rounded-md border border-border bg-panelAlt px-3 py-2 text-sm">
            <span className="truncate">{collection.name}</span>
            <input
              type="checkbox"
              checked={selected.has(collection.id)}
              onChange={async (event) => {
                if (event.target.checked) await api.collections.addAsset({ collectionId: collection.id, assetId: asset.id });
                else await api.collections.removeAsset({ collectionId: collection.id, assetId: asset.id });
                onChanged();
              }}
            />
          </label>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input className="input min-w-0 flex-1" placeholder="New collection" value={name} onChange={(event) => setName(event.target.value)} />
        <button className="icon-btn" onClick={create} aria-label="Create collection">
          <Plus size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}

