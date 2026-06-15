import type {
  AppSettings,
  Asset,
  AssetDetail,
  ClipboardResult,
  Collection,
  ExportPreset,
  ImportResult,
  Job,
  OcrBlock,
  RedactionBox,
  RedactionStyle,
  SearchQuery,
  SearchResult,
  Tag,
  WatchFolder
} from '../main/types/domain';

export interface MemeVaultApi {
  settings: {
    get(): Promise<AppSettings>;
    update(patch: Partial<AppSettings>): Promise<AppSettings>;
    clearCache(): Promise<{ ok: true; jobId: string }>;
    exportBackup(): Promise<{ path: string }>;
    importBackup(input?: { path?: string }): Promise<{ ok: true }>;
    openLogs(): Promise<{ ok: true }>;
  };
  library: {
    importFiles(input?: { paths?: string[] }): Promise<ImportResult>;
    addWatchFolder(input?: { path?: string; recursive?: boolean }): Promise<WatchFolder & { scanJobId?: string }>;
    listWatchFolders(): Promise<WatchFolder[]>;
    removeWatchFolder(input: { id: string }): Promise<{ ok: true }>;
    rescanFolder(input: { id: string }): Promise<{ jobId: string }>;
  };
  assets: {
    search(query: SearchQuery): Promise<SearchResult[]>;
    get(input: { id: string }): Promise<AssetDetail>;
    getMany(input: { ids: string[] }): Promise<Asset[]>;
    toggleFavorite(input: { id: string }): Promise<Asset>;
    addTag(input: { assetId: string; tagName: string }): Promise<Asset>;
    removeTag(input: { assetId: string; tagId: string }): Promise<Asset>;
    copyToClipboard(input: { id: string }): Promise<ClipboardResult>;
    autoPaste(input: { id: string }): Promise<ClipboardResult>;
    revealInFileManager(input: { id: string }): Promise<{ ok: true }>;
    removeFromVault(input: { id: string }): Promise<{ ok: true }>;
    rerunOcr(input: { id: string }): Promise<{ jobId: string }>;
    getSimilar(input: { id: string; limit?: number }): Promise<Asset[]>;
  };
  tags: {
    list(): Promise<Tag[]>;
    create(input: { name: string; color?: string }): Promise<Tag>;
    delete(input: { id: string }): Promise<{ ok: true }>;
  };
  collections: {
    list(): Promise<Collection[]>;
    create(input: { name: string; description?: string }): Promise<Collection>;
    addAsset(input: { collectionId: string; assetId: string }): Promise<{ ok: true }>;
    removeAsset(input: { collectionId: string; assetId: string }): Promise<{ ok: true }>;
  };
  jobs: {
    list(input?: { status?: string }): Promise<Job[]>;
    cancel(input: { id: string }): Promise<{ ok: true }>;
    onUpdate(callback: (job: Job) => void): () => void;
  };
  receipt: {
    getOcrBlocks(input: { id: string }): Promise<OcrBlock[]>;
    suggestRedactions(input: { id: string }): Promise<RedactionBox[]>;
    exportRedacted(input: {
      assetId: string;
      boxes: RedactionBox[];
      style: RedactionStyle;
    }): Promise<{ asset: Asset }>;
    exportStitch(input: {
      assetIds: string[];
      spacing: number;
      background: string;
      maxWidth?: number;
    }): Promise<{ asset: Asset }>;
  };
  clip: {
    exportImageMeme(input: {
      assetId: string;
      topText?: string;
      bottomText?: string;
      preset: ExportPreset;
      textColor: 'white' | 'black';
      stroke: boolean;
      uppercase: boolean;
    }): Promise<{ asset: Asset }>;
    exportVideoClip(input: {
      assetId: string;
      startMs: number;
      endMs: number;
      format: 'mp4' | 'gif';
      preset: ExportPreset;
      topText?: string;
      bottomText?: string;
    }): Promise<{ jobId: string }>;
    getVideoInfo(input: { id: string }): Promise<{ durationMs?: number; width?: number; height?: number }>;
  };
  window: {
    showMain(): Promise<{ ok: true }>;
    showPalette(): Promise<{ ok: true }>;
    hidePalette(): Promise<{ ok: true }>;
    openAsset(input: { id: string }): Promise<{ ok: true }>;
    onOpenAsset(callback: (payload: { id: string }) => void): () => void;
    onPaletteFocus(callback: () => void): () => void;
  };
}

declare global {
  interface Window {
    memevault: MemeVaultApi;
  }
}

