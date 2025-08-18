'use strict';
/**
 * UIコントローラ（薄い副作用）
 * - 画面イベントを受けて Application 層を呼び出し、描画更新
 * - DnD開始時に不可スロットを灰色表示
 * - コンフリクト結果に応じてバンドブロックやスロットを赤表示
 */
(function bootstrap() {
  // グローバルオブジェクトから ScheduleService を取得
  const ScheduleService = window.ScheduleService;

  const state = {
    project: null,
    conflicts: []
  };

  // ---- 初期プロジェクト作成（メニューから） ----
  window.electronAPI.onMenu({
    onNew: () => {
      ModalManager.initNewProjectRows(2);
      ModalManager.show('modal-new');
    },
    onLoad: async () => {
      const res = await window.electronAPI.openProject();
      if (res?.ok) {
        state.project = res.data;
        rerender();
      }
    },
    onSave: async () => {
      await window.electronAPI.saveProject(state.project || { meta: { title: 'Untitled' } });
    },
    onExport: async () => {
      const rect = document.getElementById('timetable').getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const capture = { x: rect.x*dpr|0, y: rect.y*dpr|0, width: Math.ceil(rect.width*dpr), height: Math.ceil(rect.height*dpr) };
      await window.electronAPI.exportImage(capture);
    }
  });

  document.getElementById('wiz-generate').addEventListener('click', () => {
    const n = parseInt(document.getElementById('wiz-daycount').value || '2', 10);
    ModalManager.initNewProjectRows(n);
  });

  document.getElementById('wiz-create').addEventListener('click', async () => {
    const input = ModalManager.collectNewProjectInput();
    // サンプルバンド（DnD確認用）
    input.bands = [
      { id: 'b1', name: 'PK shampoo', durationMin: 15, availability: { '1日目':[13,14,15], '2日目':[10,11] } },
      { id: 'b2', name: 'Official髭男dism', durationMin: 20, availability: { '1日目':[13,15], '2日目':[10,11,12] } },
      { id: 'b3', name: 'King Gnu', durationMin: 15, availability: { '1日目':[14,16], '2日目':[11] } },
      { id: 'b4', name: 'indigo la end', durationMin: 25, availability: { '1日目':[15,16], '2日目':[12,13] } }
    ];
    const res = await window.electronAPI.projectCreate(input);
    if (res?.ok) {
      state.project = res.project;
      state.project.bands = input.bands;
      // とりあえず各日2行生成
      state.project.days.forEach(d => {
        const r1 = ScheduleService.addRow(state.project, d.label).project;
        const r2 = ScheduleService.addRow(r1, d.label).project;
        state.project = r2;
      });
      ModalManager.close('modal-new');
      rerender();
    }
  });

  // ---- Timetable 操作イベント ----
  document.addEventListener('slot-add', (e) => {
    const { day, at } = e.detail;
    state.project = ScheduleService.addRow(state.project, day, at).project;
    recompute();
  });

  document.addEventListener('slot-remove', (e) => {
    const { day, at } = e.detail;
    state.project = ScheduleService.removeRow(state.project, day, at).project;
    recompute();
  });

  document.addEventListener('slot-drop', (e) => {
    const { day, index, bandId } = e.detail;
    state.project = ScheduleService.place(state.project, day, index, bandId).project;
    recompute();
  });

  // ---- DnD: 不可帯ハイライト ----
  document.addEventListener('band-drag-start', (e) => {
    const bandId = e.detail.bandId;
    for (const d of state.project.days) {
      const set = ScheduleService.unavailableSlots(state.project, d.label, bandId);
      TimetableView.markUnavail(d.label, set);
    }
  });
  document.addEventListener('band-drag-end', () => {
    document.querySelectorAll('.slot.unavail').forEach(el => el.classList.remove('unavail'));
  });

  // ---- 再描画ヘルパ ----
  function recompute() {
    state.conflicts = ScheduleService.place(state.project, '__noop__', 0, undefined)?.conflicts || [];
    rerender();
  }
  function rerender() {
    // バンド一覧（可用合計の昇順）
    const sorted = ScheduleService.sortBandsByAvailability(state.project || { bands: [] });
    const conflictBandSet = new Set((state.conflicts||[]).map(c => c.bandId));
    BandBlock.render(state.project || { bands: [] }, sorted, conflictBandSet);
    TimetableView.render(state.project || { days: [], timetable: { days: [] } }, state.conflicts || []);
  }

  // 初期空描画
  rerender();
})();