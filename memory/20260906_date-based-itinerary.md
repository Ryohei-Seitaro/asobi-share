---
date: 2026-09-06
author: Seitaro
type: decision
---

# 旅程を日付ベースに（trips.start_date 追加）＋季節フィルタ（④）

## 決めたこと
CEOフィードバック④「カレンダー月表示→日付選択で日程入力／旅程を日付ベースで保存／
日数を自動算出／何月に行ったか表示・季節フィルタ」への対応。

- **`trips.start_date`（`date`、nullable）を1本だけ追加**。旅程の1日目の日付。
  - `trip_days` に実日付カラムは足さない。DAY N の日付は `start_date + N日` で導出できるため。
  - nullable：既存データ・未入力の旅程は「月・季節」表示なし、季節フィルタでは除外。
- **日数の自動算出**：`create/actions.ts` の `addDay` で、DAY数から `nights` / `daysLabel`
  （`nightsToLabel`）を毎回再計算して `trips` に反映。つくる画面のヘッダーに
  「日数：◯◯（DAY数から自動）」を表示。
- **季節の判定は「開始日の月」**。`lib/trip-filters.ts` に `SEASON_OPTIONS` /
  `SEASON_MONTHS`（春3-5・夏6-8・秋9-11・冬12-2）/ `seasonOfMonth` / `monthSeasonLabel`。
  見つけるフィルタのSQLは `extract(month from start_date)::int IN (...)`。
- **日付入力UI**：`<input type="date">` を採用（ネイティブのカレンダー＝月表示→日付選択）。
  独自の月グリッドカレンダーは作っていない（必要になれば別途）。つくる新規フォーム・
  つくる編集（TripEditor、変更即保存 `setTripStartDate`）・メモ取り込みの3か所に設置。
- カード／旅程詳細ヘッダーに「◯月・季」バッジを表示。
- seed：`start_date` を `i*5 mod 12` で12か月に散らして季節フィルタの動作確認用データを用意。

## マイグレーション
- `web/src/db/schema.ts` に `start_date` 追加 → 各自のNeonへ
  `npx dotenv -e .env.local -- drizzle-kit push`（`db:push` 単体は `.env.local` を読まない、
  既知：`20260906_merge-with-seitaro-and-trip-filter-backfill.md`）。nullable追加なので対話なし。
- Seitaroのasobi-share-devには適用済み・再seed済み（※seedはtrips非冪等なので重複投入に注意）。

## 見送り／将来
- 独自カレンダー月グリッドUI（今回はネイティブ`type=date`で代替）。
- `trip_days.date_label` の実日付連動（今は表示用テキストのまま）。
