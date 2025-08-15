'use strict';
/**
 * IPC 契約定義（Contract）
 * - 方向:
 *   - send: Main -> Renderer
 *   - invoke: Renderer -> Main
 */
const IPC = {
  // Menu notifications (send)
  MENU_NEW: 'menu:new',
  MENU_LOAD: 'menu:load',
  MENU_SAVE: 'menu:save',
  MENU_EXPORT: 'menu:export',
  MENU_IMPORT_CSV: 'menu:importCsv',

  // Import/Parse
  CSV_IMPORT_DIALOG: 'csv:importDialog' // invoke -> { ok, path?, days, bandsDTO, errors? }
};

module.exports = { IPC };
