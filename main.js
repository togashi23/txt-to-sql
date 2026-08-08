const parseTsv = (str) => {
  let result = [];
  const lineEnd = new RegExp(/\r\n|\n|\r/, 'i');
  const columnSeparator = new RegExp(/\t/, 'i');

  const lines = str.split(lineEnd);

  lines.forEach((line) => {
    const column = line.split(columnSeparator);
    result.push(column);
  });

  return result;
};

// 1つのINSERT文にまとめる最大行数
const ROWS_PER_INSERT = 1000;

const create = () => {
  const tableName = document.getElementById('table-name').value;
  const inputText = document.getElementById('text-input').value;

  const lines = parseTsv(inputText);

  const columnNames = lines[0].join(',');

  let values = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const columns = line.map((c) => {
      // エスケープ処理
      const escapedStr = c.replace(/\'/g, "''");

      if (escapedStr === 'NULL') {
        return escapedStr;
      } else {
        return "'" + escapedStr + "'";
      }
    });

    values.push('(' + columns.join(',') + ')');
  }

  // 最大行数ごとにINSERT文を分割
  let statements = [];
  for (let i = 0; i < values.length; i += ROWS_PER_INSERT) {
    const chunk = values.slice(i, i + ROWS_PER_INSERT);
    statements.push(
      `INSERT INTO ${tableName} (${columnNames}) VALUES\n` +
        chunk.join(',\n') +
        ';'
    );
  }

  const insertStr = statements.join('\n\n');

  const sql = `BEGIN TRANSACTION;
${insertStr}
ROLLBACK TRANSACTION;
-- COMMIT TRANSACTION;`;

  const sqlOutput = document.getElementById('sql-output');
  sqlOutput.innerHTML = sql;
  hljs.configure({ ignoreUnescapedHTML: false });
  hljs.highlightElement(sqlOutput);
  hljs.lineNumbersBlock(sqlOutput);
};

document.getElementById('create').addEventListener('click', create);
