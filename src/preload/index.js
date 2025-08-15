'use strict';
/**
 * Preload（Context Bridge）
 * 責務:
 *  - Renderer に安全な IPC API を公開
 */
const { contextBridge, ipcRenderer } = require('electron');
const { IPC } = require('../shared/ipc');

contextBridge.exposeInMainWorld('electronAPI', {
  // メニュー通知の購読
  onMenu: (handlers = {}) => {
    if (handlers.onNew)         ipcRenderer.on(IPC.MENU_NEW, handlers.onNew);
    if (handlers.onLoad)        ipcRenderer.on(IPC.MENU_LOAD, handlers.onLoad);
    if (handlers.onSave)        ipcRenderer.on(IPC.MENU_SAVE, handlers.onSave);
    if (handlers.onExport)      ipcRenderer.on(IPC.MENU_EXPORT, handlers.onExport);
    if (handlers.onImportCsv)   ipcRenderer.on(IPC.MENU_IMPORT_CSV, handlers.onImportCsv);
  },
  // CSV 読み込み（ダイアログ→DTO返却）
  importCsvViaDialog: () => ipcRenderer.invoke(IPC.CSV_IMPORT_DIALOG)
});
