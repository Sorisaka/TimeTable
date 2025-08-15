'use strict';
/**
 * IPC 契約定義（Contract）
 * - ここに存在しないチャンネルは使用禁止。
 * - 方向:
 *   - send: Main -> Renderer の一方向通知
 *   - invoke: Renderer -> Main の request/response（今回は未使用）
 */
const IPC = {
  // Menu notifications
  MENU_NEW: 'menu:new',       // send
  MENU_LOAD: 'menu:load',     // send
  MENU_SAVE: 'menu:save',     // send
  MENU_EXPORT: 'menu:export'  // send
};

module.exports = { IPC };
