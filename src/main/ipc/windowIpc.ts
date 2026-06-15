import { ipcMain } from 'electron';
import { getMainWindow, showMainWindow } from '../windows/mainWindow';
import { hidePaletteWindow, showPaletteWindow } from '../windows/paletteWindow';

export function registerWindowIpc(): void {
  ipcMain.handle('window:showMain', () => {
    showMainWindow();
    return { ok: true };
  });
  ipcMain.handle('window:showPalette', () => {
    showPaletteWindow();
    return { ok: true };
  });
  ipcMain.handle('window:hidePalette', () => {
    hidePaletteWindow();
    return { ok: true };
  });
  ipcMain.handle('window:openAsset', (_event, payload) => {
    const win = getMainWindow();
    showMainWindow();
    win?.webContents.send('window:openAsset', payload);
    return { ok: true };
  });
}

