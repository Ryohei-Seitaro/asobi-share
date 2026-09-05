# CLAUDE.md — asobi-share

遊び・旅行シェアアプリ（仮）。コンセプトは `docs/20260826_ceo-goal.md` を参照。
現状はPoC段階（`poc-exif/` — EXIF自動旅程生成の技術検証）。

## Step 0：hqの方針確認（作業開始前に必ず読む）

このリポジトリは `hq/products/asobi-share/` に配置されている前提。
プロジェクト横断の方針・設定は自動では読み込まれないので、作業開始前に必ず以下を読むこと：

- `../../CLAUDE.md` — hqリポジトリ自体の運用ルール
- `../../org/repo-architecture.md` — リポジトリ構成・feedback運用の全体方針

## feedback/ ディレクトリ運用ルール

CEOからフィードバック（「いいね」「直して」等）があった場合、内容に関わる職種を判断し、
`feedback/[職種].md` に即時記録する。1つのフィードバックが複数職種にまたがる場合は該当する
すべてのファイルに記録してよい。

対象職種ファイル：
- frontend-engineer.md（フロントエンジニア）
- mobile-engineer.md（モバイルアプリエンジニア）
- backend-engineer.md（バックエンドエンジニア）
- qa-engineer.md（品質管理エンジニア）
- network-security-engineer.md（ネットワーク/セキュリティエンジニア）
- infra-engineer.md（インフラエンジニア）
- corporate-planning.md（経営企画）
- ui-ux-designer.md（UI/UXデザイナー）
- brand-designer.md（ブランドデザイナー）
- planning.md（企画）
- marketing.md（マーケティング）
- sales.md（営業）
- finance.md（ファイナンス）
- hr.md（人事）

各ファイルのフォーマットは各ファイル冒頭を参照。

将来、いずれかの職種ファイルにデータが十分蓄積されたら、その職種を横断エージェント化して
`hq/agents/[職種].md`に切り出す構想がある（切り出しの基準・手順は `../../org/repo-architecture.md` 参照）。
