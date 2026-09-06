# memory 索引（asobi-share）

このプロダクト固有の実装内容・意思決定を記録する。全社横断の内容は
[`../../../memory/`](../../../memory/)（hq側）へ。フォーマット・運用ルールは
[`../CLAUDE.md`](../CLAUDE.md)を参照。

新しい順に追記する。

- [2026-09-07 見つける画面の遷移ごとの再レンダリング遅延を削減](20260907_discover-render-latency.md) — 1巡目：`loading.tsx` 追加／`currentUser()`→`auth()`／`Promise.all` 並列化。2巡目：フィルタをクライアント側化（全件取得＋`DiscoverClient`＋`history.replaceState`）でチップ操作を即時化。インデックス追加はデータ増加時の後回し
- [2026-09-06 有料記事まわりの改善（⑦）— 購入パネルの位置・中央モーダル・カレンダーはAPI一本化](20260906_paid-article-and-modal-and-calendar.md) — 購入パネルは有料ライン位置に重ねる／ポップアップは中央モーダルで統一（ボトムシート廃止）／カレンダーは.ics保存をやめGoogle直接登録のみ（TripEditorの.icsは残す）／チャージは記事⇄チャージ画面の往復
- [2026-09-06 旅程を日付ベースに（trips.start_date）＋季節フィルタ（CEO⑦バッチ④）](20260906_date-based-itinerary.md) — start_date 1本追加、日数はDAY数から自動、季節は開始月で判定、type=dateで日付入力
- [2026-09-06 hqのGit運用ルールを導入（ブランチ＋PR＋squash merge）](20260906_adopt-git-workflow.md) — PRテンプレ・settings.json許可・CLAUDE.md追記（開発スピード優先、CI・マージゲートなし）
- [2026-09-06 Seitaro実装とのマージ、及び見つける画面フィルタ用データのバックフィル](20260906_merge-with-seitaro-and-trip-filter-backfill.md) — mainでのコンフリクト解消、import欠落バグの発見・修正、既存データのバックフィル
- [2026-09-06 メモ取り込みの不具合修正、Googleカレンダー直接登録（OAuth）、有料ラインのドラッグ移動](20260906_memo-fixes-and-gcal-oauth-and-paid-line-drag.md) — 写真枚数/サイズ制限撤廃、複数日パース修正、GCal OAuth連携、有料ラインドラッグ化
- [2026-09-06 メモ取り込みのタイムラインプレビューと予定ごとのマップ/食べログURL入力](20260906_memo-preview-and-place-links.md) — メモ画面に投稿前タイムラインプレビュー追加、予定にGoogleマップ/食べログURLを直接入力できるように
- [2026-09-06 つくる画面のGoogleカレンダー化・受け取り/チャージ画面・メモ取り込み投稿の実装](20260906_calendar-ux-payout-memo-import.md) — ドラッグ予定作成・1分刻み・ics連携・受け取り/チャージ画面・メモ取り込み投稿・写真カルーセル・ブランド調整
- [2026-09-06 web/実装のローカル動作確認と個人用Neonプロジェクトの採用](20260906_web-local-verification.md) — Clerk keys発行・個人Neonプロジェクトでスキーマ反映・シードして動作確認
- [2026-09-05 CEOフィードバック9項目の実装と共同タスクボードの新設](20260905_feedback-and-tasks-mvp-updates.md) — CEOフィードバック9項目のモック実装、tasks/board.md新設
- [2026-09-05 memory/ディレクトリの新設](20260905_memory-setup.md) — hqの方針に従いこのリポジトリにmemory/を新設
