export type AssetKind = 'image' | 'gif' | 'video';
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
export type DuplicateStatus = 'unique' | 'duplicate';
export type RedactionStyle = 'black' | 'pixelate' | 'blur';
export type ExportPreset = 'original' | 'square' | 'vertical' | 'horizontal' | 'discord';

export interface Tag {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  originalPath: string;
  normalizedPath: string;
  filename: string;
  ext: string;
  mime: string;
  kind: AssetKind;
  fileSize: number;
  sha256?: string;
  phash?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  thumbnailPath?: string;
  previewPath?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  originalUrl?: string;
  ocrText: string;
  favorite: boolean;
  useCount: number;
  lastUsedAt?: string;
  importedAt: string;
  updatedAt: string;
  fileCreatedAt?: string;
  fileModifiedAt?: string;
  missing: boolean;
  duplicateOfAssetId?: string;
  duplicateStatus: DuplicateStatus;
  tags: Tag[];
  collections?: Collection[];
}

export interface OcrBlock {
  id: string;
  assetId: string;
  text: string;
  confidence?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  blockType: 'word' | 'line';
}

export interface SearchQuery {
  q: string;
  kind?: AssetKind | 'all';
  tags?: string[];
  collectionId?: string;
  favoritesOnly?: boolean;
  duplicates?: boolean;
  limit?: number;
  offset?: number;
  sort?: 'relevance' | 'recent' | 'used';
}

export interface SearchResult {
  asset: Asset;
  score: number;
  matchedFields: string[];
}

export interface Job {
  id: string;
  type: string;
  status: JobStatus;
  progress: number;
  assetId?: string;
  inputJson?: string;
  outputJson?: string;
  error?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface WatchFolder {
  id: string;
  path: string;
  enabled: boolean;
  recursive: boolean;
  createdAt: string;
  updatedAt: string;
  lastScanAt?: string;
}

export interface AppSettings {
  firstRunComplete: boolean;
  globalShortcut: string;
  clipboardWatcherEnabled: boolean;
  autoPasteEnabled: boolean;
  ocrEnabled: boolean;
  ocrLanguage: string;
  ocrMaxFileSizeMb: number;
  clipboardMinWidth: number;
  clipboardMinHeight: number;
  theme: 'dark';
  storageLocation: string;
}

export interface AlphaInfo {
  name: string;
  version: string;
  dataDir: string;
  logsDir: string;
  packaged: boolean;
}

export interface RedactionBox {
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export interface ClipboardResult {
  ok: boolean;
  message: string;
  needsPermission?: boolean;
}

export interface AssetDetail extends Asset {
  ocrBlocks: OcrBlock[];
  similar: Asset[];
}

export interface ImportResult {
  imported: number;
  skipped: number;
  jobIds: string[];
}
