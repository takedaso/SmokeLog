# 領収書管理アプリ 設計書（ドラフト v0.1）

> 領収書をスマホで撮影し、案件別・顧客別に集計・管理する System of Record（SoR）。
> 作成日: 2026-11-02 / 対象: 小規模チーム（数名〜20名程度）

---

## 1. 前提と方針

| 項目 | 決定事項 |
|---|---|
| 利用者 | 小規模チームで共有（顧客・案件マスタを共有し、登録者を記録する） |
| 形態 | Web アプリ（PWA）。スマホブラウザのカメラで撮影 |
| 技術基盤 | Next.js（App Router）+ Supabase（Auth / Postgres / Storage） |
| 読み取り | AI（マルチモーダル LLM）で自動抽出 → 人が確認・修正して確定 |
| 位置付け | 経費精算システムではなく「領収書の正本台帳」。承認・支払・会計仕訳は対象外 |

設計方針:

1. **画像が正本、データは索引**。原本画像は改変せず保存し、抽出データは確認済みかどうかを状態で区別する。
2. **AI は下書き担当**。AI の抽出結果は必ず人の確認を経て確定する（Human-in-the-loop）。
3. **集計はクエリで出す**。集計値はテーブルに持たず、確定済みデータからビューで算出する（二重管理を避ける）。
4. **変更履歴を残す**。SoR として「いつ・誰が・何を変えたか」を追跡できるようにする。

> 補足: 本リポジトリ（SmokeLog）は禁煙サポートアプリであり、本アプリは別プロダクトとなる。実装着手時は新規リポジトリでの開発を推奨する。技術スタックは SmokeLog と同一のため、Supabase 認証・クライアント実装（`lib/supabase/*`、`middleware.ts`）は流用可能。

---

## 2. ベンチマーク

### 2.1 調査対象

| 製品 | 区分 | 特徴的な機能 |
|---|---|---|
| マネーフォワード クラウド経費 | 国内・経費精算 | スマホ撮影＋OCR、電子帳簿保存法対応、プロジェクト（案件）別の経費管理、会計ソフト連携 |
| freee 会計（ファイルボックス） | 国内・会計 | 証憑の一元保管、OCR 読取、証憑と取引の紐付け、電帳法対応の検索 |
| 楽楽精算 | 国内・経費精算 | 領収書読取、承認ワークフロー、規程チェック |
| Expensify | 海外・経費精算 | SmartScan（撮影→自動抽出）、タグ/カテゴリによる分類、レポート単位の集計 |
| Dext Prepare | 海外・証憑管理 | 受信箱（Inbox）→確認→公開 のレビューフロー、重複検知、取引先ルールによる自動分類 |
| Zoho Expense | 海外・経費精算 | Customer / Project を経費に紐付け、顧客別・案件別レポート |

### 2.2 共通する機能パターンと採否

| # | 機能パターン | 代表例 | 本アプリでの採否 |
|---|---|---|---|
| B1 | 撮影→自動抽出→確認の3ステップ | Expensify, Dext, MF | **採用（コア）** |
| B2 | 「要確認」受信箱（未処理キュー） | Dext Inbox | **採用**。ホーム画面を要確認キューにする |
| B3 | 顧客・案件の階層タグ付け | Zoho Expense, MF | **採用（コア）**。顧客 1 : N 案件 |
| B4 | 重複検知 | Dext, MF | **採用**。画像ハッシュ＋（日付・金額・取引先）一致 |
| B5 | 取引先ルールによる自動分類 | Dext, freee | **採用（簡易版）**。過去の取引先→科目・案件の推定 |
| B6 | 電帳法の検索要件（日付・金額・取引先） | MF, freee | **採用**。検索項目として標準装備 |
| B7 | 適格請求書（インボイス）登録番号の保持 | MF, freee | **採用**。項目として保持、形式チェックのみ |
| B8 | CSV エクスポート（会計ソフト取込） | 全製品 | **採用**。汎用 CSV |
| B9 | 承認ワークフロー | 楽楽精算, Expensify | **不採用**（SoR 用途のため） |
| B10 | 立替精算・振込 | 楽楽精算, Expensify | **不採用** |
| B11 | 法人カード・交通系 IC 連携 | MF, 楽楽精算 | **不採用**（将来検討） |
| B12 | 多通貨 | Expensify, Zoho | **項目のみ保持**（通貨コード）、換算は対象外 |

---

## 3. スコープ

### 3.1 MVP（v1）

- メール/パスワード認証、ワークスペース（チーム）とメンバー招待
- 領収書の撮影/アップロード（複数枚まとめて可、1領収書あたり複数ページ可）
- AI による項目抽出と確認・修正画面
- 顧客・案件・勘定科目のマスタ管理
- 領収書一覧（検索・フィルタ・並び替え）、詳細、編集、取消（論理削除）
- 集計：案件別・顧客別・月別・科目別、期間指定
- CSV エクスポート（明細・集計）
- 重複検知、変更履歴

### 3.2 v2 以降の候補

- 取引先ルール（自動分類）の明示的な編集 UI
- メール転送 / PDF 取込（電子取引データ）
- 案件予算と実績比較
- 会計ソフト向け CSV フォーマット（freee / MF / 弥生）
- オフライン撮影キュー（PWA の Background Sync）

---

## 4. ユーザーとロール

| ロール | 権限 |
|---|---|
| owner | 全権限、メンバー管理、ワークスペース削除 |
| admin | マスタ管理、全領収書の編集・取消、エクスポート |
| member | 領収書の登録、自分が登録した未確定領収書の編集、全件の閲覧・集計 |

> 小規模チームのため閲覧は全員可とし、編集権限のみロールで制御する。確定済み領収書の修正は admin 以上とし、修正は履歴に残す。

---

## 5. 業務フロー

```
[撮影/アップロード]
      │  画像を Storage に保存、receipt を status=processing で作成
      ▼
[AI 抽出]（サーバー側・非同期）
      │  日付/取引先/金額/税額/登録番号/科目候補/案件候補 を抽出
      ▼
[要確認 needs_review] ──（重複疑いあり → 警告表示）
      │  ユーザーが画像を見ながら確認・修正、顧客/案件を指定
      ▼
[確定 confirmed]  ── 集計・エクスポートの対象
      │
      ├─ 修正（admin）→ 履歴に差分を記録
      └─ 取消 void（理由必須、データは残す）
```

ステータス定義:

| status | 意味 | 集計対象 |
|---|---|---|
| `processing` | AI 抽出中 | × |
| `needs_review` | 抽出完了・未確認（抽出失敗時もここに入り手入力） | × |
| `confirmed` | 確認済み・確定 | ○ |
| `void` | 取消（重複・誤登録など） | × |

---

## 6. 画面設計

| ID | 画面 | 主な要素 |
|---|---|---|
| S01 | ログイン / サインアップ | SmokeLog の実装を流用 |
| S02 | ホーム（ダッシュボード） | 要確認件数・今月の確定額・累計額、要確認キュー、顧客別/案件別（上位5）・月別（直近6か月）の集計、撮影ボタン（FAB）。集計は取引日ベース・確定済みのみ |
| S03 | 撮影 / アップロード | カメラ起動（`<input type="file" accept="image/*" capture="environment">`）、連続撮影、ギャラリー選択、PDF 選択 |
| S04 | 確認・修正 | 上：画像（拡大/回転）、下：抽出項目フォーム。AI 信頼度が低い項目をハイライト。顧客→案件の連動選択、重複警告、「確定」「保存して次へ」 |
| S05 | 領収書一覧 | フィルタ（期間、顧客、案件、科目、取引先、金額範囲、ステータス、登録者）、サムネイル付きリスト、一括で案件付け替え |
| S06 | 領収書詳細 | 画像、項目、変更履歴タブ、取消 |
| S07 | 集計 | 軸切替（案件/顧客/月/科目）、期間指定、合計・件数・税率別内訳、グラフ（recharts）、クリックで明細へドリルダウン、CSV 出力 |
| S08 | 顧客マスタ | 一覧・登録・編集・アーカイブ |
| S09 | 案件マスタ | 顧客に紐付け、案件コード、期間、ステータス（進行中/完了） |
| S10 | 勘定科目マスタ | 初期値：旅費交通費、会議費、交際費、消耗品費、通信費、新聞図書費、雑費 等 |
| S11 | 設定 / メンバー | 招待、ロール変更 |

UX 上のポイント（ベンチマークより）:

- 撮影は「連続撮影→後でまとめて確認」を基本にする（Dext / Expensify 型）。撮影時点で入力を求めない。
- 確認画面は「保存して次へ」で要確認キューを連続処理できるようにする。
- 前回選んだ顧客・案件を既定値にする（同じ案件の領収書が続くことが多いため）。

---

## 7. データモデル

### 7.1 ER 概要

```
workspaces 1─N workspace_members N─1 auth.users
workspaces 1─N customers 1─N projects
workspaces 1─N categories
workspaces 1─N receipts N─1 customers
                         N─1 projects (任意)
                         N─1 categories (任意)
receipts   1─N receipt_files
receipts   1─N receipt_events（変更履歴）
```

案件を持たない顧客単位の経費（例：営業訪問の交通費）を許容するため、`receipts` は `customer_id` と `project_id` を両方持つ。`project_id` が設定された場合、`customer_id` は案件の顧客と一致することをトリガーで保証する。顧客にも案件にも属さない経費（社内経費）は両方 NULL とする。

### 7.2 DDL（Supabase / Postgres）

```sql
-- ワークスペース（チーム）
create table workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create type member_role as enum ('owner', 'admin', 'member');

create table workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         member_role not null default 'member',
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- 顧客
create table customers (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  code         text,                            -- 未指定時は連番を自動採番
  name         text not null,
  name_norm    text generated always as (normalize_vendor(name)) stored,  -- 照合用の正規化名
  invoice_reg_no text check (invoice_reg_no ~ '^T[0-9]{13}$'),          -- 照合キー（最優先）
  source       text not null default 'manual',  -- manual / ocr（領収書の取引先から自動登録）
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (workspace_id, code)
);
create index on customers (workspace_id, name_norm);
create index on customers (workspace_id, invoice_reg_no);

-- 案件
create type project_status as enum ('active', 'closed');

create table projects (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  customer_id  uuid not null references customers(id),
  code         text,
  name         text not null,
  status       project_status not null default 'active',
  started_on   date,
  ended_on     date,
  created_at   timestamptz not null default now(),
  unique (workspace_id, code)
);

-- 勘定科目
create table categories (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  sort_order   int not null default 0,
  archived_at  timestamptz,
  unique (workspace_id, name)
);

-- 領収書（台帳本体）
create type receipt_status as enum ('processing', 'needs_review', 'confirmed', 'void');

create table receipts (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references workspaces(id) on delete cascade,
  status             receipt_status not null default 'processing',

  -- 証憑項目（電帳法の検索要件：日付・金額・取引先）
  issued_on          date,                       -- 取引日
  vendor_name        text,                       -- 取引先（発行者、レシート記載のまま）
  vendor_company     text,                       -- 店舗名を除いた会社・ブランド名（AI 抽出）
  invoice_reg_no     text check (invoice_reg_no ~ '^T[0-9]{13}$'),  -- 適格請求書発行事業者登録番号
  amount_total       numeric(14,0) check (amount_total >= 0),       -- 税込合計（円）
  amount_tax_10      numeric(14,0),              -- 10%対象の消費税額
  amount_tax_8       numeric(14,0),              -- 8%（軽減）対象の消費税額
  currency           char(3) not null default 'JPY',
  payment_method     text,                       -- 現金/カード/電子マネー 等
  description        text,                       -- 但し書き・品目

  -- 分類
  customer_id        uuid references customers(id),
  project_id         uuid references projects(id),
  category_id        uuid references categories(id),
  memo               text,

  -- AI 抽出
  ocr_result         jsonb,                      -- 抽出結果の生データ（再確認用）
  ocr_confidence     jsonb,                      -- 項目別の信頼度
  duplicate_of       uuid references receipts(id),  -- 重複疑いの相手

  -- 監査
  created_by         uuid not null references auth.users(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  confirmed_by       uuid references auth.users(id),
  confirmed_at       timestamptz,
  void_reason        text,

  -- 確定時は必須項目が揃っていること
  constraint confirmed_requires_fields check (
    status <> 'confirmed'
    or (issued_on is not null and vendor_name is not null and amount_total is not null)
  ),
  constraint void_requires_reason check (status <> 'void' or void_reason is not null)
);

create index on receipts (workspace_id, issued_on);
create index on receipts (workspace_id, project_id);
create index on receipts (workspace_id, customer_id);
create index on receipts (workspace_id, status);
create index on receipts (workspace_id, vendor_name);

-- 画像ファイル（1領収書に複数ページ）
create table receipt_files (
  id            uuid primary key default gen_random_uuid(),
  receipt_id    uuid not null references receipts(id) on delete cascade,
  page_no       int not null default 1,
  storage_path  text not null,                  -- receipts/{workspace_id}/{receipt_id}/{file_id}.jpg
  mime_type     text not null,
  byte_size     int not null,
  sha256        text not null,                  -- 重複検知・改ざん検知
  width         int,
  height        int,
  created_at    timestamptz not null default now(),
  unique (receipt_id, page_no)
);
create index on receipt_files (sha256);

-- 変更履歴（追記のみ）
create table receipt_events (
  id          bigint generated always as identity primary key,
  receipt_id  uuid not null references receipts(id) on delete cascade,
  actor_id    uuid references auth.users(id),   -- AI 処理時は NULL
  action      text not null,                    -- created / ocr_completed / updated / confirmed / voided
  diff        jsonb,                            -- {"amount_total": [1200, 1320], ...}
  created_at  timestamptz not null default now()
);
```

補助トリガー（実装時に作成）:

- `receipts` の `project_id` 設定時に `customer_id` を案件の顧客で自動補完し、不一致ならエラー
- `receipts` の UPDATE 時に変更前後の差分を `receipt_events` に自動記録、`updated_at` 更新
- `receipt_files` は INSERT のみ許可（UPDATE / DELETE は RLS で禁止）し、原本の改変を防ぐ

### 7.3 アクセス制御（RLS）

```sql
create function is_member(ws uuid) returns boolean
language sql security definer stable as $$
  select exists (select 1 from workspace_members
                 where workspace_id = ws and user_id = auth.uid());
$$;

create function has_role(ws uuid, roles member_role[]) returns boolean
language sql security definer stable as $$
  select exists (select 1 from workspace_members
                 where workspace_id = ws and user_id = auth.uid() and role = any(roles));
$$;

alter table receipts enable row level security;

create policy receipts_select on receipts for select using (is_member(workspace_id));
create policy receipts_insert on receipts for insert
  with check (is_member(workspace_id) and created_by = auth.uid());
create policy receipts_update on receipts for update using (
  has_role(workspace_id, array['owner','admin']::member_role[])
  or (created_by = auth.uid() and status in ('processing','needs_review'))
);
-- DELETE ポリシーは作らない（物理削除禁止、取消は status=void）
```

Storage は非公開バケット `receipts` とし、パス先頭の `workspace_id` でメンバー判定するポリシーを設定する。閲覧は署名付き URL（短時間有効）で行う。

### 7.4 集計ビュー

```sql
create view v_receipt_summary as
select
  r.workspace_id,
  date_trunc('month', r.issued_on)::date as month,
  c.id   as customer_id,  c.name as customer_name,
  p.id   as project_id,   p.name as project_name,
  cat.id as category_id,  cat.name as category_name,
  count(*)                          as receipt_count,
  sum(r.amount_total)               as amount_total,
  sum(coalesce(r.amount_tax_10,0))  as tax_10,
  sum(coalesce(r.amount_tax_8,0))   as tax_8
from receipts r
left join customers  c   on c.id = r.customer_id
left join projects   p   on p.id = r.project_id
left join categories cat on cat.id = r.category_id
where r.status = 'confirmed'
group by 1,2,3,4,5,6,7,8;
```

集計画面はこのビューを期間・軸で再集計する（`security_invoker = true` を指定し RLS を効かせる）。データ量が数万件規模までは素のビューで十分であり、マテリアライズは不要と判断する。

---

## 8. AI 読み取り設計

### 8.1 処理方式

1. クライアントで画像を長辺 2,000px 程度にリサイズした「解析用画像」を生成。**原本はそのまま Storage に保存**。
2. アップロード完了後、Route Handler（`POST /api/receipts/{id}/extract`）を呼び出す。
3. サーバー側で Claude API（マルチモーダル）に画像を送り、JSON スキーマ指定の構造化出力で項目を受け取る。
4. 結果を `receipts` に書き込み `status = needs_review`、`ocr_result` に生データを保存。
5. 失敗時（タイムアウト・判読不能）も `needs_review` に遷移させ、手入力で救済する。

API キーはサーバーの環境変数にのみ置き、クライアントには露出させない。

### 8.2 抽出項目（出力スキーマ）

```json
{
  "issued_on": "2026-10-15",
  "vendor_name": "株式会社〇〇 新宿店",
  "vendor_company": "株式会社〇〇",
  "invoice_reg_no": "T1234567890123",
  "amount_total": 3300,
  "amount_tax_10": 300,
  "amount_tax_8": 0,
  "payment_method": "現金",
  "description": "会議用飲食代",
  "category_guess": "会議費",
  "is_receipt": true,
  "confidence": { "issued_on": 0.98, "vendor_name": 0.90, "amount_total": 0.99 }
}
```

- `is_receipt = false`（領収書以外の画像）の場合は警告を出す。
- 和暦（令和）表記は西暦に変換して返すようプロンプトで指示する。
- 科目・案件の推定は、同じ取引先の過去の確定データ（直近の科目・案件）を優先し、なければ AI の `category_guess` を採用する（ベンチマーク B5 の簡易版）。

### 8.3 取引先 → 顧客マスタの自動登録

AI が読み取った取引先を顧客マスタと照合し、該当がなければ新規顧客として登録して領収書に紐付ける。

1. **抽出**：AI は `vendor`（記載のまま、例「mont-bell 二子玉川店」）と `vendor_company`（店舗名を除いた名称、例「mont-bell」）を返す。`vendor_company` が空の場合は末尾の「〇〇店/支店/営業所」を除去して代用する。
2. **照合**（上から順に評価し、最初に一致した顧客を採用）
   1. 登録番号（T+13桁）の完全一致
   2. 正規化名の一致（NFKC、小文字化、空白・記号・「株式会社」「(株)」等の法人格を除去）
   3. 正規化名の部分一致（どちらかが 3 文字以上で、一方が他方を含む）
3. **確認画面**：一致した顧客は顧客欄に初期表示（「推定」表示付き）。一致しない場合は「取引先を顧客マスタに登録して紐付ける」（初期値 ON、顧客名は編集可）を表示する。
4. **確定時**：ON のまま確定すると `customers` に `source = 'ocr'`、登録番号付きで登録し、顧客コードは連番で自動採番する。
5. **正規化関数**：`normalize_vendor(text)` を immutable な SQL 関数として定義し、`customers.name_norm` の生成列とアプリ側で同じ規則を使う。
6. **既存データ**：顧客未設定の領収書を対象に、同じ照合ロジックで一括登録・紐付けする機能をマスタ画面に置く。

> 照合はアプリ層で行い、確定処理（顧客登録＋領収書更新）は 1 トランザクションの RPC（`confirm_receipt`）として実装する。誤登録した顧客は、統合機能（v2）で既存顧客へまとめられるようにする。

### 8.4 重複検知

| 判定 | 条件 | 対応 |
|---|---|---|
| 確実 | 同一 `sha256` の画像が既に存在 | アップロード時にブロック（同一ファイルの再送） |
| 疑い | 同一ワークスペースで `issued_on`・`amount_total` が一致し、`vendor_name` が類似（`pg_trgm` 類似度 0.6 以上） | `duplicate_of` を設定し確認画面で警告。確定は可能 |

---

## 9. API / 処理一覧

基本は Supabase クライアントから RLS 経由で直接 CRUD し、サーバー処理が必要なものだけ Route Handler にする。

| エンドポイント | 用途 |
|---|---|
| `POST /api/receipts/{id}/extract` | AI 抽出の実行（再実行も可） |
| `GET /api/export/receipts.csv?from=&to=&project_id=…` | 明細 CSV（UTF-8 BOM 付き、Excel 対応） |
| `GET /api/export/summary.csv?axis=project&from=&to=` | 集計 CSV |
| `POST /api/workspaces/{id}/invites` | メンバー招待（Supabase の招待メール） |

明細 CSV 列: 取引日, 取引先, 登録番号, 税込金額, 消費税(10%), 消費税(8%), 科目, 顧客コード, 顧客名, 案件コード, 案件名, 但し書き, メモ, 登録者, 確定日時, 領収書ID

---

## 10. 非機能要件

| 区分 | 要件 |
|---|---|
| 性能 | 一覧・集計は 1 万件で 1 秒以内。AI 抽出は 1 枚あたり 10 秒以内を目標 |
| 可用性 | Supabase マネージドに準拠。日次バックアップ（PITR は有料プランで検討） |
| セキュリティ | RLS 必須、Storage 非公開＋署名付き URL、API キーはサーバーのみ |
| 保存期間 | 領収書は法定保存期間（原則 7 年）を想定し、物理削除しない |
| 画像 | 原本保存。解析用・サムネイルは派生物として別保持 |
| 対応端末 | iOS Safari / Android Chrome の最新 2 版、PC ブラウザ |

### 電子帳簿保存法（スキャナ保存）への配慮

本アプリは法令対応を主目的としないが、SoR として以下の要件を満たせる構造にしておく。紙の原本を廃棄する運用を行う場合は、税理士等に運用面を確認すること。

| 要件 | 本設計での対応 |
|---|---|
| 検索機能（取引日・金額・取引先） | 一覧画面のフィルタで標準対応 |
| 訂正・削除履歴の確保 | `receipt_events` への自動記録、物理削除禁止 |
| 入力期間の制限 | 登録日時（`created_at`）を記録。期限超過の警告は v2 |
| 解像度・カラー | 原本保存。撮影時の最低解像度チェックをクライアントで実施 |
| タイムスタンプ | 訂正削除履歴が残るシステムでの保存により代替する方針 |

---

## 11. 画面遷移

```
ログイン ─▶ ホーム（要確認キュー）
              ├─▶ 撮影 ─▶ （AI抽出）─▶ 確認・修正 ─▶ 次の要確認 / ホーム
              ├─▶ 一覧 ─▶ 詳細 ─▶ 編集 / 取消
              ├─▶ 集計 ─▶（ドリルダウン）─▶ 一覧（フィルタ適用済み）
              └─▶ 設定 ─▶ 顧客 / 案件 / 科目 / メンバー
```

---

## 12. 開発ステップ（目安）

| フェーズ | 内容 |
|---|---|
| 1 | プロジェクト雛形、認証、ワークスペース・メンバー、RLS |
| 2 | 顧客・案件・科目マスタ |
| 3 | 撮影・アップロード、Storage、手入力での登録・一覧・詳細 |
| 4 | AI 抽出、確認画面、重複検知 |
| 5 | 集計画面、CSV エクスポート |
| 6 | 変更履歴表示、PWA 化（ホーム画面追加、アイコン）、運用テスト |

---

## 13. 決定事項（2026-11-02 確認）

| # | 論点 | 決定 |
|---|---|---|
| Q1 | 1 領収書を複数案件に按分するか | しない。1 領収書 = 1 案件 |
| Q2 | 電子取引データ（PDF・メール）を扱うか | v1 では除外。v2 で対応 |
| Q3 | 会計ソフト連携 | 汎用 CSV のみ |
| Q4 | 利用規模 | 10 名 × 1,000 枚/月 = **月 10,000 枚**（年 12 万枚、7 年保存で約 84 万枚） |
| Q5 | リポジトリ | 本リポジトリから分離し、専用リポジトリで開発する |

### 規模から導かれる設計上の補足

- **AI 読取**：月 1 万回の API 呼び出し。1 枚ずつ非同期で処理し、レート制限に備えてキュー（`status = processing` の再試行）を設ける。モデルは精度とコストのバランスで選定し、月額は実装時に料金表で試算する。
- **ストレージ**：解析用 JPEG を 1 枚 300KB とすると月約 3GB、7 年で約 250GB。原本は別途保存するため、Supabase Storage の有料プランを前提とする。
- **DB**：84 万行規模でもインデックス（`workspace_id, issued_on` 等）で一覧・集計は 1 秒以内を見込める。集計ビューで遅くなった場合は月次のマテリアライズドビューに切り替える。
- **一覧**：件数が多いため、一覧画面はページング（1 ページ 50 件）と期間の初期値（当月）を必須とする。

## 14. デモ版

スマホで操作感を確認するためのデモを、claude.ai の Artifact として別途公開した（本実装とは別物）。

- 撮影 → AI 読取 → 確認・修正 → 確定、要確認キュー、一覧検索、案件別・顧客別・月別・科目別の集計、CSV 保存、顧客・案件マスタ、重複警告、変更履歴に対応
- 保存先は Artifact の共有データベース（上限 2.5 万件）のため、本番規模の運用には使えない
- 勘定科目マスタは固定、権限ロールは未実装

### 改修履歴

| 日付 | 内容 |
|---|---|
| 2026-11-02 | ホームに顧客別・案件別・月別の集計と累計額を追加（取引日が当月以外の領収書が集計に出なかった問題への対応）。取引先から顧客マスタへの自動登録（8.3）と一括登録を追加。変更のない修正保存を履歴に残さないよう修正 |
