'use strict';
/**
 * 最小ユニットテスト（フレームワーク非依存）
 * - assets/sample.csv を読み込み
 * - csvParser → ProjectService で DTO/Domain を生成
 * - いくつかの性質を assert
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { parseCsvToBandsDTO } = require('../src/application/projectService');

(function run() {
  const csvPath = path.join(__dirname, '../assets/sample.csv');
  const raw = fs.readFileSync(csvPath, 'utf-8');

  const { bands, bandsDTO, days, errors } = parseCsvToBandsDTO(raw);

  // 失敗していないこと
  assert.ok(errors.length === 0, 'CSVにバリデーションエラーがないこと');

  // 日程ラベルの抽出（1日目/2日目）
  assert.deepStrictEqual(days, ['1日目', '2日目']);

  // バンド件数
  assert.ok(bands.length === 4, '4バンド読み込める');

  // DTOの可用例（髭男: 1日目_10=1, 1日目_12=1, 2日目_10=1, 2日目_11=1）
  const dto = bandsDTO.find(b => b.name.includes('髭男'));
  assert.ok(dto, '髭男 DTO 存在');
  assert.deepStrictEqual(dto.availability['1日目'].sort((a,b)=>a-b), [10, 12]);
  assert.deepStrictEqual(dto.availability['2日目'].sort((a,b)=>a-b), [10, 11]);

  console.log('OK: csvParser/ProjectService minimal tests passed.');
})();
