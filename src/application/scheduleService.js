'use strict';
/**
 * アプリケーション層
 * - ドメイン関数を組み合わせ、UIに返すための派生データ（conflicts, highlights 等）を生成
 * - 副作用なし
 */

// ブラウザグローバルオブジェクトとして作成
window.ScheduleService = (function() {

// ScheduleOpsへの参照（グローバルオブジェクトから取得）
const Ops = window.ScheduleOps;

/**
 * 行追加
 */
function addRow(project, dayLabel, atIndex) {
  const p = Ops.addRow(project, dayLabel, atIndex);
  return { project: p, conflicts: Ops.detectConflicts(p) };
}

/**
 * 行削除
 */
function removeRow(project, dayLabel, atIndex) {
  const { project: p, removedBandId } = Ops.removeRow(project, dayLabel, atIndex);
  return { project: p, removedBandId, conflicts: Ops.detectConflicts(p) };
}

/**
 * ドラッグ&ドロップ配置（入れ替えは UI 側で index を指定して呼ぶ）
 */
function place(project, dayLabel, index, bandId) {
  const { project: p, removedBandId } = Ops.placeBand(project, dayLabel, index, bandId);
  return { project: p, removedBandId, conflicts: Ops.detectConflicts(p) };
}

/**
 * スワップ
 */
function swap(project, dayLabel, a, b) {
  const p = Ops.swap(project, dayLabel, a, b);
  return { project: p, conflicts: Ops.detectConflicts(p) };
}

/**
 * バンドにとって不可のスロット集合（ハイライト用）
 */
function unavailableSlots(project, dayLabel, bandId) {
  return Ops.calcUnavailableSlotsForBand(project, dayLabel, bandId);
}

/**
 * バンド一覧を可用合計の昇順でソート
 */
function sortBandsByAvailability(project) {
  const ids = (project.bands || []).map(b => b.id);
  ids.sort((a, b) => Ops.availabilityScore(project, a) - Ops.availabilityScore(project, b));
  return ids;
}

// パブリックAPIを返す
return { addRow, removeRow, place, swap, unavailableSlots, sortBandsByAvailability };

})(); // IIFE終了