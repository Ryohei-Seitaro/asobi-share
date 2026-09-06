---
date: 2026-09-06
author: Ryohei
type: decision
---

# メモ取り込みのタイムラインプレビューと予定ごとのマップ/食べログURL入力

## 内容
1. `/create/memo`（メモから旅程をつくる画面）に、投稿前に見えるタイムライン形式の
   ビジュアルプレビュー（`MemoTimelinePreview`）を追加した。テキストの解析結果を
   `TripEditor.tsx`のグリッドに近い見た目（時間軸＋予定ブロック）でその場に表示する。
   従来の箇条書きリストのプレビューは残し、その上にタイムラインを追加する形にした。
2. 予定作成（`TripEditor.tsx`のAddEventSheet）の「どこへ行く」欄の下に、
   Googleマップの位置情報URL・食べログページURLを直接貼り付けられる入力欄を追加した。
   - `trip_events`テーブルに`map_url`/`tabelog_url`（nullable text）を追加し、DB反映済み。
   - 未入力の場合は従来通り`place`名からの検索リンク（`mapUrl()`/`tabelogUrl()`関数）に
     フォールバックする。
   - 食べログリンクの表示条件を「`tabelogUrl`が設定されている、または`category === "food"`」
     に変更した（予定単位のジャンル選択を撤廃したため、カテゴリだけでは食べログ導線を
     出し分けられなくなったことへの対応）。
   - URLは`addEvent`内で`sanitizeUrl()`によりhttp(s)以外のスキームを弾いている
     （`javascript:`等の注入防止）。

## 決定事項
- メモインポートのプレビューは常時表示（入力するたびリアルタイム更新）とし、
  投稿ボタンを押した後に別画面の確認ステップを挟む方式にはしなかった
  （既存の「つくる」画面のフローとの一貫性を優先）。

## 影響範囲
- asobi-share: `web/src/components/MemoImportView.tsx`, `TripEditor.tsx`, `TripDetail.tsx`,
  `web/src/lib/memoParser.ts`（toMinutes/fmtをexport化）, `web/src/db/schema.ts`（DB反映済み）,
  `web/src/app/(app)/create/actions.ts`
