---
date: 2026-09-06
author: Ryohei
type: decision
---

# メモ取り込みの不具合修正、Googleカレンダー直接登録（OAuth）、有料ラインのドラッグ移動

## 内容
1. メモ取り込み画面（`/create/memo`）の写真枚数上限（5枚）を撤廃した。
2. Server Actionsのデフォルトボディサイズ上限（1MB）が写真アップロードのネックに
   なっていたため、`next.config.ts`の`experimental.serverActions.bodySizeLimit`を
   `"50mb"`に引き上げた。
3. `lib/memoParser.ts`の複数日パースの不具合を修正した。
   - 原因1：日付見出しの検出パターンが「N日目」「M/D」のみで、「Day 1」「M月D日」等の
     表記に対応しておらず、見出しを検出できないと後続の予定がすべて1日目に積み上がっていた。
     → パターンを拡充。
   - 原因2：TypeScriptのcontrol-flow narrowingが、クロージャ関数（`pushEvent`/`startNewDay`）
     経由での外側`let`変数への再代入を正しく追えず、`currentDay`が`never`型に絞り込まれる
     ビルドエラーが発生した。可変状態を`{ day, event }`オブジェクトのプロパティに変更して
     回避した（プロパティアクセスは関数呼び出しをまたいでnarrowingされないため）。
   - 加えて、明示的な日付見出しが無いメモでも、直前の予定より180分以上時刻が巻き戻ったら
     新しい日とみなすヒューリスティックを追加し、堅牢性を上げた。
4. Googleカレンダーへの直接登録（ワンクリック一括作成）を実装した。
   - `lib/googleCalendar.ts`: Google Calendar API `events.insert`をfetchで直接呼び出す
     薄いヘルパー（`googleapis`パッケージは追加していない）。
   - `create/actions.ts`の`pushTripToGoogleCalendar`: `clerkClient().users.getUserOauthAccessToken(userId, "google")`
     でユーザーのGoogleアクセストークンを取得し、旅程の全日・全イベントを`primary`カレンダーに作成する。
   - UI: `TripEditor.tsx`のGoogleカレンダー連携シートに「この旅程をGoogleカレンダーに追加する」
     ボタンを追加（既存の.icsインポート/エクスポートと並存）。
5. 有料ラインをクリック切り替えからドラッグ移動に変更した（`TripEditor.tsx`）。
   有料ラインが設定済みの境界だけ、Pointer Eventsでドラッグ可能なハンドルとして描画し、
   離した位置に最も近いイベント境界へスナップして`setPaidFrom`を呼ぶ。未設定の境界は
   従来通り「ここから先を有料にする」ボタンのままで、最初の配置はクリックで行う。

## 決定事項
- Google Calendar連携は、Clerk Dashboard側で「Use custom credentials」を有効化し、
  独自のGoogle CloudのOAuthクライアントに`https://www.googleapis.com/auth/calendar.events`
  スコープを追加する必要がある（Clerkの開発用共有クレデンシャルではスコープ拡張不可）。
  この管理画面での設定は久野が別途行う前提とし、`tasks/board.md`の未完了に切り出した。
  開発・検証段階（自分たちのテストユーザーのみ）であればGoogle側の審査は不要。
- アクセストークンが取得できない（未連携・スコープ不足）場合はエラーメッセージで
  再ログイン・許可を促す方針とし、.icsのインポート/エクスポート導線は代替手段として残した。

## 影響範囲
- asobi-share: `web/src/lib/memoParser.ts`, `web/src/lib/googleCalendar.ts`（新規）,
  `web/src/app/(app)/create/actions.ts`, `web/src/components/MemoImportView.tsx`,
  `web/src/components/TripEditor.tsx`, `web/next.config.ts`, `tasks/board.md`
- 次のアクション: Clerk DashboardでのGoogle`calendar.events`スコープ追加（久野が対応）、
  対応後にワンクリック登録の実機テストを行う。
