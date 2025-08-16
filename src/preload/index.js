'use strict';
/**
 * Preload（Context Isolation 有効）
 * - Renderer に安全な IPC API を公開
 */
const { contextBridge, ipcRenderer } = require('electron');
const { IPC } = require('../shared/ipc.js');

contextBridge.exposeInMainWorld('electronAPI', {
  // Menu notifications
  onMenu: (handlers = {}) => {
    if (handlers.onNew)    ipcRenderer.on(IPC.MENU_NEW, handlers.onNew);
    if (handlers.onLoad)   ipcRenderer.on(IPC.MENU_LOAD, handlers.onLoad);
    if (handlers.onSave)   ipcRenderer.on(IPC.MENU_SAVE, handlers.onSave);
    if (handlers.onExport) ipcRenderer.on(IPC.MENU_EXPORT, handlers.onExport);
  },

  // Project lifecycle
  projectCreate: (wizardInput) => ipcRenderer.invoke(IPC.PROJECT_CREATE, wizardInput),
  openProject:   () => ipcRenderer.invoke(IPC.PROJECT_OPEN),
  saveProject:   (data) => ipcRenderer.invoke(IPC.PROJECT_SAVE, data),

  // Export
  exportImage: (rect) => ipcRenderer.invoke(IPC.EXPORT_IMAGE, { rect })
});
