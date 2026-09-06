---
date: 2026-09-06
author: Seitaro
type: decision
---

# 有料記事まわりの改善（⑦）で決めたこと — 購入導線の位置・モーダル形状・カレンダー方式

CEOフィードバック7件バッチの⑦とその関連改修。PR #15（`feat/paid-article-improvements`）で
1ブランチに集約してマージ。実装の詳細は `tasks/board.md` 完了欄とコード参照。ここには
「なぜそうしたか」だけ残す。

## 購入パネル（Paywall）は有料ラインの縦位置に重ねて出す

- 最初の実装で購入パネルを時間割グリッドの一番下にまとめて置いたら、CEOから
  「元々はモザイクかかり始めのところにあった購入ボタンが下に行ってしまった。戻して」と指摘。
- → 旧仕様どおり、最初のロック済みイベント（`orderIndex >= paidFromEventOrder`）の
  開始時刻の縦位置に `absolute` で重ねる方式に戻した。ブラーがかかったロック済み予定の
  上に被せる。無料プレビュー → その場で有料の壁、という視線の流れを崩さないため。
- note風の「── ここから先は有料です ──」区切りは残す（デザインは好評）。

## ポップアップは画面下スライド（ボトムシート）ではなく中央モーダル

- CEO指示：「ポップアップは画面下から出てくるものではなく中央に出てきてほしい。
  これはカレンダー登録でも同じ」。
- → `CoinSheet`（コイン購入確認）と `AddToCalendar`（カレンダー登録）を
  `flex items-center justify-center` の中央配置に統一。角丸全周・ドラッグハンドル廃止・
  `shadow-xl`・`max-h-[85vh] overflow-y-auto`。
- **今後この種のダイアログを足すときも中央モーダルで揃える。** ボトムシートは使わない。
  （※ `TripEditor` 等の既存ボトムシートは今回のスコープ外で未変更。追って揃える余地あり）

## カレンダー登録は「.ics保存」をやめて API直接方式（Google直接登録）に一本化

- CEOの意図：「icsファイルと言われても分からない。DLして別途カレンダーアプリから
  取り込むのは動線が長すぎる。APIで直接追加できる機能があればそれでいい」。
- → 旅程詳細の「カレンダーに追加」ポップアップから `.icsファイルを保存` ボタンを削除。
  `addTripToGoogleCalendar`（Clerk経由のGoogle OAuthトークンで Calendar API に直接insert）
  を唯一の主ボタンにした。
- **`TripEditor`（つくる/編集画面, Ryohei実装）の `.ics` ダウンロード／取り込みと、
  API ルート `/api/trips/[id]/ics`、`lib/ics.ts` の `parseIcsEvents`（取り込み側）、
  `lib/tripCalendar.ts` は残す。** 別画面の別機能なので消さない、とCEO判断。
- Google直接登録は現状 Clerk 側の設定不足（`oauth_token_retrieval_error`）で「準備中」の
  グレースフルエラーを返す。本対応は `tasks/board.md` 未完了 `[infra][backend]` 項目。

## 残高不足時のチャージは「記事 ⇄ チャージ画面」の往復導線

- CEO指示：「不足時に『チャージしますか？』ボタン → チャージ画面へ一時的に遷移 →
  完了後は記事に戻る」。
- → `CoinSheet` 不足時ボタン → `/me/charge?need=N&return=/trips/{id}`。チャージ画面は
  `return` を受けて、初期額を不足分にあわせ・戻る導線を記事にし・完了1.4秒後に
  `router.push` で自動で記事に戻す（「記事に戻る」ボタンも併置）。
- `return` は **自サイト内の絶対パス（`/` 始まり・`//` 除外）のみ許可**（オープン
  リダイレクト対策）。`chargeCoin(amountYen, revalidate?)` に戻り先パスを渡して
  `revalidatePath` し、戻ったときの残高表示を最新化。

## 関連

- [[20260906_memo-fixes-and-gcal-oauth-and-paid-line-drag]] — Google直接登録(OAuth)の初回実装・有料ラインのドラッグ
- [[20260906_calendar-ux-payout-memo-import]] — カレンダー追加UI・.ics の初回実装
