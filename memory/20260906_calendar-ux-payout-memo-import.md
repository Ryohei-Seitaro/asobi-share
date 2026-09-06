---
date: 2026-09-06
author: Ryohei
type: decision
---

# つくる画面のGoogleカレンダー化・受け取り/チャージ画面・メモ取り込み投稿の実装

## 内容
CEOフィードバック11項目を実装した。

1. 「つくる」画面の予定作成をGoogleカレンダー風のドラッグ操作に変更（`TripEditor.tsx`）。
   タイムライングリッドに Pointer Events でドラッグ範囲を検知し、離した位置で
   タイトル・開始/終了時刻（`<input type="time" step={60}>` で1分刻み）・場所・メモの
   クイック作成シートを開く。既存の「＋予定を置く」ボタンも並行して残した。
2. 予定単位の「ジャンル」入力を撤廃（DBの`category`列はそのまま残し、常に`"other"`で保存）。
3. Googleカレンダーとのデータ互換性として、`.ics`形式のインポート/エクスポートを実装。
   - エクスポート: `GET /api/trips/[tripId]/ics`（`lib/ics.ts`の`generateIcs`）
   - インポート: `TripEditor`のヘッダーから開ける`GoogleCalendarSheet`で`.ics`ファイルを
     選択すると`importIcsToDay`（`create/actions.ts`）がその日の予定として取り込む
   - `trip_days`は実日付を持たないため、エクスポート時は今日を1日目として仮の日付を割り当てている
4. マイページの「受け取る」「コインをチャージする」ボタンを実画面につないだ。
   - `/me/payout`: 振込先口座登録（`payout_accounts`）＋受け取り申請（`payout_requests`、新規テーブル）
   - `/me/charge`: 金額選択→`coinBalances`加算・`coinTransactions`に`type:"charge"`で記録
   - どちらも決済プロバイダ未接続のため、既存の円決済購入フローと同様に記録のみのモック
5. 検索ウィザードの各設問に「あてはまるものがない（自由に書く）」の自由記入欄を追加。
6. 「つくる」画面に📌「メモから旅程をつくる」導線を追加（`/create/memo`）。
   他アプリで書いた旅程テキスト＋写真（最大5枚）を貼り付けると、`lib/memoParser.ts`の
   ヒューリスティック（時刻表記・日付表記の正規表現マッチ）で日ごとのイベントに分解し、
   プレビュー→`createTripFromMemo`で一括投稿できる。
7. 旅程カードの写真表示を3枚固定グリッドから3枚区切りのページ送りカルーセルに変更
   （`TripCardPhotos.tsx`）。あわせてseedデータの各tripの写真を4〜6枚に拡充。
8. ダミー人物名「あいり」を全箇所「あそびくん」に統一（`seed.ts`、`mockup/`）。
9. シェア画面のX/LINE/Instagramアイコンを、ブランドカラー付きの公式ロゴ相当SVGに差し替え。

## 決定事項
- 予定作成の時間解像度はUI表示のPPM（26/15 px/分）を変えず、ドラッグ位置の丸め処理のみを
  1分単位にした（見た目のグリッド線は15分/60分間隔のまま）。
- メモ取り込みの写真は、投稿者アップロード基盤（Vercel Blob等）が未整備のため、
  ブラウザで読み込んだdata URLをそのまま`coverPhotos`（jsonb）に保存する暫定実装とした。
  本格的な画像アップロード基盤ができた際に置き換える前提（`poc-exif`統合タスクと合流し得る）。
- 受け取り申請の対象額はマイページと同じ「有料旅程の価格合計×0.85」の簡易計算のまま
  （実際の購入件数に基づく正確な売上計算ではない、既存モックの仕様を踏襲）。
- schema.tsに`payout_status` enumと`payout_accounts`/`payout_requests`テーブルを追加し、
  `drizzle-kit push`でNeon DBに反映済み。

## 影響範囲
- asobi-share: `web/src/components/TripEditor.tsx`, `MemoImportView.tsx`, `TripCardPhotos.tsx`,
  `CoinChargeView.tsx`, `PayoutView.tsx`, `ShareView.tsx`、`web/src/app/(app)/create/*`,
  `web/src/app/(app)/me/*`, `web/src/app/api/trips/[tripId]/ics/route.ts`,
  `web/src/lib/ics.ts`, `web/src/lib/memoParser.ts`, `web/src/db/schema.ts`（DB反映済み）,
  `web/scripts/seed.ts`, `mockup/itinerary-mock.html`, `tasks/board.md`,
  `feedback/{frontend-engineer,backend-engineer,ui-ux-designer,brand-designer}.md`
- 次のアクション: `poc-exif`のEXIF自動旅程生成統合時に、メモ取り込みの写真保存先も
  正式なアップロード基盤（Vercel Blob等）に置き換える。ログイン必須ページの実機動作確認は
  ブラウザでの手動確認が必要（このセッションでは型チェック・ビルド・未認証ページのHTTP確認のみ実施）。
