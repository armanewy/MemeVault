import { registerAssetsIpc } from './assetsIpc';
import { registerClipIpc, registerClipJobHandlers } from './clipIpc';
import { registerCollectionsIpc } from './collectionsIpc';
import { registerJobsIpc } from './jobsIpc';
import { registerLibraryIpc } from './libraryIpc';
import { registerReceiptIpc } from './receiptIpc';
import { registerSettingsIpc } from './settingsIpc';
import { registerTagsIpc } from './tagsIpc';
import { registerWindowIpc } from './windowIpc';

export function registerIpc(onShortcutChanged: () => void): void {
  registerClipJobHandlers();
  registerSettingsIpc(onShortcutChanged);
  registerLibraryIpc();
  registerAssetsIpc();
  registerTagsIpc();
  registerCollectionsIpc();
  registerJobsIpc();
  registerReceiptIpc();
  registerClipIpc();
  registerWindowIpc();
}

