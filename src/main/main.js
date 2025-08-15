'use strict';
/**
 * Mainプロセス
 * 責務:
 *  - BrowserWindow生成（セキュリティ設定）
 *  - メニュー構築（Rendererへ通知）
 *  - IPCハンドラ: CSV読み込み（ダイアログ→解析→DTO返却）
 */
const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { IPC } = require('../shared/ipc');
const { parseCsvToBandsDTO } = require('../application/projectService');

let mainWindow;

/** メニューを構築して適用 */
function buildMenu(win) {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'New', accelerator: 'CmdOrCtrl+N', click: () => win.webContents.send(IPC.MENU_NEW) },
        { label: 'Open…', accelerator: 'CmdOrCtrl+O', click: () => win.webContents.send(IPC.MENU_LOAD) },
        { label: 'Save…', accelerator: 'CmdOrCtrl+S', click: () => win.webContents.send(IPC.MENU_SAVE) },
        { type: 'separator' },
        { label: 'Import CSV…', accelerator: 'CmdOrCtrl+I', click: () => win.webContents.send(IPC.MENU_IMPORT_CSV) },
        { label: 'Export…', accelerator: 'CmdOrCtrl+E', click: () => win.webContents.send(IPC.MENU_EXPORT) },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/** BrowserWindow を作成 */
function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    title: 'Live Timetable',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      enableRemoteModule: false
    }
  });
  win.loadFile(path.join(__dirname, '../renderer/index.html'));
  win.once('ready-to-show', () => win.show());
  buildMenu(win);
  mainWindow = win;
}

// ===== IPC: CSV 読み込み（ダイアログ） =====
ipcMain.handle(IPC.CSV_IMPORT_DIALOG, async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  });
  if (canceled || filePaths.length === 0) return { ok: false, error: 'canceled' };
  try {
    const raw = fs.readFileSync(filePaths[0], 'utf-8');
    const result = parseCsvToBandsDTO(raw);
    return { ok: true, path: filePaths[0], ...result };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
});

// ===== アプリライフサイクル =====
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
