'use strict';
/**
 * Preload（Context Bridge）
 * 責務:
 *  - Renderer に最小限の安全な API を公開（IPC のみ）
 *  - Renderer から Node/Electron API を直接触らせない
 */
const { contextBridge, ipcRenderer } = require('electron');
const { IPC } = require('../shared/ipc');

contextBridge.exposeInMainWorld('electronAPI', {
  /** メニュー通知の購読 */
  onMenu: (handlers = {}) => {
    if (handlers.onNew)    ipcRenderer.on(IPC.MENU_NEW, handlers.onNew);
    if (handlers.onLoad)   ipcRenderer.on(IPC.MENU_LOAD, handlers.onLoad);
    if (handlers.onSave)   ipcRenderer.on(IPC.MENU_SAVE, handlers.onSave);
    if (handlers.onExport) ipcRenderer.on(IPC.MENU_EXPORT, handlers.onExport);
  }
});
