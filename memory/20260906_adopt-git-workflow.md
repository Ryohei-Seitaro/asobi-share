---
date: 2026-09-06
author: Seitaro
type: decision
---

# hqのGit運用ルールを導入（ブランチ＋PR＋squash merge、開発スピード優先）

## 内容
hqで策定された全社共通のGit運用ルール（`../../org/git-workflow.md`）をこのリポジトリに
適用した。**現方針は開発スピード優先で、マージをブロックするゲートは置かない。**

- `.github/pull_request_template.md` を追加
- `.claude/settings.json` の `permissions.allow` に `gh pr create` / `gh pr merge` /
  `git push` を追加（PR作成〜マージをClaudeにスムーズに実行させるため）
- 自動CIは当面置かない（lintだけでは費用対効果が薄い。build/testを回せるenv整備後に追加）
- `CLAUDE.md` に「Git運用ルール」節を追加
- 以降、`main`への直pushはせず、変更はブランチ＋PR（squash merge固定）
- **PR作成〜squash mergeまで、依頼されたセッションのClaudeが実行してよい**（CIのgreenも
  待たない）。相手のApproveは不要
- セルフ動作確認は各自の心構え。PRテンプレのチェック欄は自己申告であり検証の仕組みではない
- `main` の branch protection は任意（現方針では未設定でよい）

## 背景
2人が別々にAIと対話して作業するため、`main`を「原則いつでも動く状態」に保ちたい一方、
現段階では開発スピードを優先する判断。プロセスは「ブランチ＋PR＋squash mergeの記録」だけ
残す最小構成にし、レビュー必須・CI必須といったゲートは置かない。本番リリースを機に、
そのプロダクトは「相手のレビュー必須」へ締め直す予定。
横断側の詳細な意思決定は hq の `memory/20260906_git-workflow.md` を参照。
