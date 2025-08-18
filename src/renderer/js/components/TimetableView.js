'use strict';
/**
 * UI層: TimetableView
 * - 日程列/スロットの描画
 * - 追加/削除ボタン、DnD受け入れ、不可帯の灰色表示
 * - できるだけ薄く保ち、実処理は AppController に委譲
 */
(function expose() {
  const $table = document.getElementById('timetable');

  function render(project, conflicts = []) {
    $table.innerHTML = '';
    const conflictKey = new Set(conflicts.map(c => `${c.day}:${c.index}`));

    project.days.forEach((d) => {
      const sched = (project.timetable?.days || []).find(x => x.label === d.label) || { slots: [] };

      const col = document.createElement('div');
      col.className = 'day-column';
      col.innerHTML = `
        <div class="day-header">
          <div class="title">${d.extra?.liveName || project.meta?.title || ''}</div>
          <div class="meta">${d.label}｜${d.date || ''}｜${d.venue || ''}</div>
        </div>
      `;
      const list = document.createElement('div');
      list.className = 'slot-list';

      // 各スロット
      sched.slots.forEach((s, i) => {
        const slot = document.createElement('div');
        slot.className = 'slot';
        if (conflictKey.has(`${d.label}:${i}`)) slot.classList.add('conflict');
        slot.dataset.day = d.label;
        slot.dataset.index = String(i);

        // 左端境界の追加ボタン
        const addBtn = document.createElement('button');
        addBtn.className = 'rc-btn rc-add';
        addBtn.textContent = '+';
        addBtn.title = 'ここに行を追加';
        addBtn.addEventListener('click', () => document.dispatchEvent(
          new CustomEvent('slot-add', { detail: { day: d.label, at: i } })
        ));
        slot.appendChild(addBtn);

        // 左端中央の削除ボタン
        const controls = document.createElement('div');
        controls.className = 'row-controls';
        const del = document.createElement('button');
        del.className = 'rc-btn';
        del.textContent = '−';
        del.title = 'この行を削除';
        del.addEventListener('click', () => document.dispatchEvent(
          new CustomEvent('slot-remove', { detail: { day: d.label, at: i } })
        ));
        controls.appendChild(del);
        slot.appendChild(controls);

        // DnD
        slot.addEventListener('dragover', (e) => { e.preventDefault(); });
        slot.addEventListener('drop', (e) => {
          e.preventDefault();
          const bandId = e.dataTransfer.getData('text/plain');
          document.dispatchEvent(new CustomEvent('slot-drop', { detail: { day: d.label, index: i, bandId } }));
        });

        const label = document.createElement('div');
        label.className = 'label';
        label.textContent = `#${i+1}`;
        const bandDiv = document.createElement('div');
        bandDiv.className = 'band';
        const bandName = (project.bands || []).find(b => b.id === s.bandId)?.name || '—';
        bandDiv.textContent = `${bandName}（${s.durationMin}min）`;

        slot.appendChild(label);
        slot.appendChild(bandDiv);
        list.appendChild(slot);
      });

      // 末尾に追加ボタン
      const addTail = document.createElement('div');
      addTail.className = 'slot';
      addTail.innerHTML = `<div class="label">＋</div><div class="band">末尾に行を追加</div>`;
      addTail.addEventListener('click', () => document.dispatchEvent(
        new CustomEvent('slot-add', { detail: { day: d.label, at: (sched.slots.length) } })
      ));
      list.appendChild(addTail);

      col.appendChild(list);
      $table.appendChild(col);
    });
  }

  /**
   * 不可スロットの灰色ハイライト切替
   * @param {string} dayLabel
   * @param {Set<number>} set
   */
  function markUnavail(dayLabel, set) {
    document.querySelectorAll(`.slot[data-day="${dayLabel}"]`).forEach(el => {
      const idx = Number(el.dataset.index);
      if (Number.isFinite(idx)) {
        if (set.has(idx)) el.classList.add('unavail'); else el.classList.remove('unavail');
      }
    });
  }

  window.TimetableView = { render, markUnavail };
})();
