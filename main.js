const MONACO_CDN = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs';

// CDNから読み込む場合、workerは同一オリジンから起動する必要があるためプロキシを挟む
self.MonacoEnvironment = {
  getWorkerUrl: () => {
    const proxy = `self.MonacoEnvironment = { baseUrl: '${MONACO_CDN}/' };
importScripts('${MONACO_CDN}/base/worker/workerMain.js');`;
    return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(proxy);
  },
};

let inputEditor;
let outputEditor;

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
  const inputText = inputEditor.getValue();

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

  outputEditor.setValue(sql);
};

// SQLをクリップボードへコピーし、ボタンのラベルで結果を知らせる
const copy = async () => {
  const label = document.getElementById('copy-label');

  try {
    await navigator.clipboard.writeText(outputEditor.getValue());
    label.textContent = 'コピーしました';
  } catch {
    label.textContent = 'コピーできません';
  }

  setTimeout(() => {
    label.textContent = 'コピー';
  }, 1500);
};

require.config({ paths: { vs: MONACO_CDN } });

require(['vs/editor/editor.main'], () => {
  // OSのカラースキームにエディタのテーマを合わせる
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const currentTheme = () => (darkQuery.matches ? 'vs-dark' : 'vs');

  const commonOptions = {
    theme: currentTheme(),
    padding: { top: 8 },
    fontSize: 13,
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    tabSize: 4,
  };

  inputEditor = monaco.editor.create(document.getElementById('text-input'), {
    ...commonOptions,
    value: '',
    language: 'plaintext',
    wordWrap: 'off',
    renderWhitespace: 'all',
  });

  outputEditor = monaco.editor.create(document.getElementById('sql-output'), {
    ...commonOptions,
    value: '',
    language: 'sql',
  });

  darkQuery.addEventListener('change', () => {
    monaco.editor.setTheme(currentTheme());
  });

  const copyButton = document.getElementById('copy');

  // SQLが空のうちはコピーボタンを無効にしておく
  const syncCopyButton = () => {
    copyButton.disabled = outputEditor.getValue() === '';
  };
  outputEditor.onDidChangeModelContent(syncCopyButton);
  syncCopyButton();

  document.getElementById('create').addEventListener('click', create);
  copyButton.addEventListener('click', copy);

  // Ctrl + Enter で作成（エディタ側の既定の割り当てを上書きする）
  const createKeybinding = monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter;
  inputEditor.addCommand(createKeybinding, create);
  outputEditor.addCommand(createKeybinding, create);

  document.getElementById('table-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      create();
    }
  });
});
