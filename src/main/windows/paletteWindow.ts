import { BrowserWindow, shell } from 'electron';
import { join } from 'node:path';

let paletteWindow: BrowserWindow | undefined;

function loadPalette(win: BrowserWindow): void {
  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}?palette=1`);
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'), { query: { palette: '1' } });
  }
}

export function createPaletteWindow(): BrowserWindow {
  paletteWindow = new BrowserWindow({
    width: 760,
    height: 560,
    show: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    backgroundColor: '#0B0D10',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });
  paletteWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
  paletteWindow.on('blur', () => {
    paletteWindow?.hide();
  });
  paletteWindow.on('closed', () => {
    paletteWindow = undefined;
  });
  loadPalette(paletteWindow);
  return paletteWindow;
}

export function showPaletteWindow(): void {
  if (!paletteWindow) createPaletteWindow();
  paletteWindow?.show();
  paletteWindow?.focus();
  paletteWindow?.webContents.send('palette:focus');
}

export function hidePaletteWindow(): void {
  paletteWindow?.hide();
}

export function getPaletteWindow(): BrowserWindow | undefined {
  return paletteWindow;
}
