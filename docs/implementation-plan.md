# my_ocr 実装計画（MVP）

## 1. 目的
`docs/design-spec.md` を実装可能な粒度に分解し、GitHub Pages公開までを安全に進める。

## 2. 完了条件
1. 単一ページで「画像貼り付け -> OCR -> 結果編集 -> コピー」が動作する
2. `main` への反映で GitHub Pages に自動デプロイされる
3. デプロイ時にテストコードが必ず実行され、失敗時はデプロイされない
4. Docker Composeで開発サーバーを起動できる

## 3. 実装フェーズ
### Phase 0: 土台構築
1. Vite + React + TypeScript プロジェクト初期化
2. ESLint / Prettier / TypeScript 設定
3. npm scripts 整備（`dev`, `build`, `test`, `lint`, `preview`）
4. GitHub Pages向け `vite.config.ts`（`base` 設定）
5. Docker開発環境（`Dockerfile.dev`, `docker-compose.yml`, `.dockerignore`）整備

成果物:
- `/Users/taku/dev/my_ocr/package.json`
- `/Users/taku/dev/my_ocr/vite.config.ts`
- `/Users/taku/dev/my_ocr/src/main.tsx`
- `/Users/taku/dev/my_ocr/Dockerfile.dev`
- `/Users/taku/dev/my_ocr/docker-compose.yml`

### Phase 1: UI骨格と状態管理
1. 単一ページUI（貼り付けエリア/プレビュー/操作ボタン/結果エリア/ステータス）
2. 主要state定義（画像、OCR進捗、結果テキスト、エラー）
3. 初期状態・処理中状態・完了状態のUI切替

成果物:
- `/Users/taku/dev/my_ocr/src/App.tsx`
- `/Users/taku/dev/my_ocr/src/App.css`（または同等のスタイル）

### Phase 2: 画像貼り付け機能
1. `paste` イベントで画像取得（`image/png`, `image/jpeg`, `image/webp`）
2. 対応外データ時のエラー表示
3. 画像プレビュー表示
4. クリア操作（画像・結果・ステータスの初期化）

成果物:
- `/Users/taku/dev/my_ocr/src/features/paste/*`

### Phase 3: OCR統合
1. `tesseract.js` 導入（Web Worker利用）
2. 言語 `jpn+eng` のロードとOCR実行
3. 進捗表示（%）とキャンセル不可時のUI制御
4. OCR失敗時リカバリ（再実行可能状態への復帰）

成果物:
- `/Users/taku/dev/my_ocr/src/features/ocr/*`

### Phase 4: 結果再利用機能
1. 結果テキスト編集
2. クリップボードコピー（成功/失敗通知）
3. Clipboard API非対応時の代替案表示

成果物:
- `/Users/taku/dev/my_ocr/src/features/result/*`

### Phase 5: 仕上げと公開
1. アクセシビリティ最低限対応（label, aria-live, キーボード操作）
2. README整備（ローカル実行、制限事項、デプロイ手順）
3. GitHub Actions（CI + Pages Deploy）有効化
4. 本番相当確認（`npm run build` と `npm run preview`）

成果物:
- `/Users/taku/dev/my_ocr/.github/workflows/ci.yml`
- `/Users/taku/dev/my_ocr/.github/workflows/pages.yml`

## 4. テスト計画
### 4.1 方針
- ユニット + UIコンポーネントテストをMVPの主軸にする
- E2Eは最小のスモーク（任意）として後追い可能な設計にする

## 4.2 使用ツール
- テストランナー: Vitest
- UIテスト: React Testing Library
- DOM環境: jsdom

## 4.3 対象テスト
1. 画像貼り付け
- 画像MIME受理
- 非画像データ拒否
2. OCR起動制御
- 画像未選択時に実行不可
- OCR中のボタン制御
3. 結果表示
- OCR成功時にテキスト反映
- OCR失敗時にエラー表示
4. コピー機能
- クリップボード書き込み呼び出し
- 成功/失敗通知

## 4.4 テストコマンド
- `npm run test` : ローカル開発用（watch）
- `npm run test:ci` : CI用（1回実行、カバレッジ任意）
- `npm run lint`
- `npm run build`
- `docker compose run --rm app npm run test:ci`

## 5. CI/CD計画（デプロイ時にテスト実行）
### 5.1 ワークフロー構成
1. `ci.yml`（PR品質確認）
- トリガー: `pull_request`
- 実行順: `npm ci` -> `npm run lint` -> `npm run test:ci` -> `npm run build`
2. `pages.yml`（本番デプロイ）
- トリガー: `push`（`main`）
- job1 `quality`: `npm ci` -> `npm run lint` -> `npm run test:ci` -> `npm run build`
- job2 `deploy`: `needs: quality`、成功時のみ Pages へデプロイ

### 5.2 ゲート条件
- テスト失敗時は `deploy` ジョブを実行しない
- ビルド失敗時も同様にデプロイしない
- これにより「デプロイ時にテストが走る」を担保する

## 6. タスク分解（実施順）
1. Docker開発基盤セットアップ（Phase 0）
2. UI骨格（Phase 1）
3. 貼り付け処理（Phase 2）
4. OCR統合（Phase 3）
5. コピー/通知（Phase 4）
6. テスト実装（Phase 2-4並行）
7. CI/CD設定（Phase 5）
8. 受け入れ基準チェック

## 7. リスクと対策
1. OCR精度ばらつき
- 対策: 前処理（コントラスト調整）を後方互換で追加
2. 初回OCRの待ち時間
- 対策: OCR実行時ロード表示、言語データ遅延ロード
3. ブラウザ差異（Clipboard API）
- 対策: 非対応時メッセージと代替手順を明示
4. CI時間増大
- 対策: テストをユニット中心に保ち、重いE2Eは別workflow化
5. Dockerのファイル監視遅延
- 対策: `CHOKIDAR_USEPOLLING=true` を開発コンテナに設定

## 8. 受け入れチェックリスト
- [ ] 画像貼り付けでプレビュー表示される
- [ ] OCR結果がテキストエリアに表示される
- [ ] 結果テキストを編集できる
- [ ] コピーボタンで再利用できる
- [ ] `npm run lint` が通る
- [ ] `npm run test:ci` が通る
- [ ] `npm run build` が通る
- [ ] `main` 反映時、テスト成功時のみ Pages が更新される
- [ ] `docker compose up` で開発画面が表示される
