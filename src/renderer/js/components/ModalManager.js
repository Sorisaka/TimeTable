'use strict';
/**
 * UI層: ModalManager
 * - 新規作成モーダル & 汎用モーダルの開閉
 * - 外部からは関数を呼び出すだけ（副作用はUI更新に限定）
 */
(function expose() {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const $backdrop = $('#modal-backdrop');

  function show(id) {
    $backdrop.classList.remove('hidden');
    const m = document.getElementById(id);
    m.classList.remove('hidden');
    m.setAttribute('aria-hidden', 'false');
  }
  function close(id) {
    const m = document.getElementById(id);
    m.classList.add('hidden');
    m.setAttribute('aria-hidden', 'true');
    if (![...$$('.modal')].some(el => !el.classList.contains('hidden'))) {
      $backdrop.classList.add('hidden');
    }
  }
  $backdrop.addEventListener('click', () => {
    $$('.modal').forEach(el => el.classList.add('hidden'));
    $backdrop.classList.add('hidden');
  });
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-close]');
    if (btn) close(btn.getAttribute('data-close'));
  });

  window.ModalManager = {
    show, close,
    // 新規作成モーダルの UI API
    initNewProjectRows(n) {
      const $rows = document.getElementById('wiz-rows');
      $rows.innerHTML = '';
      const clamp = Math.max(1, Math.min(10, n || 2));
      for (let i = 0; i < clamp; i++) {
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = `
          <span class="idx">${i + 1}日目</span>
          <input placeholder="ライブ名" data-key="liveName">
          <input placeholder="YYYY-MM-DD" data-key="date">
          <input placeholder="会場/場所" data-key="venue">
          <input placeholder="15:00" data-key="start">
          <input placeholder="2" type="number" min="0" data-key="intermissionCount">
          <input placeholder="45" type="number" min="1" data-key="intermissionMin">
          <input placeholder="15" type="number" min="1" data-key="defaultDurationMin">
          <input placeholder="22:00" data-key="clearOut">
        `;
        $rows.appendChild(row);
      }
    },
    collectNewProjectInput() {
      const title = (document.getElementById('wiz-title').value || '').trim() || 'Untitled';
      const rows = Array.from(document.querySelectorAll('#wiz-rows .row'));
      const dayInputs = rows.map((row, i) => {
        const get = (k) => row.querySelector(`input[data-key="${k}"]`).value.trim();
        const num = (k, fallback) => {
          const v = parseInt(get(k) || `${fallback}`, 10);
          return Number.isFinite(v) ? v : fallback;
        };
        return {
          label: `${i + 1}日目`,
          liveName: get('liveName'),
          date: get('date'),
          venue: get('venue'),
          start: get('start') || '12:00',
          intermissionCount: num('intermissionCount', 0),
          intermissionMin: num('intermissionMin', 45),
          defaultDurationMin: num('defaultDurationMin', 15),
          clearOut: get('clearOut')
        };
      });
      return { title, dayInputs };
    }
  };
})();
