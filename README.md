# my_ocr

クリップボードにあるスクリーンショットを貼り付け、OCRしたテキストをコピー再利用するWebアプリです。

## ドキュメント
- 設計仕様: `/Users/taku/dev/my_ocr/docs/design-spec.md`
- 実装計画: `/Users/taku/dev/my_ocr/docs/implementation-plan.md`

## 開発
```bash
npm ci
npm run dev
```

## テスト/品質
```bash
npm run lint
npm run test:ci
npm run build
```

## デプロイ
- `main` ブランチへの push を契機に GitHub Pages ワークフローが実行されます。
- デプロイ前に `lint -> test:ci -> build` が必ず実行され、失敗時はデプロイされません。
