<p align="center">
  <img src="src/icon.svg" width="180" alt="txt-to-sql" />
</p>

<h1 align="center">txt-to-sql</h1>

<p align="center">ExcelやスプレッドシートからコピーしたTSVをそのまま貼り付けて、INSERT文を手早く用意するためのWebアプリ。</p>

<p align="center">
  <a href="https://txt-to-sql.netlify.app">Website</a>
</p>

<p align="center">
  <img src="https://api.netlify.com/api/v1/badges/10b11c90-a13e-4abb-abf9-28da8b8f21aa/deploy-status" alt="Netlify Status" />
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License" />
</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/2093f627-b643-4033-a9a9-7f78ddacfa49" width="720" alt="capture" />
</p>

---

## 機能

- TSVテキストからINSERT文を生成(1行目をカラム名、2行目以降を値として扱う)
- シングルクォートのエスケープ(`'` → `''`)
- `NULL` と書かれたセルは、クォートせずNULLリテラルとして出力
- 1000行ごとにINSERT文を分割
- トランザクションで囲んで出力
- SQL ServerとMySQLのトランザクション構文に対応
- 生成したSQLをワンクリックでクリップボードへコピー
- ダーク/ライトテーマの切り替え

## 使い方

1. Webサイトにアクセス
2. テーブル名を入力する
3. 左のエディタにTSVテキストを貼り付ける(1行目はカラム名)
4. 「作成」ボタン、または <kbd>Ctrl</kbd> + <kbd>Enter</kbd> を押す
5. 右のエディタに生成されたSQLを「コピー」ボタンで取得する

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

## 開発

TypeScriptで書かれているため、初回は依存関係のインストールとビルドが必要です。

```sh
# 依存ライブラリをインストール
npm install

# 開発サーバーを起動
npm run dev

# ビルド
npm run build
```
