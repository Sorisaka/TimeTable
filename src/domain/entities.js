'use strict';
/**
 * ドメインモデル（JSDoc 型注釈）
 */

/**
 * @typedef {string} DayLabel
 */

/**
 * Band
 * @typedef {Object} Band
 * @property {string} id
 * @property {string} name
 * @property {number} durationMin
 * @property {Record<DayLabel, number[]>} availability  // 可用: 日程ラベル -> 時(0..23)の配列
 */

/**
 * Day
 * @typedef {Object} Day
 * @property {DayLabel} label
 * @property {string} date
 * @property {string} venue
 * @property {string} start        // "HH:MM"（スロット時刻算出の起点）
 * @property {number[]} intermissions
 * @property {number} defaultDurationMin
 * @property {Object<string,any>} [extra]
 */

/**
 * Slot（可変長）
 * @typedef {Object} Slot
 * @property {number} index
 * @property {number} durationMin
 * @property {string=} bandId
 * @property {boolean=} isIntermission
 * @property {boolean=} isBreak
 */

/**
 * ScheduleForDay
 * @typedef {Object} ScheduleForDay
 * @property {DayLabel} label
 * @property {Slot[]} slots
 */

/**
 * Project
 * @typedef {Object} Project
 * @property {{title:string, createdAt:string}} meta
 * @property {Day[]} days
 * @property {Band[]} bands
 * @property {{days: ScheduleForDay[]}} timetable
 */

module.exports = {};
