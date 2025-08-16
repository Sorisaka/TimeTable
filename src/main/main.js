'use strict';
/**
 * Mainプロセス
 * - BrowserWindow生成（セキュア設定）
 * - メニュー構築（Rendererへ通知）
 * - IPCハンドラ（project:create/open/save, export:image）
 */
const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { IPC, isRect } = require('../shared/ipc');

// ---- Application層（簡易ユースケース） -------------------------------------
function createProjectFromWizard(input) {
  const now = new Date().toISOString();
  const days = (input?.dayInputs || []).map(d => {
    const count = Number.isFinite(d.intermissionCount) ? d.intermissionCount : 0;
    const len = Number.isFinite(d.intermissionMin) ? d.intermissionMin : 45;
    return {
      label: d.label,
      date: d.date || '',
      venue: d.venue || '',
      intermissions: Array.from({ length: count }, () => len),
      defaultDurationMin: Number.isFinite(d.defaultDurationMin) ? d.defaultDurationMin : 15,
      extra: {
        liveName: d.liveName || '',
        weekday: d.weekday || '',
        loadIn: d.loadIn || '',
        rehearsal: d.rehearsal || '',
        open: d.open || '',
        start: d.start || '',
        clearOut: d.clearOut || ''
      }
    };
  });

  return {
    meta: { title: input?.title || 'Untitled', createdAt: now },
    days,
    bands: [],
    timetable: []
  };
}
// ----------------------------------------------------------------------------

let mainWindow;

/** メニュー構築 */
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
        { role: 'resetZoom', label: 'ズーム 100%' },
        { role: 'zoomIn', label: 'ズームイン' },
        { role: 'zoomOut', label: 'ズームアウト' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'フルスクリーン' }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/** BrowserWindow を作成 */
function createWindow() {
  const preloadPath = path.join(__dirname, '..', 'preload', 'index.js'); // 正規化（Windowsでも安全）
  const htmlPath = path.join(__dirname, '..', 'renderer', 'index.html');

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'ライブのタイムテーブル',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      enableRemoteModule: false
    }
  });

  win.loadFile(htmlPath);
  win.once('ready-to-show', () => win.show());
  buildMenu(win);
  mainWindow = win;
}

// ===== IPC ハンドラ =====
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
    fs.writeFileSync(filePath, JSON.stringify(data ?? {}, null, 2), 'utf-8');
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

// ライフサイクル
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
