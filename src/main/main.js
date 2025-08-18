'use strict';
/**
 * Mainプロセス
 * 責務:
 *  - BrowserWindow生成（セキュア設定）
 *  - ネイティブメニュー（Rendererへ通知）
 *  - IPCハンドラ: project:create/open/save, export:image
 */
const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { IPC, isRect } = require('../shared/ipc');

function createProjectFromWizard(input) {
  const now = new Date().toISOString();
  const days = (input.dayInputs || []).map(d => {
    const count = Number.isFinite(d.intermissionCount) ? d.intermissionCount : 0;
    const len = Number.isFinite(d.intermissionMin) ? d.intermissionMin : 45;
    return {
      label: d.label,
      date: d.date || '',
      venue: d.venue || '',
      start: d.start || '12:00', // 便宜的に開始時刻を保持（DnDの不可帯表示に利用）
      intermissions: Array.from({ length: count }, () => len),
      defaultDurationMin: Number.isFinite(d.defaultDurationMin) ? d.defaultDurationMin : 15,
      extra: {
        liveName: d.liveName || '',
        open: d.open || '',
        clearOut: d.clearOut || ''
      }
    };
  });
  return {
    meta: { title: input.title || 'Untitled', createdAt: now },
    days,
    bands: input.bands || [],    // UIでサンプル追加可
    timetable: []                // Application層で日毎に slots を生成していく
  };
}

let mainWindow;

function buildMenu(win) {
  const template = [
    {
      label: 'ファイル',
      submenu: [
        { label: '新規作成', accelerator: 'CmdOrCtrl+N', click: () => win.webContents.send(IPC.MENU_NEW) },
        { label: '読み込み…', accelerator: 'CmdOrCtrl+O', click: () => win.webContents.send(IPC.MENU_LOAD) },
        { label: '保存…', accelerator: 'CmdOrCtrl+S', click: () => win.webContents.send(IPC.MENU_SAVE) },
        { type: 'separator' },
        { label: '書き出し…', accelerator: 'CmdOrCtrl+E', click: () => win.webContents.send(IPC.MENU_EXPORT) },
        { type: 'separator' },
        { role: 'quit', label: '終了' }
      ]
    },
    {
      label: '表示',
      submenu: [
        { role: 'reload', label: '再読み込み' },
        { role: 'toggleDevTools', label: '開発者ツール' },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    title: 'ライブのタイムテーブル',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // レンダラープロセスの制限を撤去
      // セキュリティ的に良くないが、インターネットに繋がないためfalseに変更
      sandbox: false,
      enableRemoteModule: false
    }
  });
  win.loadFile(path.join(__dirname, '../renderer/index.html'));
  win.once('ready-to-show', () => win.show());
  buildMenu(win);
  mainWindow = win;
}

// ===== IPC =====
ipcMain.handle(IPC.PROJECT_CREATE, async (_evt, payload) => {
  try {
    const project = createProjectFromWizard(payload || {});
    return { ok: true, project };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
});

ipcMain.handle(IPC.PROJECT_OPEN, async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Project JSON', extensions: ['json'] }]
  });
  if (canceled || filePaths.length === 0) return { ok: false, error: 'canceled' };
  try {
    const json = fs.readFileSync(filePaths[0], 'utf-8');
    const data = JSON.parse(json);
    return { ok: true, path: filePaths[0], data };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
});

ipcMain.handle(IPC.PROJECT_SAVE, async (_evt, data) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'timetable.json',
    filters: [{ name: 'Project JSON', extensions: ['json'] }]
  });
  if (canceled || !filePath) return { ok: false, error: 'canceled' };
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return { ok: true, path: filePath };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
});

ipcMain.handle(IPC.EXPORT_IMAGE, async (_evt, { rect }) => {
  if (!isRect(rect)) return { ok: false, error: 'invalid rect' };
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'timetable.png',
    filters: [{ name: 'PNG', extensions: ['png'] }]
  });
  if (canceled || !filePath) return { ok: false, error: 'canceled' };
  const image = await mainWindow.webContents.capturePage(rect);
  fs.writeFileSync(filePath, image.toPNG());
  return { ok: true, path: filePath };
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
