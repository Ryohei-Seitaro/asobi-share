# tasks/board.md — asobi-share 共同タスクボード

久野・Seitaroの共同タスクボード。書き方は `README.md` を参照。

---

## 未完了

### Webアプリ本実装（Next.js）

土台（Next.js雛形・Clerk認証・Neon+Drizzle・Vercelデプロイ）は構築済み。
以降はモック（`mockup/itinerary-mock.html`）の中身をNext.jsページとして実装するフェーズ。

- [ ] [backend] `poc-exif/`のEXIF自動旅程生成PoCを本実装に統合する（写真アップロード→実際レイヤーの自動生成） (起票: 久野, 2026-09-05)
- [ ] [backend][network-security] 認証必須ページ（つくる・マイページ・購入系API）の保護をClerkのリソースベース認証チェックに揃える（`createRouteMatcher`は非推奨警告が出ている） (起票: 久野, 2026-09-05)
- [ ] [qa] 本番デプロイ前の一通りのQA（主要導線の動作確認・レスポンシブ確認） (起票: 久野, 2026-09-05)
- [ ] [infra][backend] Google Calendar連携の本番運用に向けて、Clerk DashboardでGoogleソーシャル接続を独自クレデンシャル化し`calendar.events`スコープを追加する（Google Cloud ConsoleでのOAuthクライアント作成・Calendar API有効化を含む） (起票: 久野, 2026-09-06)
- [ ] [backend] Seitaro側のローカル/開発DBでも`web/scripts/backfill-trip-filters.ts`を実行し、既存tripsのnights/international/partySize系が正しい値になっているか確認する (起票: 久野, 2026-09-06)
- [ ] [backend][infra] 本番Neon（Ryoheiの共有プロジェクト）に trip が0件。`web/scripts/seed.ts` を本番 `DATABASE_URL` に対して実行してシードする（見つける画面が空なのはこれが原因。スキーマは反映済み） (起票: Seitaro, 2026-09-07)
- [ ] [infra][backend] （任意）`withColdStartRetry` 相当のDB読み取りリトライを `/trips/[id]`・`/me` 等の他ページにも広げるか検討する。`src/db` に共通ヘルパを置く案。頻度を見てから (起票: Seitaro, 2026-09-07)

## 完了

- [x] [frontend][infra][qa] 本番で「This page couldn't load / A server error occurred（ERROR 2379659138）」。原因＝Neon（サーバーレスPostgres）がアイドルでゼロにスケールし、コールドスタート直後の最初のDBクエリが一過性で失敗。かつ `error.tsx` が無く Next の素の全画面エラーが出ていた（`loading.tsx` はエラーを捕捉しない）。対応：`(app)/error.tsx`（再読み込み導線つき）＋ `global-error.tsx` を追加、見つける画面のDB読み取りを `withColdStartRetry`（700ms待って1回リトライ）でラップ。PR #17 は原因ではない（以前からリクエスト時のDB読み取りが無防備だった）。※本番DBが trip 0件なのは別問題（未完了に起票）（`memory/20260907_prod-error-boundary-and-neon-cold-start.md`） (起票: Seitaro, 2026-09-07 / 完了: Seitaro, 2026-09-07)

- [x] [frontend][backend][qa] 操作ごとに左下「Rendering」＋ロードが走りUXが悪い問題の高速化（PR #17）。見つける画面はフィルタ/タブ/並べ替え/検索が全てフルのサーバー遷移で、1操作ごとに Clerk API 1往復＋DBクエリ直列4往復が走っていた。対応：(1)`lib/auth` の `getOrCreateUser` を `currentUser()`→`auth()` ベースに（既存ユーザーは usersのPK参照1発、Clerk API往復を毎回除去。初回のみ `currentUser()` フォールバック）。読み取り専用ページ用に `getCurrentUserId()` 追加。(2)見つける画面：`getCurrentUserId()` 化＋一覧/保存ID/購入IDを `Promise.all` 並列化。(3)旅程詳細：`getCurrentUserId()` 化。(4)マイページ：旅程一覧＋残高を `Promise.all` 並列化。(5)`(app)/loading.tsx`・`trips/[id]/loading.tsx` 追加で遷移直後に即スケルトン表示。※「Rendering」インジケータ自体は `next dev` 限定で本番には出ない。／**2巡目**（CEO「フィルタ選択がまだ遅い」）：見つける画面をクライアント側フィルタリングに作り替え。旅程を1回だけ全件取得して `DiscoverClient`（"use client"）へ渡し、チップ/タブ/検索は `<Link>` をやめて state 更新＝ネットワークゼロで即再描画。URLは `history.replaceState` で同期（共有・戻る操作は維持）。フィルタ条件は `lib/discover-filters.ts` に集約し元のDrizzleクエリと同等（OLD/NEW 7パターンで件数一致を確認）。DBインデックス追加はデータ増加時の後回し（`memory/20260907_discover-render-latency.md`） (起票: Seitaro, 2026-09-07 / 完了: Seitaro, 2026-09-07)

- [x] [frontend][backend][ui-ux] ⑦＋関連（有料記事まわり・PR #15 に1ブランチで集約）。⑦ 有料記事のコイン購入UIが出ない不具合＝有料トリップに時間割が無く`hasDetail=false`で早期returnしていた。`Paywall`（note風「ここから先は有料」区切り＋購入パネル）を時間割の有無に関わらず、有料ライン（最初のロック済みイベント）の縦位置にグリッドへ重ねて表示。`CoinSheet`（コイン支払い確認）、未購入は有料本文をサーバー側で伏せる、seedにサンプル時間割。／①修正：カレンダー登録の`oauth_token_retrieval_error`をtry/catchで握って500回避。保存時のカレンダーポップアップ自動表示を廃止。／購入済みマーク（見つけるカード`PurchasedBadge`＋価格チップ／旅程詳細ヘッダー、`tripPurchases`集計）。／残高不足時のチャージ往復：`CoinSheet`不足時→`/me/charge?need=N&return=/trips/{id}`、`return`は自サイト内絶対パスのみ許可、初期額を不足分に、完了1.4秒後に自動で記事へ戻す＋「記事に戻る」、`chargeCoin(amountYen, revalidate?)`で戻り先を`revalidatePath`。／`CoinSheet`・`AddToCalendar`のポップアップを中央モーダル化（ボトムシート廃止）。／「カレンダーに追加」ポップアップから`.icsファイルを保存`を削除しGoogle直接登録（API方式）に一本化（TripEditorの.ics・APIルートは残す） (起票: Seitaro, 2026-09-06 / 完了: Seitaro, 2026-09-06)

- [x] [frontend][ui-ux][planning] ⑥検索ウィザードを「見つける」のフィルタ欄に統合。`/search` は `/` へリダイレクト化、ボトムナビから「検索」タブを削除、見つけるヘッダーの虫めがねリンクを撤去。「行き先・キーワードで探す」を実際に効く GET フォーム化（`?q=` で title/genre を ilike 検索、現フィルタは hidden で維持）。フィルタが効いているときは `<details>` を開いた状態に (起票: Seitaro, 2026-09-06 / 完了: Seitaro, 2026-09-06)
- [x] [frontend][backend][ui-ux] ⑤フィルタは①③④でジャンル2階層・国内海外・日数・人数・予算・季節まで対応済み。残りの「つくるで必須入力化」を実施：つくる新規フォームで国内/海外・人数を必須（`required`＋サーバ側バリデーション）、メモ取り込みにも国内/海外・人数の入力欄を追加。日数はDAY数から自動（④）なので手動必須からは外した (起票: Seitaro, 2026-09-06 / 完了: Seitaro, 2026-09-06)
- [x] [frontend][backend][ui-ux][planning] ④旅程を日付ベースに。`trips.start_date`（date, nullable）を追加、DAY数から日数（nights/daysLabel）を自動算出、開始月で季節を判定。見つけるに季節フィルタ、カード/詳細に「◯月・季」バッジ、つくる新規/編集/メモ取り込みに `type=date` 入力。**要 `drizzle-kit push`**（`memory/20260906_date-based-itinerary.md`） (起票: Seitaro, 2026-09-06 / 完了: Seitaro, 2026-09-06)
- [x] [frontend][ui-ux][planning] ③ジャンルを「カテゴリ＞サブジャンル」2階層化。`lib/genres.ts`にタクソノミー（定番/遊び・合宿/山・キャンプ/水辺/ウィンター/スポーツ）。見つけるフィルタはカテゴリchips→サブジャンルchipsの2段。つくる/メモ取り込みは`optgroup`付きselect。`trips.genre`は葉のまま保持しDBマイグレーション不要 (起票: Seitaro, 2026-09-06 / 完了: Seitaro, 2026-09-06)
- [x] [frontend][ui-ux] ②検索：ヘッダーの戻る導線を「とじる」（×アイコン＋テキスト、右寄せ）に変更し、ウィザード内の戻るを「← 前の質問へ」に改名。同じ「戻る」が2つ並んで見える問題を解消 (起票: Seitaro, 2026-09-06 / 完了: Seitaro, 2026-09-06)
- [x] [frontend][backend][ui-ux] ①見つける：保存した旅程を日程指定してカレンダー（Google / .ics=TimeTree等）に飛ばすボタンを追加。導線「保存→カレンダーに追加しますか？→出発日選択→反映」。`AddToCalendar`モーダル、`lib/tripCalendar.ts`、`/api/trips/[id]/ics?start=`、`addTripToGoogleCalendar` action。TimeTreeは.ics共有取り込みで対応（直接API連携は将来） (起票: Seitaro, 2026-09-06 / 完了: Seitaro, 2026-09-06)

- [x] [backend][qa] 「見つける」→旅程詳細（`/trips/[id]`）を開くとNeon DBエラー（`column trips_days_events.map_url does not exist`）。個人用Neon（asobi-share-dev）へのdrizzleスキーマ反映漏れが原因。`npx dotenv -e .env.local -- drizzle-kit push` で `trip_events.map_url` / `tabelog_url` を追加して解消 (起票: Seitaro, 2026-09-06 / 完了: Seitaro, 2026-09-06)
- [x] [frontend] メモ取り込み画面の写真枚数上限（5枚）を撤廃する (起票: 久野, 2026-09-06 / 完了: 久野, 2026-09-06)
- [x] [frontend][backend] メモ取り込み画面で写真が1MBまでしか載せられない制限を緩和する (起票: 久野, 2026-09-06 / 完了: 久野, 2026-09-06) ※Server Actionsのボディ上限を50MBに拡大
- [x] [backend] メモ取り込みのテキスト解析で複数日程が1日にまとまってしまう不具合を直す (起票: 久野, 2026-09-06 / 完了: 久野, 2026-09-06)
- [x] [frontend][ui-ux] 「つくる」画面の有料ラインをドラッグで動かせるようにする（現状はクリックでの境界切り替えのみ） (起票: 久野, 2026-09-06 / 完了: 久野, 2026-09-06)
- [x] [frontend][backend][infra] Googleカレンダーへワンクリックで直接予定を一括登録できるようにする（Clerk経由のOAuthアクセストークンでGoogle Calendar APIを呼び出し） (起票: 久野, 2026-09-06 / 完了: 久野, 2026-09-06) ※本番運用にはClerk Dashboard側の追加設定が別途必要（未完了リスト参照）
- [x] [frontend][ui-ux] メモ取り込み画面（`/create/memo`）で「投稿する」を押す前に、実際の旅程に近いビジュアルプレビュー（タイムライン表示）を見れるようにする (起票: 久野, 2026-09-06 / 完了: 久野, 2026-09-06)
- [x] [frontend][backend] 予定作成の「どこへ行く」欄の下にGoogleマップの位置情報URL・食べログページURLを入力できるようにする (起票: 久野, 2026-09-06 / 完了: 久野, 2026-09-06)
- [x] [frontend][ui-ux] 「つくる」画面の予定編集をGoogleカレンダー風のドラッグ操作で作成できるようにする（ドラッグで開始〜終了を範囲選択） (起票: 久野, 2026-09-06 / 完了: 久野, 2026-09-06)
- [x] [frontend] 「つくる」画面の時間刻みを15分刻みから1分刻みに変更する (起票: 久野, 2026-09-06 / 完了: 久野, 2026-09-06)
- [x] [frontend][ui-ux] 予定作成時にジャンル入力を必須項目から外す（任意化 or 撤廃） (起票: 久野, 2026-09-06 / 完了: 久野, 2026-09-06)
- [x] [frontend][ui-ux][backend] 予定作成UIをGoogleカレンダーの入力UI相当に作り直し、Googleカレンダーとのデータ互換性（iCal/Google Calendar API形式でのインポート・エクスポート）を持たせる (起票: 久野, 2026-09-06 / 完了: 久野, 2026-09-06)
- [x] [frontend][backend][finance] マイページ「稼いだお金を受け取る」の申請先画面（振込先登録・申請フォーム）を実装する (起票: 久野, 2026-09-06 / 完了: 久野, 2026-09-06)※`payout_accounts`/`payout_requests`テーブルはスキーマ追加済み・DB反映は未実行
- [x] [frontend][backend][finance] コインのチャージ画面を実装する (起票: 久野, 2026-09-06 / 完了: 久野, 2026-09-06)
- [x] [frontend][planning] 検索ウィザード（明日何する？）の各設問（日付・人数・誰と・出発地・移動時間・予算）に当てはまらないケース用の自由記入欄を追加する (起票: 久野, 2026-09-06 / 完了: 久野, 2026-09-06)
- [x] [frontend][backend][planning] チャットに付箋（メモ取り込み）ボタンを設置し、テキスト＋写真を入力すると投稿フォーマットの旅程案を自動生成して投稿できる機能を作る (起票: 久野, 2026-09-06 / 完了: 久野, 2026-09-06)
- [x] [frontend][ui-ux] 旅程カードの写真表示を3枚固定からスライド（スワイプ/矢印）で全枚数閲覧できるようにする (起票: 久野, 2026-09-06 / 完了: 久野, 2026-09-06)
- [x] [frontend][brand] ダミー人物名「あいり」を全箇所「あそびくん」に統一する (起票: 久野, 2026-09-06 / 完了: 久野, 2026-09-06)
- [x] [frontend][brand] X・Instagram・LINEのシェアアイコンをプレースホルダーから公式アイコンに差し替える (起票: 久野, 2026-09-06 / 完了: 久野, 2026-09-06)

- [x] [frontend][planning] チャット気分提案機能をサーバー側ロジック（気分→旅程マッチング）込みで実装する (起票: 久野, 2026-09-05 / 完了: 久野, 2026-09-05)

- [x] [backend][finance] コイン決済・購入フロー（tripPurchases・coinTransactions）を実装する。前払式支払手段の法務確認は未対応のまま残る (起票: 久野, 2026-09-05 / 完了: 久野, 2026-09-05)
- [x] [backend] 保存（tripSaves）・いいね（tripLikes）機能をDB連携で実装する (起票: 久野, 2026-09-05 / 完了: 久野, 2026-09-05)
- [x] [frontend] 「シェア」画面（OGPカード・SNSシェア導線）を実装する (起票: 久野, 2026-09-05 / 完了: 久野, 2026-09-05)
- [x] [frontend][backend] 「つくる」画面（旅程エディタ）を実装する。15分刻みグリッド、有料ライン可変位置、公開設定・値づけ (起票: 久野, 2026-09-05 / 完了: 久野, 2026-09-05)
- [x] [frontend][backend] 「マイページ」画面を実装する。保存数・コイン残高・売上受け取り申請・自分の旅程一覧 (起票: 久野, 2026-09-05 / 完了: 久野, 2026-09-05)
- [x] [frontend] 「検索」画面（条件ウィザード）を実装する。天気自動取得は当面ダミー値でよい (起票: 久野, 2026-09-05 / 完了: 久野, 2026-09-05)
- [x] [frontend][ui-ux] モックのデザイントークン（配色・フォント・余白）をTailwind設定に移植する (起票: 久野, 2026-09-05 / 完了: 久野, 2026-09-05)
- [x] [backend] モックの`FEED`/`DAYS`データをシードスクリプト化し、DB（trips/trip_days/trip_events等）に投入する (起票: 久野, 2026-09-05 / 完了: 久野, 2026-09-05)
- [x] [frontend][backend] 「見つける」画面（トップページ）をDB接続で実装する。カード一覧・ジャンルchips・並べ替え（保存/ランキング/いいね順） (起票: 久野, 2026-09-05 / 完了: 久野, 2026-09-05)
- [x] [frontend][backend] 「旅程詳細」画面を実装する。計画/実際の2層、Googleマップ／食べログ外部リンク、paywall（円/コイン購入） (起票: 久野, 2026-09-05 / 完了: 久野, 2026-09-05)
- [x] [infra][backend] Next.js雛形・Clerk認証・Neon+Drizzle・Vercelデプロイの土台構築 (起票: 久野, 2026-09-05 / 完了: 久野, 2026-09-05)
- [x] [frontend][ui-ux] モック画像をSVGプレースホルダーから実写真に置き換える (起票: 久野, 2026-09-05 / 完了: 久野, 2026-09-05)
- [x] [frontend][backend] 旅程エディタで場所（ロッカー等）をタップするとGoogleマップの場所情報へ遷移できるようにする (起票: 久野, 2026-09-05 / 完了: 久野, 2026-09-05)
- [x] [frontend][backend] 昼食などの飲食スポットをGoogleマップ／食べログへの外部リンクにする (起票: 久野, 2026-09-05 / 完了: 久野, 2026-09-05)
- [x] [planning][finance] 保存数の報酬を現金ではなく「アプリ内専用コイン」にする。有料コンテンツは現金/コインどちらでも購入できるようにする（前払式支払手段の該当性は要コーポレート確認） (起票: 久野, 2026-09-05 / 完了: 久野, 2026-09-05)
- [x] [frontend][ui-ux] 旅程一覧を「ランキング順」「いいね順」で並べ替えられるようにする (起票: 久野, 2026-09-05 / 完了: 久野, 2026-09-05)
- [x] [frontend][planning][backend] チャット起動ボタンを設置し、気分を質問（選択式or自由記入）して旅程を提案する機能を作る (起票: 久野, 2026-09-05 / 完了: 久野, 2026-09-05)
- [x] [planning][ui-ux] アクティビティ別ジャンルタグを拡充する（山登り・ゴルフ・釣り・キャンプ・海・川・湖・BBQ・スノボ・スキー・ピックルボール等） (起票: 久野, 2026-09-05 / 完了: 久野, 2026-09-05)
- [x] [frontend][ui-ux][planning] 発見画面を1問1答のウィザード形式に再設計する（明日なにする？→時期→誰と→人数→出発地→移動時間→予算→天気自動取得→おすすめを見る）※実装時にCEO指示で仕様変更：ホーム（見つける）は一覧表示に固定し、ウィザードは「検索」タブとして独立させた (起票: 久野, 2026-09-05 / 完了: 久野, 2026-09-05)
- [x] [frontend][planning] 投稿者が有料ラインをタイムライン上の好きな位置に挿入できるUIにする（現状は先頭固定） (起票: 久野, 2026-09-05 / 完了: 久野, 2026-09-05)
- [x] [frontend][backend] マイページに「保存した旅程」（tripSaves）を確認できるセクションを追加する (起票: Seitaro, 2026-09-06 / 完了: Seitaro, 2026-09-06)
- [x] [frontend][backend] 見つける画面のソートタブの横に「わたしの旅程」「保存済み」タブを追加する。未ログイン時はサインインを促す (起票: Seitaro, 2026-09-06 / 完了: Seitaro, 2026-09-06)
- [x] [frontend] 見つける画面のカードに、既に保存済みの旅程だとわかるマークを表示する (起票: Seitaro, 2026-09-06 / 完了: Seitaro, 2026-09-06)
- [x] [frontend][ui-ux] マイページの「わたしの旅程」「保存した旅程」一覧を削除する（見つける画面のタブに統合したため。統計情報は残す） (起票: Seitaro, 2026-09-06 / 完了: Seitaro, 2026-09-06)
- [x] [frontend][backend][ui-ux] 見つける画面のフィルタをジャンルのみから「フィルタ」パネル（ジャンル・国内海外・日数・人数・予算）に拡張する。tripsテーブルにnights/international/partySizeMin/partySizeMaxを追加し、シードデータも更新 (起票: Seitaro, 2026-09-06 / 完了: Seitaro, 2026-09-06)
