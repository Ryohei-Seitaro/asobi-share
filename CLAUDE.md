# CLAUDE.md — asobi-share

遊び・旅行シェアアプリ（仮）。コンセプトは `docs/20260826_ceo-goal.md` を参照。
現状はPoC段階（`poc-exif/` — EXIF自動旅程生成の技術検証）。

## Step 0：hqの方針確認（作業開始前に必ず読む）

このリポジトリは `hq/products/asobi-share/` に配置されている前提。
プロジェクト横断の方針・設定は自動では読み込まれないので、作業開始前に必ず以下を読むこと：

- `../../CLAUDE.md` — hqリポジトリ自体の運用ルール
- `../../org/repo-architecture.md` — リポジトリ構成・feedback運用の全体方針

## CEOフィードバックの記録ルール（feedback/ と tasks/ の二重記録）

ここでの「CEO」はこのリポジトリでClaude Codeに指示を出す本人（Ryohei/Seitaroのうち
セッションを操作している方）を指す組織上の建て付けで、実在の別人格ではない。そのため
「CEOフィードバック」は褒める／直す等の狭い意味に限らず、**Claude Codeへの指示全般を指す**。
何かを依頼された場合、**即時に以下の両方へ記録する**。片方だけで済ませない。

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

## memory/ ディレクトリ運用ルール

AIとの対話の中で決まったこと・実装した内容を`memory/`に記録し、Ryohei/Seitaroが
お互いに後から参照・意思決定できるようにする。

- ファイル名：`memory/YYYYMMDD_スラッグ.md`（1トピック=1ファイル）
- 索引：`memory/INDEX.md`に1行で追記（新しい順）
- 記録すべきタイミング：方針・設計・実装方法が「決まった」瞬間、または実装が完了した瞬間
- 全社横断の内容（他プロダクト・hq自体に影響する決定）は、このリポジトリの`memory/`ではなく
  `../../memory/`（hq側）に記録する

## Git運用ルール

詳細は `../../org/git-workflow.md`。**現方針は開発スピード優先＝マージをブロックする
ゲートは置かない。** 要点：

- `main`への直pushはしない。機能追加・バグ修正・リファクタは**ブランチを切る**
  （`feat/` `fix/` `refactor/` `chore/` `docs/` `hotfix/` ＋短いスラッグ、1ブランチ＝1目的）。
- マージは**PR経由・squash merge固定**。PR作成時、Claudeが「変更概要／実装した機能・
  修正内容／レビュー観点／動作確認手順／関連リンク」をテンプレートに沿って記入する。
- **PR作成〜マージまでClaudeが実行してよい。** 「PR出して」＝作成まで、「マージまでやって」
  ＝`gh pr merge <番号> --squash --delete-branch`まで（CIのgreenは待たない）。
- 相手のApproveは不要。セルフ動作確認は各自の心構え（マージのブロック条件ではない）。
  高リスク変更（スキーマ／認証／課金／共通基盤／後方非互換）はマージ前に相手へ一声かける。
- マージ後：ブランチ削除、`memory/`へ記録、CEOフィードバック起点なら`feedback/`と
  `tasks/board.md`も更新。
- **セッション開始時、前回pull以降にマージされたPRがあれば、その変更内容を
  ユーザーに1〜3行で説明してから作業に入る**（`gh pr list --state merged --limit 10`）。
