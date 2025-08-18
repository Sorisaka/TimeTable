'use strict';
/**
 * ドメイン層: 純粋関数でタイムテーブル操作を提供
 * - ここでは外部I/Oを一切行わず、POJOを受け取りPOJOを返す
 */

// ブラウザグローバルオブジェクトとして作成
window.ScheduleOps = (function() {

/** shallow clone helper */
const clone = (o) => JSON.parse(JSON.stringify(o));

/**
 * プロジェクトにスケジュール日オブジェクトがなければ初期化
 * @param {import('./entities').Project} project
 * @returns {import('./entities').Project}
 */
function ensureSchedule(project) {
  const p = clone(project);
  if (!p.timetable || !Array.isArray(p.timetable.days)) {
    p.timetable = { days: [] };
  }
  const labels = p.days.map(d => d.label);
  for (const label of labels) {
    if (!p.timetable.days.find(d => d.label === label)) {
      p.timetable.days.push({ label, slots: [] });
    }
  }
  return p;
}

/**
 * 指定日へデフォルト演奏時間の行を挿入
 * @param {import('./entities').Project} project
 * @param {string} dayLabel
 * @param {number=} atIndex  省略時は末尾
 * @returns {import('./entities').Project}
 */
function addRow(project, dayLabel, atIndex) {
  const p = ensureSchedule(project);
  const day = p.days.find(d => d.label === dayLabel);
  const sched = p.timetable.days.find(d => d.label === dayLabel);
  if (!day || !sched) return p;

  const slot = { index: 0, durationMin: day.defaultDurationMin };
  const i = (typeof atIndex === 'number' && atIndex >= 0 && atIndex <= sched.slots.length)
    ? atIndex : sched.slots.length;

  sched.slots.splice(i, 0, slot);
  // インデックス再計算
  sched.slots.forEach((s, idx) => { s.index = idx; });
  return p;
}

/**
 * 指定日の行削除
 * @param {import('./entities').Project} project
 * @param {string} dayLabel
 * @param {number} atIndex
 * @returns {{project: import('./entities').Project, removedBandId?: string}}
 */
function removeRow(project, dayLabel, atIndex) {
  const p = ensureSchedule(project);
  const sched = p.timetable.days.find(d => d.label === dayLabel);
  if (!sched) return { project: p };
  if (atIndex < 0 || atIndex >= sched.slots.length) return { project: p };
  const [removed] = sched.slots.splice(atIndex, 1);
  sched.slots.forEach((s, idx) => { s.index = idx; });
  return { project: p, removedBandId: removed?.bandId };
}

/**
 * 行にバンドを配置（既存がいれば入れ替え）
 *  - スロット長をそのバンドの演奏時間へ変更
 * @param {import('./entities').Project} project
 * @param {string} dayLabel
 * @param {number} index
 * @param {string} bandId
 * @returns {import('./entities').Project}
 */
function placeBand(project, dayLabel, index, bandId) {
  const p = ensureSchedule(project);
  const band = p.bands.find(b => b.id === bandId);
  const day = p.days.find(d => d.label === dayLabel);
  const sched = p.timetable.days.find(d => d.label === dayLabel);
  if (!band || !day || !sched) return p;
  if (index < 0 || index >= sched.slots.length) return p;

  const target = sched.slots[index];
  // 入れ替え: 既存バンドがいたら palette に戻った扱い
  target.bandId = band.id;
  target.durationMin = band.durationMin || day.defaultDurationMin;
  return p;
}

/**
 * 2スロットの入れ替え（同一日想定）
 * @param {import('./entities').Project} project
 * @param {string} dayLabel
 * @param {number} indexA
 * @param {number} indexB
 * @returns {import('./entities').Project}
 */
function swap(project, dayLabel, indexA, indexB) {
  const p = ensureSchedule(project);
  const sched = p.timetable.days.find(d => d.label === dayLabel);
  if (!sched) return p;
  if ([indexA, indexB].some(i => i < 0 || i >= sched.slots.length)) return p;
  const a = sched.slots[indexA];
  const b = sched.slots[indexB];
  const tmp = clone(a);
  sched.slots[indexA] = clone(b);
  sched.slots[indexB] = tmp;
  // index整合
  sched.slots.forEach((s, idx) => s.index = idx);
  return p;
}

/**
 * スロット開始分（Day.start からの経過分）を計算
 * @param {import('./entities').Project} project
 * @param {string} dayLabel
 * @returns {number[]} startMins  // slots[i] の開始分
 */
function calcStartMins(project, dayLabel) {
  const p = ensureSchedule(project);
  const day = p.days.find(d => d.label === dayLabel);
  const sched = p.timetable.days.find(d => d.label === dayLabel);
  if (!day || !sched) return [];
  const starts = [];
  let acc = 0;
  for (const slot of sched.slots) {
    starts.push(acc);
    acc += slot.durationMin || day.defaultDurationMin;
  }
  return starts;
}

/**
 * あるスロットがカバーする「時」整数集合を得る（開始分からdurationを考慮）
 * @param {number} startMin
 * @param {number} durationMin
 * @param {number} startHourOfDay  // Day.start の時
 * @returns {Set<number>}
 */
function hoursCovered(startMin, durationMin, startHourOfDay) {
  const begin = startHourOfDay * 60 + startMin;
  const end = begin + durationMin - 1;
  const hs = new Set();
  for (let m = begin; m <= end; m += 60) {
    hs.add(Math.floor(m / 60) % 24);
  }
  return hs;
}

/**
 * コンフリクト検出
 * - バンドが可用でない時間帯を跨いだら CONFLICT を返す
 * @param {import('./entities').Project} project
 * @returns {Array<{day:string,index:number,bandId:string,type:'UNAVAILABLE'}>}
 */
function detectConflicts(project) {
  const p = ensureSchedule(project);
  const results = [];
  for (const d of p.days) {
    const sched = p.timetable.days.find(x => x.label === d.label);
    if (!sched) continue;
    const starts = calcStartMins(p, d.label);
    const startHour = parseInt((d.start || '10:00').split(':')[0], 10) || 10;
    sched.slots.forEach((s, i) => {
      if (!s.bandId) return;
      const band = p.bands.find(b => b.id === s.bandId);
      if (!band) return;
      const covered = hoursCovered(starts[i], s.durationMin || d.defaultDurationMin, startHour);
      const avail = new Set((band.availability?.[d.label] || []));
      for (const h of covered) {
        if (!avail.has(h)) {
          results.push({ day: d.label, index: i, bandId: band.id, type: 'UNAVAILABLE' });
          break;
        }
      }
    });
  }
  return results;
}

/**
 * 指定バンドにとって不可のスロット index 集合（開始時刻の hour で判定）
 * @param {import('./entities').Project} project
 * @param {string} dayLabel
 * @param {string} bandId
 * @returns {Set<number>}
 */
function calcUnavailableSlotsForBand(project, dayLabel, bandId) {
  const p = ensureSchedule(project);
  const d = p.days.find(x => x.label === dayLabel);
  const sched = p.timetable.days.find(x => x.label === dayLabel);
  const band = p.bands.find(b => b.id === bandId);
  const set = new Set();
  if (!d || !sched || !band) return set;

  const starts = calcStartMins(p, dayLabel);
  const startHour = parseInt((d.start || '10:00').split(':')[0], 10) || 10;
  const avail = new Set(band.availability?.[dayLabel] || []);
  sched.slots.forEach((_s, i) => {
    const hour = Math.floor((startHour * 60 + starts[i]) / 60) % 24;
    if (!avail.has(hour)) set.add(i);
  });
  return set;
}

/**
 * バンドの可用時間合計（ソート用）
 * @param {import('./entities').Project} project
 * @param {string} bandId
 * @returns {number}
 */
function availabilityScore(project, bandId) {
  const band = (project.bands || []).find(b => b.id === bandId);
  if (!band) return 0;
  return Object.values(band.availability || {}).reduce((acc, arr) => acc + (arr?.length || 0), 0);
}

// パブリックAPIを返す
return {
  ensureSchedule,
  addRow, removeRow, placeBand, swap,
  calcStartMins, calcUnavailableSlotsForBand,
  detectConflicts, availabilityScore
};

})(); // IIFE終了