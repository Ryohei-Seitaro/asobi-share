---
date: 2026-09-06
author: Seitaro
type: decision
---

# web/実装のローカル動作確認と、個人用Neonプロジェクトの採用

## 内容
Ryoheiが実装した`web/`（Next.js本実装）をローカルで起動して動作確認した。

- Clerk認証：`.env.local`未設定のままだと`Missing publishableKey`でクラッシュした。
  `npx clerk@latest init`で個人用の一時開発インスタンスを発行し解決（v7ではkeyless modeの
  自動発行が効かず、明示的な`init`実行が必要だった）
- DB接続：`web/`はDrizzle+Neonでトップページ（見つける画面）がDB接続必須の実装になっており、
  `DATABASE_URL`なしでは500になる。確認のため個人用Neonプロジェクト（`asobi-share-dev`、
  Seitaroのアカウント）を新規作成し、`npm run db:push`でスキーマ反映、`npm run db:seed`で
  シード（旅程16件）を投入して動作確認した
- 確認できたこと：トップページ（見つける、旅程データ表示）・検索画面は200で正常表示。
  `/create`・`/me`（認証必須ページ）はcurlでは404になったが、これはClerk dev instanceが
  実ブラウザのdev-browserハンドシェイクを要求するためで（`x-clerk-auth-reason:
  dev-browser-missing`）、実ブラウザでは問題にならない見込み

## 背景
Ryoheiの実装をpullしたが、`.env.local`（DB接続情報等）はgitignore対象で共有されておらず、
手元での動作確認ができなかった。Ryoheiの本番/共有Neonプロジェクトの接続情報を共有してもらう
案もあったが、パスワードを含む接続文字列をチャットでやり取りするより、確認用に個人用の
Neonプロジェクトを別途用意する方が安全という判断で、Seitaro個人のNeonアカウントで新規作成した。

## 影響範囲
- `asobi-share-dev`（Neon、Seitaroアカウント）は確認用の個人プロジェクトであり、Ryoheiの
  本番/共有プロジェクトとは別物。データも共有されない
- `src/db/schema.ts`が変更されたら、このプロジェクトにも`npm run db:push`で反映し直す必要がある
- `.env.local`はコミットしていない（`.gitignore`で`.env*`除外済み、確認のみ）
