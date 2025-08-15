'use strict';
/**
 * アプリケーション層: ProjectService
 * 責務:
 *  - 新規作成ウィザード入力から Project を構築
 *  - CSV文字列 → Band 配列へ変換（DTO/Domain行き来も担当）
 */
const { parseCsv } = require('../datasource/csvParser');
const { bandFromDTO, bandToDTO } = require('../domain/models');

/**
 * @param {{title:string, dayInputs:{label:string, date?:string, venue?:string, intermissions?:number[], defaultDurationMin?:number}[]}} input
 * @returns {import('../domain/models').Project}
 */
function createProjectFromWizard(input) {
  const now = new Date().toISOString();
  const days = input.dayInputs.map(d => ({
    label: d.label,
    date: d.date || '',
    venue: d.venue || '',
    intermissions: Array.isArray(d.intermissions) ? d.intermissions.slice() : [],
    defaultDurationMin: Number.isFinite(d.defaultDurationMin) ? d.defaultDurationMin : 15
  }));
  return {
    meta: { title: input.title || 'Untitled', createdAt: now },
    days,
    bands: [],
    timetable: []
  };
}

/**
 * CSVテキストを解析し、Band配列（Domain）と days を返す。
 * 解析エラーは errors に格納（致命的かどうかの判定は呼び出し側）。
 * @param {string} csvText
 * @returns {{bands: import('../domain/models').Band[], bandsDTO: import('../domain/models').BandDTO[], days:string[], errors:string[]}}
 */
function parseCsvToBandsDTO(csvText) {
  const { bandsDTO, days, errors } = parseCsv(csvText);
  // Domain化（Map/Setへ）
  const bands = bandsDTO.map(bandFromDTO);
  // DTOはIPC返却用にそのまま付与
  return { bands, bandsDTO: bands.map(bandToDTO), days, errors };
}

module.exports = {
  createProjectFromWizard,
  parseCsvToBandsDTO
};
