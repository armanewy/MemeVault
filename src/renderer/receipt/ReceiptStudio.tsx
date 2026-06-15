import { useEffect, useRef, useState } from 'react';
import { Check, Download, MousePointer2, Sparkles, X } from 'lucide-react';
import { api } from '../lib/api';
import type { Asset, RedactionBox, RedactionStyle } from '../types/api';

export function ReceiptStudio({
  asset,
  stitchAssetIds,
  onClose,
  onExport
}: {
  asset: Asset;
  stitchAssetIds: string[];
  onClose: () => void;
  onExport: () => void;
}): JSX.Element {
  const imageRef = useRef<HTMLImageElement>(null);
  const [boxes, setBoxes] = useState<RedactionBox[]>([]);
  const [draft, setDraft] = useState<RedactionBox | null>(null);
  const [style, setStyle] = useState<RedactionStyle>('black');
  const [message, setMessage] = useState('Original stays untouched. Export creates a new copy.');
  const [spacing, setSpacing] = useState(16);
  const [background, setBackground] = useState('#ffffff');
  const [mode, setMode] = useState<'redact' | 'stitch'>(stitchAssetIds.length >= 2 ? 'stitch' : 'redact');

  useEffect(() => {
    setBoxes([]);
    setMode(stitchAssetIds.length >= 2 ? 'stitch' : 'redact');
  }, [asset.id, stitchAssetIds.join('|')]);

  function point(event: React.PointerEvent): { x: number; y: number } {
    const image = imageRef.current;
    if (!image) return { x: 0, y: 0 };
    const rect = image.getBoundingClientRect();
    const scaleX = image.naturalWidth / rect.width;
    const scaleY = image.naturalHeight / rect.height;
    return {
      x: Math.max(0, Math.min(image.naturalWidth, (event.clientX - rect.left) * scaleX)),
      y: Math.max(0, Math.min(image.naturalHeight, (event.clientY - rect.top) * scaleY))
    };
  }

  function boxStyle(box: RedactionBox): React.CSSProperties {
    const image = imageRef.current;
    const width = image?.naturalWidth || asset.width || 1;
    const height = image?.naturalHeight || asset.height || 1;
    return {
      left: `${(box.x / width) * 100}%`,
      top: `${(box.y / height) * 100}%`,
      width: `${(box.width / width) * 100}%`,
      height: `${(box.height / height) * 100}%`
    };
  }

  async function suggest(): Promise<void> {
    const suggestions = await api.receipt.suggestRedactions({ id: asset.id });
    setBoxes(suggestions);
    setMessage(suggestions.length ? `${suggestions.length} suggested box${suggestions.length === 1 ? '' : 'es'} found.` : 'No sensitive text suggestions found.');
  }

  async function exportRedacted(): Promise<void> {
    if (!boxes.length) {
      setMessage('Draw at least one redaction box.');
      return;
    }
    await api.receipt.exportRedacted({ assetId: asset.id, boxes, style });
    setMessage('Redacted copy exported.');
    onExport();
  }

  async function exportStitch(): Promise<void> {
    await api.receipt.exportStitch({ assetIds: stitchAssetIds, spacing, background, maxWidth: 1600 });
    setMessage('Stitched copy exported.');
    onExport();
  }

  return (
    <div className="fixed inset-0 z-50 grid grid-cols-[1fr_320px] bg-bg text-textPrimary">
      <section className="flex min-h-0 flex-col">
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <h2 className="text-lg font-semibold">Receipt Studio</h2>
            <p className="text-sm text-textSecondary">{message}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close Receipt Studio">
            <X size={18} aria-hidden />
          </button>
        </header>
        {mode === 'redact' ? (
          <div className="scrollbar flex-1 overflow-auto p-5">
            <div
              className="relative mx-auto max-w-5xl cursor-crosshair select-none"
              onPointerDown={(event) => {
                const start = point(event);
                setDraft({ x: start.x, y: start.y, width: 1, height: 1 });
              }}
              onPointerMove={(event) => {
                if (!draft) return;
                const current = point(event);
                setDraft({
                  x: Math.min(draft.x, current.x),
                  y: Math.min(draft.y, current.y),
                  width: Math.abs(current.x - draft.x),
                  height: Math.abs(current.y - draft.y)
                });
              }}
              onPointerUp={() => {
                if (draft && draft.width > 6 && draft.height > 6) setBoxes((current) => [...current, { ...draft, id: crypto.randomUUID() }]);
                setDraft(null);
              }}
            >
              <img ref={imageRef} src={asset.originalUrl} alt={asset.filename} className="mx-auto max-h-[calc(100vh-120px)] max-w-full rounded-md border border-border object-contain" draggable={false} />
              {[...boxes, ...(draft ? [draft] : [])].map((box, index) => (
                <div key={box.id ?? index} className="absolute border-2 border-accent bg-black/70" style={boxStyle(box)} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center">
            <div>
              <div className="text-xl font-semibold">Vertical stitch mode</div>
              <p className="mt-2 text-sm text-textSecondary">{stitchAssetIds.length} selected screenshots will be stacked into a new PNG.</p>
            </div>
          </div>
        )}
      </section>
      <aside className="border-l border-border bg-panel p-4">
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button className={`btn ${mode === 'redact' ? 'btn-primary' : ''}`} onClick={() => setMode('redact')}>
            Redact
          </button>
          <button className={`btn ${mode === 'stitch' ? 'btn-primary' : ''}`} onClick={() => setMode('stitch')} disabled={stitchAssetIds.length < 2}>
            Stitch
          </button>
        </div>
        {mode === 'redact' ? (
          <>
            <div className="mb-4 rounded-md border border-border bg-panelAlt p-3 text-sm text-textSecondary">
              <MousePointer2 className="mb-2 text-accent" size={18} aria-hidden />
              Drag on the image to add redaction rectangles.
            </div>
            <label className="mb-3 block">
              <span className="mb-1 block text-sm text-textSecondary">Style</span>
              <select className="input w-full" value={style} onChange={(event) => setStyle(event.target.value as RedactionStyle)}>
                <option value="black">Black box</option>
                <option value="blur">Blur</option>
                <option value="pixelate">Pixelate</option>
              </select>
            </label>
            <div className="mb-4 flex gap-2">
              <button className="btn flex-1" onClick={() => void suggest()}>
                <Sparkles size={15} aria-hidden />
                Suggest
              </button>
              <button className="btn flex-1" onClick={() => setBoxes([])}>
                Clear
              </button>
            </div>
            <div className="scrollbar mb-4 max-h-56 overflow-auto rounded-md border border-border">
              {boxes.map((box, index) => (
                <div key={box.id ?? index} className="flex items-center justify-between border-b border-border px-3 py-2 text-sm last:border-b-0">
                  <span>Box {index + 1}</span>
                  <button className="text-danger" onClick={() => setBoxes((current) => current.filter((_, boxIndex) => boxIndex !== index))}>
                    Remove
                  </button>
                </div>
              ))}
              {!boxes.length ? <div className="px-3 py-6 text-center text-sm text-textSecondary">No boxes yet.</div> : null}
            </div>
            <button className="btn-primary btn w-full" onClick={() => void exportRedacted()}>
              <Download size={15} aria-hidden />
              Export PNG
            </button>
          </>
        ) : (
          <>
            <label className="mb-3 block">
              <span className="mb-1 block text-sm text-textSecondary">Spacing</span>
              <input className="input w-full" type="number" min={0} max={200} value={spacing} onChange={(event) => setSpacing(Number(event.target.value))} />
            </label>
            <label className="mb-4 block">
              <span className="mb-1 block text-sm text-textSecondary">Background</span>
              <input className="input h-11 w-full" type="color" value={background} onChange={(event) => setBackground(event.target.value)} />
            </label>
            <button className="btn-primary btn w-full" onClick={() => void exportStitch()} disabled={stitchAssetIds.length < 2}>
              <Check size={15} aria-hidden />
              Export stitch
            </button>
          </>
        )}
      </aside>
    </div>
  );
}

