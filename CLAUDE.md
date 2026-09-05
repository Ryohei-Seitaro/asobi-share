# CLAUDE.md — asobi-share

遊び・旅行シェアアプリ（仮）。コンセプトは `docs/20260826_ceo-goal.md` を参照。
現状はPoC段階（`poc-exif/` — EXIF自動旅程生成の技術検証）。

## Step 0：hqの方針確認（作業開始前に必ず読む）

このリポジトリは `hq/products/asobi-share/` に配置されている前提。
プロジェクト横断の方針・設定は自動では読み込まれないので、作業開始前に必ず以下を読むこと：

- `../../CLAUDE.md` — hqリポジトリ自体の運用ルール
- `../../org/repo-architecture.md` — リポジトリ構成・feedback運用の全体方針

## CEOフィードバックの記録ルール（feedback/ と tasks/ の二重記録）

CEOからフィードバック（「いいね」「直して」等）があった場合、**即時に以下の両方へ記録する**。
片方だけで済ませない。

1. **`feedback/[職種].md`** — 職種別のFBナレッジDB。内容に関わる職種を判断し、該当する
   すべての職種ファイルに記録する。フォーマットは各ファイル冒頭を参照。

   対象職種ファイル：frontend-engineer / mobile-engineer / backend-engineer / qa-engineer /
   network-security-engineer / infra-engineer / corporate-planning / ui-ux-designer /
   brand-designer / planning / marketing / sales / finance / hr

   将来、いずれかの職種ファイルにデータが十分蓄積されたら、その職種を横断エージェント化して
   `hq/agents/[職種].md` に切り出す構想がある（切り出しの基準・手順は `../../org/repo-architecture.md` 参照）。

2. **`tasks/board.md`** — 久野・Seitaroの2人でプロダクト開発の進捗を共有する共同タスクボード。
   CEOのFBは実質的にタスクなので、同じ内容をタスク化して `tasks/board.md` に追記する。
   全タスクはこの1本に集約する（職種タグで分類し、職種別ファイルには分けない）。
   書き方・職種タグ一覧は `tasks/README.md` を参照。
   - タスクを完了したら `- [ ]` を `- [x]` に変え、完了者・完了日を追記し、
     「未完了」セクションから「完了」セクションへ移動する。
   - どちらが追加してもよい。追加者は必ず「起票」に自分の名前を残す。
