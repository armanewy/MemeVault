import { contextBridge, ipcRenderer } from 'electron';
import type { Job } from '../main/types/domain';
import type { MemeVaultApi } from './types';

function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  return ipcRenderer.invoke(channel, payload) as Promise<T>;
}

const api: MemeVaultApi = {
  settings: {
    get: () => invoke('settings:get'),
    update: (patch) => invoke('settings:update', patch),
    clearCache: () => invoke('settings:clearCache'),
    exportBackup: () => invoke('settings:exportBackup'),
    importBackup: (input) => invoke('settings:importBackup', input),
    openLogs: () => invoke('settings:openLogs')
  },
  library: {
    importFiles: (input) => invoke('library:importFiles', input),
    addWatchFolder: (input) => invoke('library:addWatchFolder', input),
    listWatchFolders: () => invoke('library:listWatchFolders'),
    removeWatchFolder: (input) => invoke('library:removeWatchFolder', input),
    rescanFolder: (input) => invoke('library:rescanFolder', input)
  },
  assets: {
    search: (query) => invoke('assets:search', query),
    get: (input) => invoke('assets:get', input),
    getMany: (input) => invoke('assets:getMany', input),
    toggleFavorite: (input) => invoke('assets:toggleFavorite', input),
    addTag: (input) => invoke('assets:addTag', input),
    removeTag: (input) => invoke('assets:removeTag', input),
    copyToClipboard: (input) => invoke('assets:copyToClipboard', input),
    autoPaste: (input) => invoke('assets:autoPaste', input),
    revealInFileManager: (input) => invoke('assets:revealInFileManager', input),
    removeFromVault: (input) => invoke('assets:removeFromVault', input),
    rerunOcr: (input) => invoke('assets:rerunOcr', input),
    getSimilar: (input) => invoke('assets:getSimilar', input)
  },
  tags: {
    list: () => invoke('tags:list'),
    create: (input) => invoke('tags:create', input),
    delete: (input) => invoke('tags:delete', input)
  },
  collections: {
    list: () => invoke('collections:list'),
    create: (input) => invoke('collections:create', input),
    addAsset: (input) => invoke('collections:addAsset', input),
    removeAsset: (input) => invoke('collections:removeAsset', input)
  },
  jobs: {
    list: (input) => invoke('jobs:list', input),
    cancel: (input) => invoke('jobs:cancel', input),
    onUpdate: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, job: Job) => callback(job);
      ipcRenderer.on('jobs:update', listener);
      return () => ipcRenderer.removeListener('jobs:update', listener);
    }
  },
  receipt: {
    getOcrBlocks: (input) => invoke('receipt:getOcrBlocks', input),
    suggestRedactions: (input) => invoke('receipt:suggestRedactions', input),
    exportRedacted: (input) => invoke('receipt:exportRedacted', input),
    exportStitch: (input) => invoke('receipt:exportStitch', input)
  },
  clip: {
    exportImageMeme: (input) => invoke('clip:exportImageMeme', input),
    exportVideoClip: (input) => invoke('clip:exportVideoClip', input),
    getVideoInfo: (input) => invoke('clip:getVideoInfo', input)
  },
  window: {
    showMain: () => invoke('window:showMain'),
    showPalette: () => invoke('window:showPalette'),
    hidePalette: () => invoke('window:hidePalette'),
    openAsset: (input) => invoke('window:openAsset', input),
    onOpenAsset: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: { id: string }) => callback(payload);
      ipcRenderer.on('window:openAsset', listener);
      return () => ipcRenderer.removeListener('window:openAsset', listener);
    },
    onPaletteFocus: (callback) => {
      const listener = () => callback();
      ipcRenderer.on('palette:focus', listener);
      return () => ipcRenderer.removeListener('palette:focus', listener);
    }
  }
};

contextBridge.exposeInMainWorld('memevault', api);

