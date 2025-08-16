'use strict';
/**
 * UI層（Renderer）
 * - 状態管理（最小）
 * - メニューイベント受信 → モーダル表示
 * - 新規作成ウィザード → IPC: project:create
 * - 読み込み/保存/書き出しの結線
 * - preload未ロード時でも落ちないようガードを追加
 */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const state = { project: null };

// ---------- Modal 基盤 ----------
const $backdrop = $('#modal-backdrop');
function showModal(id) {
  $backdrop.classList.remove('hidden');
  const m = document.getElementById(id);
  m.classList.remove('hidden');
  m.setAttribute('aria-hidden', 'false');
}
function closeModal(id) {
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
  if (btn) closeModal(btn.getAttribute('data-close'));
});

// ---------- 新規作成モーダル ----------
const $wizRows = $('#wiz-rows');
$('#wiz-generate').addEventListener('click', () => {
  const n = Math.max(1, Math.min(10, parseInt($('#wiz-daycount').value || '1', 10)));
  $wizRows.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
      <span class="idx">${i + 1}日目</span>
      <input placeholder="ライブ名" data-key="liveName">
      <input placeholder="YYYY-MM-DD(曜)" data-key="date">
      <input placeholder="会場/場所" data-key="venue">
      <input placeholder="12:00" data-key="loadIn">
      <input placeholder="13:00" data-key="rehearsal">
      <input placeholder="14:30" data-key="open">
      <input placeholder="15:00" data-key="start">
      <input placeholder="2" type="number" min="0" data-key="intermissionCount">
      <input placeholder="45" type="number" min="1" data-key="intermissionMin">
      <input placeholder="15" type="number" min="1" data-key="defaultDurationMin">
      <input placeholder="22:00" data-key="clearOut">
    `;
    $wizRows.appendChild(row);
  }
});
$('#wiz-create').addEventListener('click', async () => {
  const title = ($('#wiz-title').value || '').trim() || 'Untitled';
  const dayInputs = $$('.row', $wizRows).map((row, i) => {
    const get = (k) => $(`input[data-key="${k}"]`, row).value.trim();
    const num = (k, fallback) => {
      const v = parseInt(get(k) || `${fallback}`, 10);
      return Number.isFinite(v) ? v : fallback;
    };
    return {
      label: `${i + 1}日目`,
      liveName: get('liveName'),
      date: get('date'),
      venue: get('venue'),
      loadIn: get('loadIn'),
      rehearsal: get('rehearsal'),
      open: get('open'),
      start: get('start'),
      intermissionCount: num('intermissionCount', 0),
      intermissionMin: num('intermissionMin', 45),
      defaultDurationMin: num('defaultDurationMin', 15),
      clearOut: get('clearOut')
    };
  });

  if (window.electronAPI?.projectCreate) {
    const res = await window.electronAPI.projectCreate({ title, dayInputs });
    if (res?.ok) {
      state.project = res.project;
      renderProject();
      closeModal('modal-new');
    } else {
      alert(`作成に失敗しました: ${res?.error || 'unknown'}`);
    }
  } else {
    alert('preload が読み込まれていないため、作成できませんでした。');
  }
});

// ---------- 読み込み/保存/書き出し 用の簡易モーダル ----------
function openGenericModal(title, desc, actions = []) {
  $('#modal-generic-title').textContent = title;
  $('#modal-generic-desc').textContent = desc;
  const $actions = $('#modal-generic-actions');
  $actions.innerHTML = '';
  actions.forEach(({ label, onClick, kind }) => {
    const btn = document.createElement('button');
    btn.className = `btn ${kind || ''}`;
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    $actions.appendChild(btn);
  });
  showModal('modal-generic');
}

// ---------- レイアウト描画 ----------
function renderProject() {
  const p = state.project;
  $('#band-multi').innerHTML = '';
  $('#band-perday').innerHTML = '';

  const $table = $('#timetable');
  $table.innerHTML = '';
  if (!p?.days?.length) return;

  p.days.forEach((d) => {
    const col = document.createElement('div');
    col.className = 'day-column';
    col.innerHTML = `
      <div class="day-header">
        <div class="title">${d.extra?.liveName || p.meta?.title || ''}</div>
        <div class="meta">${d.label}｜${d.date || ''}｜${d.venue || ''}</div>
      </div>
      <div class="slot-list">
        <div class="slot placeholder">（ここにスロットが並びます）</div>
      </div>
    `;
    $table.appendChild(col);
  });
}

// ---------- Export（DOM → PNG） ----------
async function doExport() {
  const area = document.getElementById('timetable').getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const rect = {
    x: Math.floor(area.x * dpr),
    y: Math.floor(area.y * dpr),
    width: Math.ceil(area.width * dpr),
    height: Math.ceil(area.height * dpr)
  };
  if (!window.electronAPI?.exportImage) {
    alert('preload が読み込まれていないため、書き出しできません。');
    return;
  }
  const res = await window.electronAPI.exportImage(rect);
  if (!res?.ok && res?.error !== 'canceled') alert(`書き出しに失敗: ${res?.error || 'unknown'}`);
}

// ---------- メニューイベントの結線（preload存在チェック付き） ----------
const $preloadStatus = $('#preload-status');
if (window.electronAPI?.onMenu) {
  $preloadStatus.textContent = 'preload: OK';
  window.electronAPI.onMenu({
    onNew: () => {
      $('#wiz-daycount').value = '4';
      $('#wiz-generate').click();
      showModal('modal-new');
    },
    onLoad: () => {
      openGenericModal('プロジェクト読み込み', 'JSON を選択すると読み込みます。', [
        {
          label: 'ファイルを選ぶ…',
          kind: 'primary',
          onClick: async () => {
            const res = await window.electronAPI.openProject();
            if (res?.ok) {
              state.project = res.data;
              renderProject();
              closeModal('modal-generic');
            } else if (res?.error !== 'canceled') {
              alert(`読み込みに失敗: ${res?.error || 'unknown'}`);
            }
          }
        }
      ]);
    },
    onSave: () => {
      openGenericModal('プロジェクト保存', '現在のプロジェクトを JSON として保存します。', [
        {
          label: '保存する…',
          kind: 'primary',
          onClick: async () => {
            const res = await window.electronAPI.saveProject(state.project || { meta: { title: 'Untitled' } });
            if (!res?.ok && res?.error !== 'canceled') {
              alert(`保存に失敗: ${res?.error || 'unknown'}`);
            } else {
              closeModal('modal-generic');
            }
          }
        }
      ]);
    },
    onExport: () => {
      openGenericModal('画像書き出し', '表示中のテーブル領域を PNG として保存します。', [
        { label: '書き出す…', kind: 'primary', onClick: async () => { await doExport(); closeModal('modal-generic'); } }
      ]);
    }
  });
} else {
  $preloadStatus.textContent = 'preload: NG（DevToolsでエラーを確認）';
  console.error('preload が読み込まれていません。src/preload/index.js と src/shared/ipc.js の配置/パスを確認してください。');
}

// 初期描画
renderProject();
