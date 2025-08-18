# TimeTable
タイムテーブル作成アプリ(Windows/Mac両対応Electron駆動)

### 追加ライブラリ等
papaparse<br>

tests/run-csv-parser.test.jsの単体実行によるテストのために必要(純JSライブラリ: 本番環境では考慮不要)<br>

`npm install papaparse`<br>
`node tests/run-csv-parser.test.js`<br>

### 修正推奨要素
1. sandbox有効化<br>
`require('path')`の使用のために`src/main.main.js`の`createWindow()`にて`sandbox: false`としてあるが、セキュリティのために`true`で動くようにすべき。