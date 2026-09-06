---
date: 2026-09-06
author: Seitaro
type: decision
---

# hqのGit運用ルールを導入（ブランチ＋PR＋squash merge）

## 内容
hqで策定された全社共通のGit運用ルール（`../../org/git-workflow.md`）をこのリポジトリに
適用した。

- `.github/pull_request_template.md` と `.github/workflows/ci.yml`（lint）を追加
- `CLAUDE.md` に「Git運用ルール」節を追加
- 以降、`main`への直pushはせず、機能追加・修正は必ずブランチ＋PR（squash merge固定）
- 起票者本人のセルフ動作確認がマージの必須条件。相手のApproveは原則不要
- `main` の branch protection（PR必須／force-push・削除禁止／必須Approve数0）を設定

## 背景
2人が別々にAIと対話して作業するため、`main`を常に動く状態に保つ仕組みが必要だった。
横断側の詳細な意思決定は hq の `memory/20260906_git-workflow.md` を参照。
