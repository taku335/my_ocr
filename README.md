# my_ocr

クリップボードにあるスクリーンショットを貼り付け、OCRしたテキストをコピー再利用するWebアプリです。

## ドキュメント
- 設計仕様: `/Users/taku/dev/my_ocr/docs/design-spec.md`
- 実装計画: `/Users/taku/dev/my_ocr/docs/implementation-plan.md`

## 開発（Docker）
```bash
docker compose up --build
```

ブラウザで `http://localhost:5173/my_ocr/` にアクセスします。

## テスト/品質（Docker）
```bash
docker compose run --rm app npm run lint
docker compose run --rm app npm run test:ci
docker compose run --rm app npm run build
```

## テスト/品質（ローカルNodeを使う場合）
```bash
npm ci
npm run lint
npm run test:ci
npm run build
```

## デプロイ
- `main` ブランチへの push を契機に GitHub Pages ワークフローが実行されます。
- デプロイ前に `lint -> test:ci -> build` が必ず実行され、失敗時はデプロイされません。
