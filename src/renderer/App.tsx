import { useEffect, useMemo, useState } from 'react';
import { FolderPlus, Keyboard, ShieldCheck } from 'lucide-react';
import { api } from './lib/api';
import type { AppSettings, Asset } from './types/api';
import { Layout, LibraryFilter } from './components/Layout';
import { LibraryScreen } from './screens/LibraryScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { PaletteApp } from './palette/PaletteApp';
import { ReceiptStudio } from './receipt/ReceiptStudio';
import { ClipMemeStudio } from './clip/ClipMemeStudio';

type Screen = 'library' | 'settings';

export function App(): JSX.Element {
  const isPalette = useMemo(() => new URLSearchParams(window.location.search).has('palette'), []);
  if (isPalette) return <PaletteApp />;
  return <MainApp />;
}

function MainApp(): JSX.Element {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [screen, setScreen] = useState<Screen>('library');
  const [filter, setFilter] = useState<LibraryFilter>({ type: 'all' });
  const [editingReceipt, setEditingReceipt] = useState<Asset | null>(null);
  const [editingClip, setEditingClip] = useState<Asset | null>(null);
  const [stitchIds, setStitchIds] = useState<string[]>([]);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    api.settings.get().then(setSettings).catch(console.error);
    return api.window.onOpenAsset(({ id }) => {
      setScreen('library');
      setFilter({ type: 'asset', assetId: id });
    });
  }, []);

  if (!settings) {
    return <div className="flex h-screen items-center justify-center bg-bg text-textSecondary">Loading MemeVault...</div>;
  }

  if (!settings.firstRunComplete) {
    return <Onboarding settings={settings} onDone={setSettings} />;
  }

  return (
    <Layout
      screen={screen}
      filter={filter}
      onScreenChange={setScreen}
      onFilterChange={(next) => {
        setScreen('library');
        setFilter(next);
      }}
    >
      {screen === 'settings' ? (
        <SettingsScreen settings={settings} onSettingsChange={setSettings} />
      ) : (
        <LibraryScreen
          filter={filter}
          refreshNonce={refreshNonce}
          onOpenReceipt={(asset, ids) => {
            setEditingReceipt(asset);
            setStitchIds(ids ?? []);
          }}
          onOpenClip={setEditingClip}
          onOpenSettings={() => setScreen('settings')}
        />
      )}
      {editingReceipt ? (
        <ReceiptStudio
          asset={editingReceipt}
          stitchAssetIds={stitchIds}
          onClose={() => {
            setEditingReceipt(null);
            setStitchIds([]);
          }}
          onExport={() => setRefreshNonce((value) => value + 1)}
        />
      ) : null}
      {editingClip ? (
        <ClipMemeStudio
          asset={editingClip}
          onClose={() => setEditingClip(null)}
          onExport={() => setRefreshNonce((value) => value + 1)}
        />
      ) : null}
    </Layout>
  );
}

function Onboarding({
  settings,
  onDone
}: {
  settings: AppSettings;
  onDone: (settings: AppSettings) => void;
}): JSX.Element {
  const [step, setStep] = useState(0);
  const [clipboardWatcherEnabled, setClipboardWatcherEnabled] = useState(false);
  const cards = [
    {
      icon: FolderPlus,
      title: 'Build your personal meme vault.',
      body: 'Index screenshots, reaction images, GIFs, and clips locally. Nothing uploads.',
      action: 'Add meme folder'
    },
    {
      icon: Keyboard,
      title: 'Open from anywhere.',
      body: `Use ${settings.globalShortcut} to search and copy from any app.`,
      action: 'Test shortcut'
    },
    {
      icon: ShieldCheck,
      title: 'Optional: capture copied images.',
      body: 'When enabled, MemeVault saves copied images locally so you can find them later.',
      action: 'Continue'
    }
  ];
  const card = cards[step];
  const Icon = card.icon;

  async function finish(): Promise<void> {
    const next = await api.settings.update({ firstRunComplete: true, clipboardWatcherEnabled });
    onDone(next);
  }

  async function primary(): Promise<void> {
    if (step === 0) {
      await api.library.addWatchFolder();
      setStep(1);
    } else if (step === 1) {
      await api.window.showPalette();
      setStep(2);
    } else {
      await finish();
    }
  }

  return (
    <main className="flex h-screen items-center justify-center bg-bg px-6">
      <section className="w-full max-w-xl">
        <div className="mb-8 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-md border border-border bg-panelAlt text-accent">
            <Icon size={28} aria-hidden />
          </div>
        </div>
        <h1 className="text-center text-3xl font-bold tracking-normal text-textPrimary">{card.title}</h1>
        <p className="mx-auto mt-3 max-w-md text-center text-base text-textSecondary">{card.body}</p>
        {step === 2 ? (
          <label className="mx-auto mt-8 flex max-w-md items-center justify-between rounded-md border border-border bg-panel p-4 text-sm">
            <span>Clipboard watcher</span>
            <input
              type="checkbox"
              checked={clipboardWatcherEnabled}
              onChange={(event) => setClipboardWatcherEnabled(event.target.checked)}
            />
          </label>
        ) : null}
        <div className="mt-8 flex justify-center gap-3">
          {step === 0 ? (
            <button className="btn" onClick={() => setStep(1)}>
              Skip for now
            </button>
          ) : null}
          <button className="btn-primary btn" onClick={primary}>
            {card.action}
          </button>
        </div>
      </section>
    </main>
  );
}

