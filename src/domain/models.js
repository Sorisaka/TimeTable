'use strict';
/**
 * ドメインモデル（JSDoc）
 */

/**
 * @typedef {string} DayLabel
 */

/**
 * Band
 * @typedef {Object} Band
 * @property {string} name
 * @property {number} durationMin
 * @property {Map<DayLabel, Set<number>>} availability  可用: dayLabel -> 時台(例: 10, 11, ...)
 */

/**
 * Day
 * @typedef {Object} Day
 * @property {DayLabel} label
 * @property {string} date     ISO (YYYY-MM-DD) 推奨
 * @property {string} venue
 * @property {number[]} intermissions 分単位（[45, 30, ...]）
 * @property {number} defaultDurationMin
 */

/**
 * Slot
 * @typedef {Object} Slot
 * @property {DayLabel} dayLabel
 * @property {number} index
 * @property {string} start   "HH:MM"
 * @property {string} end     "HH:MM"
 * @property {boolean} isIntermission
 * @property {boolean} isBreak
 */

/**
 * Project
 * @typedef {Object} Project
 * @property {{title:string, createdAt:string}} meta
 * @property {Day[]} days
 * @property {Band[]} bands
 * @property {Slot[]} timetable
 */

/**
 * Band DTO（IPC越境用に Map/Set をフラット化）
 * @typedef {Object} BandDTO
 * @property {string} name
 * @property {number} durationMin
 * @property {Record<DayLabel, number[]>} availability
 */

/**
 * @param {Band} band
 * @returns {BandDTO}
 */
function bandToDTO(band) {
  const avail = {};
  for (const [label, hours] of band.availability.entries()) {
    avail[label] = Array.from(hours.values()).sort((a, b) => a - b);
  }
  return { name: band.name, durationMin: band.durationMin, availability: avail };
}

/**
 * @param {BandDTO} dto
 * @returns {Band}
 */
function bandFromDTO(dto) {
  const m = new Map();
  for (const k of Object.keys(dto.availability || {})) {
    m.set(k, new Set(dto.availability[k] || []));
  }
  return { name: dto.name, durationMin: dto.durationMin, availability: m };
}

module.exports = { bandToDTO, bandFromDTO };
