import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { api } from '../lib/api';
import { formatDuration } from '../lib/format';
import type { Asset, ExportPreset } from '../types/api';

export function ClipMemeStudio({
  asset,
  onClose,
  onExport
}: {
  asset: Asset;
  onClose: () => void;
  onExport: () => void;
}): JSX.Element {
  const isVideoLike = asset.kind === 'video' || asset.kind === 'gif';
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [preset, setPreset] = useState<ExportPreset>('original');
  const [textColor, setTextColor] = useState<'white' | 'black'>('white');
  const [stroke, setStroke] = useState(true);
  const [uppercase, setUppercase] = useState(true);
  const [format, setFormat] = useState<'mp4' | 'gif'>(asset.kind === 'gif' ? 'gif' : 'mp4');
  const [startMs, setStartMs] = useState(0);
  const [endMs, setEndMs] = useState(asset.durationMs ?? 5000);
  const [message, setMessage] = useState('Tiny edits only. No timeline. No nonsense.');

  useEffect(() => {
    if (isVideoLike) {
      void api.clip.getVideoInfo({ id: asset.id }).then((info) => {
        if (info.durationMs) setEndMs(info.durationMs);
      });
    }
  }, [asset.id, isVideoLike]);

  async function exportImage(): Promise<void> {
    await api.clip.exportImageMeme({ assetId: asset.id, topText, bottomText, preset, textColor, stroke, uppercase });
    setMessage('Captioned PNG exported.');
    onExport();
  }

  async function exportVideo(): Promise<void> {
    if (endMs <= startMs) {
      setMessage('End time must be after start time.');
      return;
    }
    const result = await api.clip.exportVideoClip({ assetId: asset.id, startMs, endMs, format, preset, topText, bottomText });
    setMessage(`Video export queued (${result.jobId.slice(0, 8)}).`);
    onExport();
  }

  return (
    <div className="fixed inset-0 z-50 grid grid-cols-[1fr_340px] bg-bg text-textPrimary">
      <section className="flex min-h-0 flex-col">
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <h2 className="text-lg font-semibold">ClipMeme Studio</h2>
            <p className="text-sm text-textSecondary">{message}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close ClipMeme Studio">
            <X size={18} aria-hidden />
          </button>
        </header>
        <div className="flex flex-1 items-center justify-center overflow-hidden p-6">
          <div className="relative max-h-full max-w-full overflow-hidden rounded-md border border-border bg-panelAlt">
            {asset.kind === 'video' ? (
              <video src={asset.originalUrl} controls className="max-h-[calc(100vh-120px)] max-w-full bg-black" />
            ) : (
              <img src={asset.originalUrl} alt={asset.filename} className="max-h-[calc(100vh-120px)] max-w-full object-contain" />
            )}
            {topText ? <Caption position="top" text={uppercase ? topText.toUpperCase() : topText} textColor={textColor} stroke={stroke} /> : null}
            {bottomText ? <Caption position="bottom" text={uppercase ? bottomText.toUpperCase() : bottomText} textColor={textColor} stroke={stroke} /> : null}
          </div>
        </div>
      </section>
      <aside className="scrollbar overflow-auto border-l border-border bg-panel p-4">
        <div className="mb-4">
          <div className="mb-2 text-xs font-semibold uppercase text-textSecondary">Caption</div>
          <input className="input mb-2 w-full" placeholder="Top text" value={topText} onChange={(event) => setTopText(event.target.value)} />
          <input className="input w-full" placeholder="Bottom text" value={bottomText} onChange={(event) => setBottomText(event.target.value)} />
        </div>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm text-textSecondary">Output preset</span>
          <select className="input w-full" value={preset} onChange={(event) => setPreset(event.target.value as ExportPreset)}>
            <option value="original">Original</option>
            <option value="square">Square 1080x1080</option>
            <option value="vertical">Vertical 1080x1920</option>
            <option value="horizontal">Horizontal 1920x1080</option>
            <option value="discord">Discord-friendly max width 1280</option>
          </select>
        </label>
        {!isVideoLike ? (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <label className="rounded-md border border-border bg-panelAlt p-3 text-sm">
                <span className="mb-2 block text-textSecondary">Text color</span>
                <select className="input w-full" value={textColor} onChange={(event) => setTextColor(event.target.value as 'white' | 'black')}>
                  <option value="white">White</option>
                  <option value="black">Black</option>
                </select>
              </label>
              <div className="space-y-2">
                <label className="flex items-center justify-between rounded-md border border-border bg-panelAlt p-3 text-sm">
                  <span>Stroke</span>
                  <input type="checkbox" checked={stroke} onChange={(event) => setStroke(event.target.checked)} />
                </label>
                <label className="flex items-center justify-between rounded-md border border-border bg-panelAlt p-3 text-sm">
                  <span>Uppercase</span>
                  <input type="checkbox" checked={uppercase} onChange={(event) => setUppercase(event.target.checked)} />
                </label>
              </div>
            </div>
            <button className="btn-primary btn w-full" onClick={() => void exportImage()}>
              <Download size={15} aria-hidden />
              Export PNG
            </button>
          </>
        ) : (
          <>
            <div className="mb-4 rounded-md border border-border bg-panelAlt p-3 text-sm text-textSecondary">
              Duration: {formatDuration(asset.durationMs)}. Captions are applied with FFmpeg when possible.
            </div>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-sm text-textSecondary">Start ms</span>
                <input className="input w-full" type="number" min={0} value={startMs} onChange={(event) => setStartMs(Number(event.target.value))} />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textSecondary">End ms</span>
                <input className="input w-full" type="number" min={1} value={endMs} onChange={(event) => setEndMs(Number(event.target.value))} />
              </label>
            </div>
            <label className="mb-4 block">
              <span className="mb-1 block text-sm text-textSecondary">Format</span>
              <select className="input w-full" value={format} onChange={(event) => setFormat(event.target.value as 'mp4' | 'gif')}>
                <option value="mp4">MP4</option>
                <option value="gif">GIF</option>
              </select>
            </label>
            <button className="btn-primary btn w-full" onClick={() => void exportVideo()}>
              <Download size={15} aria-hidden />
              Export clip
            </button>
          </>
        )}
      </aside>
    </div>
  );
}

function Caption({
  text,
  position,
  textColor,
  stroke
}: {
  text: string;
  position: 'top' | 'bottom';
  textColor: 'white' | 'black';
  stroke: boolean;
}): JSX.Element {
  return (
    <div
      className={`pointer-events-none absolute left-4 right-4 text-center text-5xl font-black uppercase tracking-normal ${
        position === 'top' ? 'top-6' : 'bottom-6'
      } ${textColor === 'white' ? 'text-white' : 'text-black'}`}
      style={{
        WebkitTextStroke: stroke ? `2px ${textColor === 'white' ? '#000' : '#fff'}` : undefined
      }}
    >
      {text}
    </div>
  );
}
