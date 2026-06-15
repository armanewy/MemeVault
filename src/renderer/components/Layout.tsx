import { ReactNode, useEffect, useState } from 'react';
import {
  Clock,
  Folder,
  Heart,
  Image,
  Images,
  LayoutGrid,
  Settings,
  Sparkles,
  Tags,
  Video
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { api } from '../lib/api';
import { cn } from '../lib/cn';
import type { Collection, Tag } from '../types/api';
import { JobIndicator } from './JobIndicator';

export type LibraryFilter =
  | { type: 'all' }
  | { type: 'favorites' }
  | { type: 'recent' }
  | { type: 'screenshots' }
  | { type: 'kind'; kind: 'image' | 'gif' | 'video' }
  | { type: 'tag'; tag: string }
  | { type: 'collection'; collectionId: string }
  | { type: 'asset'; assetId: string };

export function Layout({
  children,
  screen,
  filter,
  onScreenChange,
  onFilterChange
}: {
  children: ReactNode;
  screen: 'library' | 'settings';
  filter: LibraryFilter;
  onScreenChange: (screen: 'library' | 'settings') => void;
  onFilterChange: (filter: LibraryFilter) => void;
}): JSX.Element {
  const [tags, setTags] = useState<Tag[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);

  useEffect(() => {
    const load = () => {
      void api.tags.list().then(setTags);
      void api.collections.list().then(setCollections);
    };
    load();
    const off = api.jobs.onUpdate((job) => {
      if (job.status === 'succeeded') load();
    });
    return off;
  }, []);

  return (
    <div className="grid h-screen grid-cols-[260px_1fr] bg-bg text-textPrimary">
      <aside className="flex min-h-0 flex-col border-r border-border bg-panel">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-white">
              <Sparkles size={20} aria-hidden />
            </div>
            <div>
              <div className="font-semibold">MemeVault</div>
              <div className="text-xs text-textSecondary">Local desktop suite</div>
            </div>
          </div>
        </div>
        <nav className="scrollbar flex-1 overflow-auto px-3 py-4">
          <NavButton active={screen === 'library' && filter.type === 'all'} icon={LayoutGrid} label="All" onClick={() => onFilterChange({ type: 'all' })} />
          <NavButton active={filter.type === 'favorites'} icon={Heart} label="Favorites" onClick={() => onFilterChange({ type: 'favorites' })} />
          <NavButton active={filter.type === 'recent'} icon={Clock} label="Recent" onClick={() => onFilterChange({ type: 'recent' })} />
          <NavButton active={filter.type === 'screenshots'} icon={Image} label="Screenshots" onClick={() => onFilterChange({ type: 'screenshots' })} />
          <NavButton active={filter.type === 'kind' && filter.kind === 'image'} icon={Images} label="Images" onClick={() => onFilterChange({ type: 'kind', kind: 'image' })} />
          <NavButton active={filter.type === 'kind' && filter.kind === 'gif'} icon={Image} label="GIFs" onClick={() => onFilterChange({ type: 'kind', kind: 'gif' })} />
          <NavButton active={filter.type === 'kind' && filter.kind === 'video'} icon={Video} label="Videos" onClick={() => onFilterChange({ type: 'kind', kind: 'video' })} />
          <div className="mt-5 px-2 text-xs font-semibold uppercase text-textSecondary">Tags</div>
          {tags.length ? (
            tags.map((tag) => (
              <NavButton
                key={tag.id}
                active={filter.type === 'tag' && filter.tag === tag.name}
                icon={Tags}
                label={tag.name}
                onClick={() => onFilterChange({ type: 'tag', tag: tag.name })}
              />
            ))
          ) : (
            <div className="px-2 py-2 text-xs text-textSecondary">No tags yet</div>
          )}
          <div className="mt-5 px-2 text-xs font-semibold uppercase text-textSecondary">Collections</div>
          {collections.length ? (
            collections.map((collection) => (
              <NavButton
                key={collection.id}
                active={filter.type === 'collection' && filter.collectionId === collection.id}
                icon={Folder}
                label={collection.name}
                onClick={() => onFilterChange({ type: 'collection', collectionId: collection.id })}
              />
            ))
          ) : (
            <div className="px-2 py-2 text-xs text-textSecondary">No collections yet</div>
          )}
        </nav>
        <div className="border-t border-border p-3">
          <NavButton active={screen === 'settings'} icon={Settings} label="Settings" onClick={() => onScreenChange('settings')} />
        </div>
      </aside>
      <main className="relative min-h-0 overflow-hidden">
        {children}
        <JobIndicator />
      </main>
    </div>
  );
}

function NavButton({
  active,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      className={cn(
        'mb-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-textSecondary hover:bg-panelAlt hover:text-textPrimary',
        active && 'bg-panelAlt text-textPrimary'
      )}
      onClick={onClick}
    >
      <Icon size={17} aria-hidden />
      <span className="truncate">{label}</span>
    </button>
  );
}
