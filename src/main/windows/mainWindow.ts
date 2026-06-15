import { BrowserWindow, shell } from 'electron';
import { join } from 'node:path';

let mainWindow: BrowserWindow | undefined;

function loadWindow(win: BrowserWindow): void {
  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

export function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#0B0D10',
    title: 'MemeVault Desktop Suite',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('file:')) return { action: 'allow' };
    void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.on('closed', () => {
    mainWindow = undefined;
  });
  loadWindow(mainWindow);
  return mainWindow;
}

export function getMainWindow(): BrowserWindow | undefined {
  return mainWindow;
}

export function showMainWindow(): void {
  if (!mainWindow) createMainWindow();
  mainWindow?.show();
  mainWindow?.focus();
}
