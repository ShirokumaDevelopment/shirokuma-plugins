# 計画レビュー基準

`plan` ロールが計画 Issue をレビューする際のチェック観点カタログ。`roles/plan.md` のチェックリストと併用する。各観点は実観測された失敗パターンから抽出されており、High 以上の指摘で検出する。

## 観点 1: 親 Issue / 前提の検証

計画は親 Issue 本文の「背景」「現行仕様（確認済み）」を前提として組み立てられる。**親 Issue の前提が実装と乖離していると、計画の調査観点・期待出力が誤前提に引きずられる**。

- 定数マッピング・デフォルト値・列挙値の個数と内容を実コードで再確認した形跡があるか（grep / Read）
- 関連ファイルの行番号と関数シグネチャが実装と整合するか
- 実装済みガードの範囲（idempotency guard / clear logic 等の対象ステータス）を計画が独自検証したか
- ADR のトレードオフ記述を無批判に引き継いでいないか
- 前回レビュー指摘の転記で grep による一次確認を経たか（前回指摘自体が誤検出だった事例あり）

確認形跡がなく実装とのズレがあれば、`[計画]`（再確認 Task 追加）と `[Issue記述]`（背景訂正）の 2 ラベルで分類して指摘する。

## 観点 2: 計画内のセクション間整合性

「N 箇所を置換する」のような数量記述は、変更対象節・タスク分解節・リスク懸念節で**同じ根拠で数えられているか**をクロスチェックする。

- 計画内の数字（「8 箇所」「9 箇所」等）が複数セクションで一致するか
- 「対象外」と明記される参照がある場合、タスク分解の「全 N 箇所」が対象外を含むか除外するか明示されているか
- 「N 箇所（列挙 M 行番号 他）」の「他」が何を指すか不明確なら、総数と個別列挙の内訳を一致させる

方針転換後は **rationale コメント・判断根拠の同期更新**も確認する（`plan_rationale_comment_drift_after_pivot`）。フェーズ N の方針転換が親 Issue / ADR 本文の同期更新タスクとしてスコープに入っているかも要確認（`plan_phase_pivot_unsynced_to_epic`）。

オプション名のリネーム（`--file → --body-file` 等）が移行表に暗黙混入していないか、後方互換戦略が定義されているかも確認する（`plan_silent_option_rename_in_migration_table`）。

## 観点 3: 受け入れ基準の明確性

サブ Issue の受け入れ基準が「A を実施する、または A を実施しないと判断してクローズする」の二択になっているケースは禁止。実装者が完了条件を判別できない。

- 受け入れ基準が「A or B」形式なら、**目的を「実装」「判断」「メタタスク」のいずれかに一本化**するよう提案
- 同エピックで原則化を進める他のサブ Issue（例: CLI 集約原則の明文化）と矛盾しないか確認

## 観点 4: 「現状こうなっている」断定の実コード検証

plan-worker が出力する計画は「現状 X が抜けている」のような現状記述を添える。**ソース文字列を末尾まで読まず断定すると、本来不要な修正タスクが計画に混入する**。

- `.description(...)` ・JSDoc・説明文字列の特定トークン有無を主張する箇所は、文字列全体を Read で実地確認
- 不一致があれば Medium 以上で指摘し、「次回 plan-worker 起動時に `スニペット中の現状記述は実ソース末尾まで読んで検証する` フィードバックを返す」旨を完了レポートに添える

## 観点 5: スコープ境界と除外項目の明示

計画が親 Issue の当初スコープから項目を**片側論点だけで除外**していないか、残存ユースケースと別 Issue 化計画が示されているかを確認する。

- `@deprecated` 残存呼び出しの扱いが計画スコープに明記されているか（`plan_deprecated_symbols_scope_ambiguity`）
- 重複解消 refactor で親 Issue 列挙の FIX-N 範囲だけ踏襲し、兄弟 FIX の同一パターンが対象外で残っていないか（`plan_refactor_scope_omits_sibling_duplication`）
- スコープから除外する項目について、トレードオフの両側論点が記述されているか（`plan_scope_drop_without_tradeoff`）
- エピック計画でサブ Issue 依存が一律「調査完了後」になっていないか — 確定済み修正の並行着手を阻害する（`plan_subissue_dependency_vs_confirmed_fixes`）

## 観点 6: 環境変数 / データソース / guard 仕様の明示

新規導入する仕組みの**意味論を計画本文で確定**させる。

- 新規環境変数: 「何を上書きするのか」と既存 `homedir()` 等の置換先が明記されているか
- 新規コマンド: データソースが「〜から取得する想定」止まりではなく検証済みか（`plan_new_command_with_unverified_data_source`）
- テスト漏れ検出ガード: 「warn ログのみ（処理継続）」か「書き込み拒否」かを計画本文で明示しているか（`plan_guard_behavior_ambiguity`）
- env 変数隔離機構: ガードを個別呼び出し側に置くと新規書き込みパス追加時に見落とすため、resolver 側に置く設計を要求（`plan_env_var_semantics_undefined` / `env_guard_resolver_vs_caller`）

## 観点 7: 計画 Issue の並存検出

計画やり直し時に旧計画を `cancel` せず Review のまま放置すると、`sub-list {parent}` で 2 件返り、実装者が誤って旧計画を読むリスクが生じる。

- 計画レビュー開始時に `shirokuma-flow issue sub-list {parent}` を必ず実行
- 計画 Issue が複数並存していれば **Critical** で「採用しない方を `issue cancel` で破棄（cancel が親からの unparent を自動実行する）、または『#X を破棄し #Y を採用』を明示宣言」を要求
- ユーザーが「キャンセル済み」と前提を宣言した再レビュー依頼でも、`shirokuma-flow issue pull {old-plan}` で実状態を再取得し `status`（Done + `state_reason: not_planned`）と `parent` を実機検証

## 観点 8: 抽出ヘルパーの呼び出し到達性

共通ヘルパー抽出 PR では、**ヘルパー単体の品質ではなく実ユーザー経路での到達可能性**を確認する。

1. 単体品質（JSDoc / 契約 / テスト）
2. 呼び出し側の到達性: 実ユーザー経路（CLI → スキル → サブコマンド）でヘルパーが実際に呼ばれるか、呼び出し分岐の条件を実データで検証
3. 分離関心の誤結合: 「Issue 番号特定」と「本文への注入」のような概念の違う 2 処理が同じ条件で gated されていないか

具体的なチェック方法: 呼び出し元のテンプレート（`issue template pr` 出力、スキルの PR 本文雛形）を実際に確認し、実例が条件分岐のどちら側に落ちるかを追跡する。

## 観点 9: テストカバレッジの本番経路再現

Describe ブロックの全テストが同じ前提条件（`bodyFile: undefined` 等）を共有していると、その前提が外れる本番経路の回帰テストが丸ごと欠落する。

- 同一 describe 内で beforeEach / 各 it が同じ前提（`undefined`, `null`, 空文字列）を共有しているか
- 「回帰テスト追加」を主目的とする PR で、リグレッション再現の前提（呼び出し元が渡す実データ）をテストが再現しているか
- コード側の `if (X === null / empty)` 分岐の **非** null 経路が describe 前提の外に置かれていないか
- ヘルパー抽出 refactor で helper 自身の直接単体テストが追加されているか（呼び出し側の旧 mock 配線が dead で残っていないか、`helper_extraction_test_drift`）

具体的なチェック方法: 実呼び出し元（スキル・エージェント・外部コマンド）のテンプレート出力（`/tmp/shirokuma-flow/*-pr-body.md` 等）を 1 件読み、その値がテストセットアップに現れるかを確認。現れなければ Critical パスの未カバーを疑う。

## 観点 10: PR 本文と実装の乖離（PR レビュー兼用）

PR 本文の「実装方針」記述と実装コードの挙動を照合する。4 バリアント:

| バリアント | 内容 |
|-----------|------|
| A: 挙動の乖離 | 本文「Done に到達していない場合は再設定するリトライロジック」、実装は verify-only |
| B: 本文 > 実 diff | 本文は 5 項目を列挙、実 diff は 3 項目（残り 2 項目は先行 PR 由来） |
| C: 本文 < 実 diff | branch 名・本文とも単独 Issue 修正だが、base が develop のため統合 PR 状態 |
| D: 関数名の幻覚 | 「`createXxx()` を追加」と書くが実 diff は既存関数内のインライン登録のみ |

チェック手順:
1. PR 本文の箇条書きから動詞（リトライ / フォールバック / 自動修正 / 変更 / 追加）を抽出し実装ロジックの存在を確認
2. `git log origin/{base}...HEAD` で当該 PR のコミット数を確認し、本文が 1 つの変更だけ記述しているのに複数コミットが並んでいたらエピック統合 PR を疑う
3. base branch 名と branch 名の整合性: `fix/N-*` branch が develop 向けなのにエピック先行 PR を含んでいる場合は base が epic ブランチであるべき

## 観点 11: ルール文書のサンプルコード API 整合

新規ルール（`.shirokuma/rules/{project}/*.md` 等）の TypeScript サンプルコードが実装 API と一致しているか確認する。

- 関数呼び出しの引数数・順序を実装と grep 照合（`getIssueDetail(owner, repo, number, logger)` と書いて実装が 3 引数のケース等）
- 返り値型のフィールド名を実装と照合（`detail?.projectStatus` と書いて実装が `.status` のケース等）
- ADR 対応 PR では実装とルール文書が同時追加されるため、両者の整合チェックをレビュー観点に含める

## 観点 12: enum / 定数のドリフト

- 新たな enum 値を write path で使用するが validator の VALID 定数を更新し忘れ、次回 integrity 実行で恒久 error を生むパターン（`enum_constant_drift_from_new_usage`）
- 「case mismatch 修正」タスクが新表記 / LEGACY を意図的分離した既存定数を破壊するパターン（`plan_case_mismatch_breaks_legacy_split`）

## 観点 13: エラー / 例外処理の意味論一致

- 既存 try/catch 流用を謳う計画で、catch メッセージの意味論が新規ロジックの失敗表現と乖離していないか（`plan_reuses_catch_block_with_mismatched_semantics`）
- 例外規定で「取得不可」と「概念的に存在しない」を同じ `undefined` で混同していないか（`exception_clause_new_addition`）
- ラッパー package.json 修復を「既存ファイル復元」→「registry 必須」に変える refactor でオフラインリカバリが喪失していないか（`script_hard_fail_removes_offline_recovery`）
- `stat -c | cut || stat -f` パターンが POSIX パイプライン exit code 仕様で非 GNU 環境で機能するか（`shell_stat_pipeline_fallback_broken`）

## 観点 14: 計画修正の親子同期

計画修正で**子計画だけ更新し親 Issue 本文が古いまま残る**と親子乖離が再発する（`plan_revision_recreates_parent_drift`）。

- 計画レビュー NEEDS_REVISION 後の再レビューでは、High / Medium / Low の指摘が根本解消されたか + 新規副次問題（新ステータスと状態遷移表の不整合等）の両面判定（`plan_revision_addressing_high_medium_low`）
- 親 Issue 設計レビュー提案がサブ Issue だけに反映され親本文表が未更新で正本が二重化していないか（`plan_naming_drift_from_design_review_feedback`）

## 観点 15: 親 Issue の運用指示の取り込み

計画が親 Issue の運用指示（ファイル仕様・集約マーカー・ベースラインコミット等）を取り込み損ねるパターン（`plan_missing_parent_operational_directives`）。

- 親 Issue の「運用ルール」「実装ガイド」「制約」セクションが計画タスクに反映されているか
- 計画が親 Issue の事実誤認を引き継いでいないか（`plan_inherits_parent_factual_inaccuracy`）
- 親 Issue の「推定原因（条件分岐 / 〜の可能性）」を無検証で引き継ぎ、実装で当該処理が存在しないケースを条件緩和と誤認していないか（`plan_inherits_false_causal_claim`）
