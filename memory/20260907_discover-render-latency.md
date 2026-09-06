---
date: 2026-09-07
author: Seitaro
type: decision
---

# 見つける画面の遷移ごとの再レンダリング遅延を削減（なぜこの直し方にしたか）

## 背景（CEOフィードバック）
「操作1つ1つで左下に『Rendering』が出てロードが走る。UXが非常に悪いので、
時間がかかっている箇所を特定して可能な限り高速化してほしい。」

## 特定した遅延要因
見つける画面（`(app)/page.tsx`）はフィルタ・タブ・並べ替え・キーワード検索が
**すべて `<Link href="/?...">` または GET フォーム＝フルのサーバー遷移**。
チップを1つ押すたびにページ全体をサーバーで再構築し、その1リクエストの中で：

1. `getOrCreateUser()` が毎回 `currentUser()` を呼ぶ → **Clerk Backend API へ1往復**。
2. `neon-http` ドライバは1クエリ=1 HTTPSリクエスト。見つける画面は
   「users照会 → 一覧 → 保存ID → 購入ID」を**直列 `await` で最大4往復**待っていた。
3. `loading.tsx` が1つも無く、遷移中は旧画面が固まったまま完成を待つ
   （左下の dev インジケータが「Rendering」で出続ける体感の主因）。

## 決めた対応と、その理由

### 1. `loading.tsx` を置く（体感速度への効き目が一番大きい）
- `(app)/loading.tsx`（一覧スケルトン）と `trips/[id]/loading.tsx`（詳細スケルトン）を追加。
- Next.js は `loading.tsx` を Suspense フォールバックとして**遷移直後に即ストリーミング**する。
  「固まる→完成したらパッと切替」が「即スケルトン→中身が差し替わる」に変わる。
- `(app)/loading.tsx` は `/me` `/create` `/search` 等でも共有される。カード状スケルトンは
  それらでは厳密には合わないが、"固まるよりは遥かにマシ" を優先。ホットパスは見つける画面。
- 代替案（各ページを Suspense で細分化してストリーミング）は差分が大きく、今回は見送り。

### 2. Clerk：`currentUser()` → `auth()`
- `auth()` はミドルウェアが検証済みのセッションJWTを**ローカルで読むだけ**でネットワーク往復なし。
  `currentUser()` は Clerk Backend API を毎回叩く。
- `getOrCreateUser()` を書き換え：`auth()` の `userId` で usersテーブルを**PK参照1発**。
  行があればそれを返す。**無い初回だけ** `currentUser()` を呼んでプロフィールを取り作成。
- 読み取り専用ページ（見つける・旅程詳細）は users 行すら要らない。`getCurrentUserId()` を
  新設して `userId` だけ取る。`users.id` は Clerk userId そのものなので、
  `tripSaves.userId` 等の絞り込みは userId 直接でできる。

### 3. 独立クエリの並列化（`Promise.all`）
- 見つける画面：一覧・保存済みID・購入済みID は互いに独立。`Promise.all` で同時に投げる
  （直列4往復 → 実質1往復ぶんの待ち時間）。
- マイページ：自分の旅程一覧＋コイン残高を `Promise.all`。
- 旅程詳細：もともと4つのサブクエリは `Promise.all` 済み。`getCurrentUserId()` 化のみ。

### 4. 見送った案
- **DBインデックス追加**（trips の genre / `extract(month from start_date)` / savesCount 等）：
  現状シードが数十件規模で効果が薄く、追加すると久野・Seitaro 双方の Neon で
  `drizzle-kit push` が要る（board 記載の運用摩擦）。データが増えてから対応する。
- **フィルタのクライアント側化**（一覧を1回取得してブラウザでフィルタ/ソート）：
  一番効くが、`q` の ilike サーバー検索など挙動が変わる範囲が広い。今回はスコープ外。
- **`devIndicators` で「Rendering」を移動/非表示**：`next dev` 限定の表示で本番には出ない。
  好みの問題なので設定は変えず、必要なら `next.config.ts` で切れる旨だけ共有。

## 学び（次に活かす）
- サーバーコンポーネントのページには原則 `loading.tsx` を置く。
- Clerk は「ユーザーIDだけ要る」なら `auth()`、プロフィール本体が要るときだけ `currentUser()`。
- `neon-http` で複数クエリを投げるときは必ず並列化する。直列は往復回数ぶん線形に遅くなる。
