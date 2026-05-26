# 内部ドキュメント submodule（pages/）運用ルール

`pages/` は静的サイトを配信する submodule。HTML 解説・レビュー結果・障害報告などを Issue / PR / Discussion からリンクするための内部ドキュメント置き場で、`writing-html-explainer` スキルが生成する単一ページ HTML をここに置く。

**運用上の必須操作は「`pages/` を更新したら submodule を `main` へ push すること」だけ。** デプロイの仕組みはホスティング側が引き受けるため、配信方式は意識しない（GitHub Pages なら `main` への push でデプロイ。ローカルセルフホスト等でも push で正本が揃う）。

## 設定（`.shirokuma/config.yaml` の `pages` セクション）

```yaml
pages:
  submodulePath: pages                  # submodule のパス
  repo: <org>/<pages-repo>              # 内部ドキュメントリポ
  baseUrl: https://example.com          # 配信 URL のベース（リンク生成用）
  defaultBranch: main
  categories:                           # ディレクトリ ↔ 用途
    specs:       { title: 仕様書,           path: specs/{topic}/ }
    explainers:  { title: Issue 補足解説,   path: explainers/{topic}/ }
    reviews:     { title: レビュー結果,     path: reviews/{topic}/ }
    incidents:   { title: 障害報告,         path: incidents/{topic}/ }
    issues:      { title: Issue 補足,        path: issues/{number}/ }
    prs:         { title: PR 補足,           path: prs/{number}/ }
    discussions: { title: Discussion 補足,   path: discussions/{number}/ }
    status:      { title: ステータス報告,    path: status/{topic}/ }
```

## 初期セットアップ（新規プロジェクトで pages を使う）

1. 内部ドキュメント用リポを用意する。GitHub Pages を使うなら **public** 推奨。**サイトはドメインルート配信前提**（各ページは絶対パス `/assets/...` を使う）なので、独自ドメイン（CNAME）か org pages リポ（`<org>.github.io`）を推奨する。project pages のサブパス配信（`<org>.github.io/<repo>/`）は絶対パスが壊れるため避ける
2. 親リポに submodule として追加: `git submodule add <repo-url> pages`
3. `.shirokuma/config.yaml` に上記 `pages` セクションを定義
4. 共通アセットとビルダーを `writing-html-explainer` の `reference/` から配置:
   - `pages/assets/` に `style.css` / `theme.js` / `modern-normalize.css`
   - 索引ビルダー `build-pages-index.mjs` をプロジェクトの `scripts/` 等にコピー
5. `pages/.nojekyll` を作成（GitHub Pages の Jekyll 処理を無効化し `/assets/` 等をそのまま配信）
6. GitHub Pages を有効化（リポ Settings → Pages → Source: `main` / root）。独自ドメイン使用時は `pages/CNAME` を作成
7. `pages.baseUrl` を確定した配信 URL に更新

## 配信ワークフロー

`writing-html-explainer` スキルが下記を自動化する。手動手順:

```bash
cd pages
# 1. ページ生成（reference テンプレ + assets。各ページは {category}/{topic}/index.html）
# 2. 索引を再生成（index.json にデータ、index.html は軽量シェル）
node ../scripts/build-pages-index.mjs --title "<site title>" --lang ja
# 3. main へ push（← 必須。これで配信反映される）
git add . && git commit -m "docs: add {topic}" && git push origin main
# 4. 親リポへ戻り submodule ポインタを更新
cd .. && git add pages && git commit -m "chore(pages): bump submodule for {topic}"
```

> **必須**: ステップ 3（submodule の `main` push）。配信方式が何であれ、push しない限り配信されない。

## ディレクトリ ↔ URL マッピング

`pages.categories` に従う。URL は `{baseUrl}/{category}/{topic-or-number}/`。

| カテゴリ | パス | 用途 |
|---------|------|------|
| `specs` | `specs/{topic}/` | 恒久的な仕様書（スキル・ルール・ワークフロー・CLI の詳細仕様） |
| `explainers` | `explainers/{topic}/` | Issue 補足の手書きトピックページ（特定 Issue に紐づく一時的な補足解説） |
| `reviews` | `reviews/{topic}/` | コード / 設計 / セキュリティレビュー結果 |
| `incidents` | `incidents/{topic}/` | 障害・ポストモーテム |
| `issues` | `issues/{number}/` | Issue 補足資料 |
| `prs` | `prs/{number}/` | PR 補足資料 |
| `discussions` | `discussions/{number}/` | Discussion（ADR / RFC）補足 |
| `status` | `status/{topic}/` | 進捗・期間報告 |

報告系スキルの報告タイプ ↔ カテゴリ・slug 命名規約は [`html-report-criteria.md`](./html-report-criteria.md) §4 を参照。

## 索引ページ（`build-pages-index.mjs`）

`pages/` をスキャンして 2 ファイルを生成する:

- `pages/index.json` — 全エントリのマニフェスト（各ページの **git 最終更新日時 `updatedAt` と初回コミット日時 `createdAt`** 付き）
- `pages/index.html` — 検索 UI の軽量シェル（`index.json` を fetch して描画）

索引は **新しい順フィード**（最近のページをパッと見る用途）。**更新順／作成順をトグルで切替**でき、各行に日時（YYYY-MM-DD HH:mm）とカテゴリを表示。上位のみ表示して「もっと見る」で展開、検索は全件対象。一括変更で更新日時が揃ってしまう場合でも、作成順なら新規追加されたページを区別できる。エントリを JSON に分離するため、**ページ数が増えても `index.html` は一定サイズ**で初期ロードが重くならない。引数: `--title <site title>` / `--lang ja|en` / `--root <pages dir>`（既定 `./pages`）。

## ファイル命名と構造選択

- 各ページは `{category}/{topic}/index.html`
- 共通アセットは `pages/assets/`（各ページからは絶対パス `/assets/...` で参照）
- ページ側に `<aside class="toc">` は書かない（`theme.js` がサイドバー・目次・ナビを生成）

### カテゴリ別の構造選択

| カテゴリ | 採用方式 | 理由 |
|---------|---------|------|
| `prs/` | マスター + サブページ（`index.html` + `*.html`）| PR ライフサイクル全体を 1 ディレクトリで集約。`summary.html` / `review-r{n}.html` / `fix-r{n}.html` がマスターから辿られる |
| `issues/`, `discussions/` | ディレクトリ（`{number}/index.html`）| 番号ベースの単一ページが基本 |
| `specs/`, `explainers/`, `reviews/`, `incidents/`, `status/` | ディレクトリ（`{topic}/index.html`）| topic-slug ベースの自己完結型 |

**意味付け**: ディレクトリ（`{topic}/index.html`）は「1 ページの集約単位」、サブページ（`{topic}/{name}.html`）は「同集約内のサブページ」。両者は併用可能で、`index.html` が常にマスター（集約点）として機能する。索引ビルダーはマスターのみを索引化し、サブページは集約点であるマスターを介して辿られる前提（orphan サブページは警告対象）。

## 注意事項

- **内部ドキュメント**だが機密情報を含めない（リポジトリ閲覧権限を持つ第三者の目に触れうるため、コード片・スクリーンショット等の掲載可否を確認）
- 一度配信した URL は変えない（Issue / PR からのリンク切れ防止）
- 古い資料は削除より「Deprecated」マーク（page 内に明示）を推奨
- 配信方式・ドメイン変更時は `pages.baseUrl` を更新
- 最新ブラウザ前提（`:has()` 等のモダン CSS / JS を使用可）
