'use strict';
/**
 * データソース層: CSVパーサ
 * 列仕様: バンド名, 演奏時間(分), 1日目_10, 1日目_11, ...
 * 値: 可用=1 / 不可=0 / 空欄可
 * 厳格バリデーション: 列名の形式/値域/必須列/数値性
 */
const Papa = require('papaparse');

/**
 * @typedef {Object} CsvParseResult
 * @property {Array<{name:string, durationMin:number, availability:Record<string, number[]>}>} bandsDTO
 * @property {string[]} days
 * @property {string[]} errors
 */

/**
 * CSV文字列を解析して BandDTO 配列を返す
 * @param {string} raw
 * @returns {CsvParseResult}
 */
function parseCsv(raw) {
  const errors = [];
  const out = { bandsDTO: [], days: [], errors };

  const parsed = Papa.parse(raw, { header: true, skipEmptyLines: true });
  if (parsed.errors && parsed.errors.length) {
    errors.push(...parsed.errors.map(e => `CSV構文エラー(row:${e.row}): ${e.message}`));
    return out;
  }
  const rows = parsed.data;
  const fields = parsed.meta.fields || [];

  // 必須列
  const NAME_COL = fields.find(c => /^(バンド名|name)$/i.test(c));
  const DUR_COL  = fields.find(c => /^演奏時間\(分\)|duration|min|time$/i.test(c));
  if (!NAME_COL) errors.push('必須列「バンド名」が見つかりません。');
  if (!DUR_COL)  errors.push('必須列「演奏時間(分)」が見つかりません。');

  // 形式: "<N>日目_<HH>"
  const availCols = fields.filter(c => /^(\d+)日目_(\d{1,2})$/.test(c));
  if (availCols.length === 0) {
    errors.push('可用時間列（例: "1日目_10"）が1つも見つかりません。');
  }

  // 日付ラベル抽出（順序維持）
  const dayOrder = [];
  for (const c of availCols) {
    const m = c.match(/^(\d+)日目_(\d{1,2})$/);
    if (m) {
      const label = `${m[1]}日目`;
      if (!dayOrder.includes(label)) dayOrder.push(label);
    }
  }
  out.days = dayOrder;

  // 値チェック + 収集
  rows.forEach((row, i) => {
    const name = `${row[NAME_COL] ?? ''}`.trim();
    if (!name) {
      errors.push(`行${i + 2}: バンド名が空です。`);
      return;
    }
    const durRaw = `${row[DUR_COL] ?? ''}`.trim();
    if (!/^\d+$/.test(durRaw)) {
      errors.push(`行${i + 2}: 演奏時間(分)が整数ではありません -> "${durRaw}"`);
      return;
    }
    const durationMin = Number(durRaw);
    if (durationMin <= 0 || durationMin > 240) {
      errors.push(`行${i + 2}: 演奏時間(分)が不正です（1..240）-> ${durationMin}`);
      return;
    }

    /** @type {Record<string, number[]>} */
    const availability = {};
    for (const c of availCols) {
      const m = c.match(/^(\d+)日目_(\d{1,2})$/);
      if (!m) continue;
      const dayLabel = `${m[1]}日目`;
      const hour = Number(m[2]);

      const val = `${row[c] ?? ''}`.trim();
      if (val === '') continue; // 空欄許容
      if (!(val === '0' || val === '1')) {
        errors.push(`行${i + 2}, 列「${c}」: 値は 0/1/空 のいずれかである必要があります（"${val}"）`);
        continue;
      }
      if (hour < 0 || hour > 23) {
        errors.push(`列「${c}」: 時は 0..23 の範囲である必要があります（${hour}）`);
        continue;
      }
      if (val === '1') {
        if (!availability[dayLabel]) availability[dayLabel] = [];
        availability[dayLabel].push(hour);
      }
    }

    out.bandsDTO.push({ name, durationMin, availability });
  });

  return out;
}

module.exports = { parseCsv };
