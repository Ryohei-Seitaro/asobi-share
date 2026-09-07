---
date: 2026-09-07
author: Seitaro
type: decision
---

# 本番の一過性エラーとエラーバウンダリ整備（Neon コールドスタート）

## 何が起きたか
PR #17 マージ後、CEOが本番 https://asobi-share.vercel.app を開くと
「This page couldn't load / A server error occurred（ERROR 2379659138）」。

調査：
- Vercel のビルド・デプロイは success。**ランタイム例外**（`f:E{"digest":"2379659138"}`、
  `loading.tsx` の Suspense 境界 `B:0` がエラー化）。
- 数分後に叩き直すと 12/12 成功。**一過性**。→ 決定的なバグ（カラム欠落など）ではない。
- 原因：**Neon のサーバーレス Postgres はアイドルでゼロにスケールする**。コールドスタート
  直後の最初のリクエストで、リクエスト時に走る `db.select()`（`@neondatabase/serverless` の
  HTTPクエリ）が失敗し、その例外を受け止める `error.tsx` が無かったため Next の素の
  全画面エラーが出た。`loading.tsx` はエラーを捕捉しない。
- 補足：本番DB（Ryohei の共有 Neon）には**まだ trip が0件**。見つける画面が空なのは
  シード未実施のため（別タスク）。スキーマ自体は入っている（クエリはエラーではなく空を返す）。
- PR #17 は原因ではない（見つける画面は以前からリクエスト時に無防備なDB読み取りをしていた）。

## 決めた対応
1. **`src/app/(app)/error.tsx`（新規・"use client"）** — セグメントのエラーフォールバック。
   「うまく読み込めませんでした／再読み込み」＋ `reset()`。2回目はDBが温まっていて成功しやすい。
2. **`src/app/global-error.tsx`（新規）** — ルートレイアウトごと落ちたとき用の最終防衛。
   `<html>/<body>` 自前・インラインstyle（globals.css は効かない）。
3. **`src/app/(app)/page.tsx` の DB 読み取りを `withColdStartRetry` でラップ** — 1回だけ
   700ms 待って再試行。これで大半のコールドスタートはユーザーにエラーを見せず自己回復。
   それでもダメなら投げて `error.tsx` に委ねる。

### やらなかったこと / 保留
- **try/catch で握って空リストを返す**のは却下。「DBが一時的に不調」と「本当に0件」が
  区別できず、空表示が誤解を生む。投げて `error.tsx`（再試行導線あり）に任せる方が正しい。
- `withColdStartRetry` を他のDB読み取りページ（`/trips/[id]`・`/me` 等）にも広げるのは
  この PR ではやらない。ランディングで一番踏まれる見つける画面を先に手当て。共通化して
  横展開するかは、頻度を見てから（`src/db` にヘルパを置く案）。
- Neon の「min compute / scale-to-zero を無効化」は課金の話。PoC 中はこのままでよい。

## 学び
- **リクエスト時にDBを読むページには `error.tsx` を必ず置く**（`loading.tsx` と対で）。
  Neon scale-to-zero 環境ではコールドスタート失敗が普通に起きる。
- 本番の runtime エラーは digest しか出ない。`x-vercel-id` と digest を控え、
  必要なら Vercel の Functions ログで突き合わせる。
- デプロイ直後は「本番URLを実際に開いて主要導線を1周」する（今回CEOが先に踏んだ）。
