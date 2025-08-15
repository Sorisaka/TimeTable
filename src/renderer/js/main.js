'use strict';
/**
 * Renderer エントリ（最小）
 * - メニューイベント受信のみ
 */
(function bootstrap() {
  const $app = document.getElementById('app');

  function log(msg, obj) {
    console.log(`[menu] ${msg}`, obj ?? '');
    const pre = document.createElement('pre');
    pre.className = 'log';
    pre.textContent = `[${new Date().toLocaleTimeString()}] ${msg}\n` + (obj ? JSON.stringify(obj, null, 2) : '');
    $app.appendChild(pre);
  }

  window.electronAPI?.onMenu({
    onNew:    () => log('menu:new'),
    onLoad:   () => log('menu:load'),
    onSave:   () => log('menu:save'),
    onExport: () => log('menu:export'),
    onImportCsv: async () => {
      const res = await window.electronAPI.importCsvViaDialog();
      log('csv:importDialog result', res);
    }
  });

  console.log('[renderer] loaded');
})();
