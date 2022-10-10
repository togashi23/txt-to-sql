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

const create = () => {
  const tableName = document.getElementById('table-name').value;
  const inputText = document.getElementById('text-input').value;

  const lines = parseTsv(inputText);

  const columnNames = lines[0].join(',');

  let insertStr = '';
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    insertStr += '(';
    line.forEach((c, index, arr) => {
      // エスケープ処理
      const escapedStr = c.replace(/\'/g, "''");

      if (escapedStr === 'NULL') {
        insertStr += '' + escapedStr + ',';
      } else {
        insertStr += "'" + escapedStr + "',";
      }

      // 最終カラムか
      const isLastColumn = index === arr.length - 1;
      if (isLastColumn) {
        insertStr = insertStr.slice(0, -1);
        insertStr += '),\n';
      }
    });

    // 最終行か
    const isLastLine = i === lines.length - 1;
    if (isLastLine) {
      insertStr = insertStr.slice(0, -2) + ';';
    }
  }

  const sql = `BEGIN TRANSACTION;
INSERT INTO ${tableName} (${columnNames}) VALUES
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
