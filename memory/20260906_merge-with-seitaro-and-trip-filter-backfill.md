---
date: 2026-09-06
author: Ryohei
type: decision
---

# Seitaro実装とのマージ、及び見つける画面フィルタ用データのバックフィル

## 内容
git push時に、Seitaroが並行して進めていた6コミット（見つける画面のフィルタ拡張・
保存済みタブ・マイページ整理等）とリモートで競合し、`git merge origin/main`で統合した。

- コンフリクトは`memory/INDEX.md`・`web/src/app/(app)/create/actions.ts`・
  `web/src/app/(app)/page.tsx`の3ファイル。import文の単純な統合と、
  `page.tsx`は見つける画面の写真表示部分だけ自分の`TripCardPhotos`（ページ送り
  カルーセル）に差し替え、それ以外（フィルタ・タブ・保存済みマーク）はSeitaro側の
  構造をそのまま採用する形で解消した。
- `TripCardPhotos`に`isSaved`propを追加し、Seitaro側の保存済みバッジ表示に対応させた。
- 自動マージ（コンフリクトにならなかった箇所）の結果、`web/src/app/(app)/me/page.tsx`で
  `next/link`のimportが消えているのに`<Link>`要素は残っているバグが発生していた
  （自分が追加した受け取る/チャージのLinkと、Seitaro側の旧Link使用箇所削除が重なった
  ため）。ビルドで気づかず、目視レビューで発見・修正。**auto-mergeされたファイルも
  importの整合性まで確認する必要がある**という教訓。
- Seitaro側で追加された`trips.nights`/`international`/`partySizeMin`/`partySizeMax`
  カラムは自分のNeon DBに未反映だったため、承認を得た上で`drizzle-kit push`で反映。
- 上記カラムは追加時点でデフォルト値（国内・1人〜）になるため、既存のシードデータ
  （FEED由来の16件）がフィルタ上で誤分類される状態だった。`seed.ts`には重複防止の
  仕組みがなく単純な再実行はできないため、`scripts/backfill-trip-filters.ts`を新設し、
  title一致でgenre/daysLabel/nights/international/partySizeMin/partySizeMaxのみを
  UPDATEした（savesCount/likesCount/priceYen等の実運用中の値は保持）。

## 決定事項
- 複数人が同じmainブランチで並行してAIエージェントに実装を進めさせる運用では、
  push前に必ず`git fetch`で差分の有無を確認し、競合時は`git merge`でコンフリクトを
  一つずつ手動解決する（force pushや一方の変更を丸ごと捨てる対応はしない）。
- DBスキーマ変更を伴うコミットをpull/mergeで取り込んだ際は、コード上のスキーマ定義
  だけでなく、実際のDBに列が反映されているかを都度確認する（`drizzle-kit push`は
  各自のローカル/開発DBに対して個別に実行する必要があり、git pullだけでは反映されない）。

## 影響範囲
- asobi-share: `web/src/app/(app)/page.tsx`, `web/src/app/(app)/create/actions.ts`,
  `web/src/app/(app)/me/page.tsx`, `web/src/components/TripCardPhotos.tsx`,
  `memory/INDEX.md`, `web/scripts/backfill-trip-filters.ts`（新規）
- 次のアクション: Seitaro側の環境でも同様のカラム未反映・データ誤分類が起きて
  いないか確認し、必要なら`backfill-trip-filters.ts`を実行してもらう。
