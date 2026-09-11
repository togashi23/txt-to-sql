<p align="center">
  <img src="src/icon.svg" width="180" alt="txt-to-sql" />
</p>

<h1 align="center">txt-to-sql</h1>

<p align="center">ExcelやスプレッドシートからコピーしたTSVをそのまま貼り付けて、INSERT文を手早く用意するためのWebアプリ。</p>

<p align="center">
  <img src="https://api.netlify.com/api/v1/badges/10b11c90-a13e-4abb-abf9-28da8b8f21aa/deploy-status" alt="Netlify Status" />
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License" />
</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/2093f627-b643-4033-a9a9-7f78ddacfa49" width="720" alt="capture" />
</p>

---

## URL

<https://txt-to-sql.netlify.app>

## 機能

- TSVテキストからINSERT文を生成（1行目をカラム名、2行目以降を値として扱う）
- シングルクォートのエスケープ（`'` → `''`）
- `NULL` と書かれたセルは、クォートせずNULLリテラルとして出力
- 1000行ごとにINSERT文を分割
- トランザクションで囲んで出力（ロールバックが既定で、コミットはコメントアウト）。ヘッダーのチェックボックスで有無を切り替え可能（既定は有り）
- SQL ServerとMySQLのトランザクション構文に対応。ヘッダーのDBMS選択で切り替え可能
- 生成したSQLをワンクリックでクリップボードへコピー
- ダーク／ライトテーマの切り替え（初期状態はOSの設定に追従し、手動で切り替えるとその選択を記憶）

## 使い方

1. テーブル名を入力する
2. 左のエディタにTSVテキストを貼り付ける（1行目はカラム名）
3. 「作成」ボタン、または <kbd>Ctrl</kbd> + <kbd>Enter</kbd> を押す
4. 右のエディタに生成されたSQLを「コピー」ボタンで取得する

### 入力例

```tsv
id	name	email
1	山田太郎	yamada@example.com
2	鈴木花子	NULL
```

### 出力例（SQL Server）

```sql
BEGIN TRANSACTION;
INSERT INTO users (id,name,email) VALUES
('1','山田太郎','yamada@example.com'),
('2','鈴木花子',NULL);
ROLLBACK TRANSACTION;
-- COMMIT TRANSACTION;
```

### 出力例（MySQL）

```sql
START TRANSACTION;
INSERT INTO users (id,name,email) VALUES
('1','山田太郎','yamada@example.com'),
('2','鈴木花子',NULL);
ROLLBACK;
-- COMMIT;
```

生成されるSQLは既定でロールバックされます。実際に反映する場合は、ロールバックの行を削除し、コミットの行のコメントを外してください。

ヘッダーの「トランザクション」のチェックを外すと、INSERT文のみが出力されます。

## ローカルでの実行

TypeScriptで書かれているため、初回は依存関係のインストールとビルドが必要です。

```sh
npm ci
npm run build
```

`dist` にビルド結果が出力されたら、Docker Composeでhttpdを起動し、<http://localhost> を開きます。

```sh
docker compose up
```

## 開発

```sh
npm run build   # 1回だけビルドする
npm run watch   # 変更を監視して自動でビルドする
```

## 使用ライブラリ

- [Monaco Editor](https://microsoft.github.io/monaco-editor/)（CDNから読み込み。ローカルの `monaco-editor` は型定義のみに使用）
