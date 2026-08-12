# txt-to-sql

Excelやスプレッドシートからコピーしたデータをそのまま貼り付けて、テスト用のINSERT文を手早く用意するためのツールです。

![capture](https://github.com/user-attachments/assets/2093f627-b643-4033-a9a9-7f78ddacfa49)

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

`main.ts` から `main.js` が生成されたら、Docker Composeでhttpdを起動し、<http://localhost> を開きます。

```sh
docker compose up
```

## 開発

`main.js` は `main.ts` から生成されるため、直接編集せずGit管理からも除外しています。

```sh
npm run build   # 1回だけビルドする
npm run watch   # 変更を監視して自動でビルドする
```

Netlifyへのデプロイ時は `netlify.toml` の設定により `npm run build` が実行されます。

## 使用ライブラリ

- [Monaco Editor](https://microsoft.github.io/monaco-editor/)（CDNから読み込み。ローカルの `monaco-editor` は型定義のみに使用）
