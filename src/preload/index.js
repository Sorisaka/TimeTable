'use strict';
/**
 * Preload（ContextBridge）
 * - Renderer に安全な最小 API を公開
 */
const { contextBridge, ipcRenderer } = require('electron');
const { IPC } = require('../shared/ipc');

contextBridge.exposeInMainWorld('electronAPI', {
  onMenu: (handlers = {}) => {
    if (handlers.onNew)    ipcRenderer.on(IPC.MENU_NEW, handlers.onNew);
    if (handlers.onLoad)   ipcRenderer.on(IPC.MENU_LOAD, handlers.onLoad);
    if (handlers.onSave)   ipcRenderer.on(IPC.MENU_SAVE, handlers.onSave);
    if (handlers.onExport) ipcRenderer.on(IPC.MENU_EXPORT, handlers.onExport);
  },
  projectCreate: (wizardInput) => ipcRenderer.invoke(IPC.PROJECT_CREATE, wizardInput),
  openProject:   () => ipcRenderer.invoke(IPC.PROJECT_OPEN),
  saveProject:   (data) => ipcRenderer.invoke(IPC.PROJECT_SAVE, data),
  exportImage:   (rect) => ipcRenderer.invoke(IPC.EXPORT_IMAGE, { rect })
});
