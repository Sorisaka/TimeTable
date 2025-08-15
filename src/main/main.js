'use strict';
/**
 * Mainプロセス
 * 責務:
 *  - BrowserWindow生成（セキュリティ設定: contextIsolation, sandbox 等）
 *  - メニュー構築（Rendererへ安全な通知送出）
 *  - 必要最低限のIPCハンドラ登録（今回は空画面起動が目的のため最小）
 */
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { IPC } = require('../shared/ipc');

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
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    title: 'Live Timetable (Minimal)',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,   // Renderer と分離
      nodeIntegration: false,   // window.require 不可
      sandbox: true,            // 追加の分離
      enableRemoteModule: false // 明示的に無効
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());

  // メニュー
  buildMenu(mainWindow);
}

// アプリライフサイクル
app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});