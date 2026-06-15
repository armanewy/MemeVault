import { FolderPlus } from 'lucide-react';

export function EmptyState({ onImport }: { onImport: () => void }): JSX.Element {
  return (
    <div className="flex h-full items-center justify-center p-10">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-md border border-border bg-panelAlt text-accent">
          <FolderPlus size={26} aria-hidden />
        </div>
        <h2 className="text-xl font-semibold">Your vault is empty.</h2>
        <p className="mt-2 text-sm text-textSecondary">Import a folder of memes, screenshots, GIFs, or clips.</p>
        <button className="btn-primary btn mt-6" onClick={onImport}>
          <FolderPlus size={16} aria-hidden />
          Import
        </button>
      </div>
    </div>
  );
}

