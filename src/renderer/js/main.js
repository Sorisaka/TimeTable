'use strict';
/**
 * Renderer エントリ
 * 責務:
 *  - 画面初期化
 *  - preload で公開された API を介してメニュー通知を受け取り、ログ表示（最小動作）
 */
(function bootstrap() {
  const $app = document.getElementById('app');

  function log(msg) {
    console.log(`[menu] ${msg}`);
    const p = document.createElement('p');
    p.className = 'log';
    p.textContent = `イベント受信: ${msg}`;
    $app.appendChild(p);
  }

  // メニューイベント購読（preload経由）
  window.electronAPI?.onMenu({
    onNew:   () => log('menu:new'),
    onLoad:  () => log('menu:load'),
    onSave:  () => log('menu:save'),
    onExport:() => log('menu:export')
  });

  // 初期描画
  console.log('[renderer] loaded');
})();
