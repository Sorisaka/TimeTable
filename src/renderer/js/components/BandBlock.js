'use strict';
/**
 * UI層: BandBlock
 * - バンド一覧の描画と DnD 発火
 * - 並び順は「出演可能時間合計の昇順」
 */
(function expose() {
  const $multi = document.getElementById('band-multi');
  const $perday = document.getElementById('band-perday');

  function render(project, sortedIds, conflicts = new Set()) {
    const mk = (band) => {
      const el = document.createElement('div');
      el.className = 'band-chip' + (conflicts.has(band.id) ? ' conflict' : '');
      el.textContent = band.name;
      const mini = document.createElement('span');
      mini.className = 'mini';
      const totalAvail = Object.values(band.availability||{}).reduce((a,b)=>a+(b?.length||0),0);
      mini.textContent = `(${totalAvail}h)`;
      el.appendChild(mini);
      el.setAttribute('draggable', 'true');
      el.dataset.bandId = band.id;
      el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', band.id);
        document.dispatchEvent(new CustomEvent('band-drag-start', { detail: { bandId: band.id } }));
      });
      el.addEventListener('dragend', () => {
        document.dispatchEvent(new CustomEvent('band-drag-end'));
      });
      return el;
    };

    $multi.innerHTML = '';
    $perday.innerHTML = '';
    const byId = new Map(project.bands.map(b => [b.id, b]));
    sortedIds.forEach(id => $multi.appendChild(mk(byId.get(id))));
    // このサンプルでは per-day 専用の区別は未導入（将来の割当）
  }

  window.BandBlock = { render };
})();
