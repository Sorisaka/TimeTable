'use strict';
/**
 * IPC 契約定義（Contract集中）
 * セキュリティ方針: ここに定義されたチャンネルのみ使用する。
 */
const IPC = {
  // Menu notifications (Main -> Renderer)
  MENU_NEW: 'menu:new',
  MENU_LOAD: 'menu:load',
  MENU_SAVE: 'menu:save',
  MENU_EXPORT: 'menu:export',

  // Project lifecycle (Renderer -> Main)
  PROJECT_CREATE: 'project:create',    // payload: WizardInput -> { ok, project }
  PROJECT_OPEN: 'project:open',        // -> { ok, path?, data? }
  PROJECT_SAVE: 'project:save',        // data -> { ok, path? }

  // Export (Renderer -> Main)
  EXPORT_IMAGE: 'export:image'         // { rect } -> { ok, path? }
};

// 補助バリデーション（例: キャプチャ矩形）
function isRect(obj) {
  return obj && Number.isFinite(obj.x) && Number.isFinite(obj.y)
    && Number.isFinite(obj.width) && Number.isFinite(obj.height);
}

module.exports = { IPC, isRect };
