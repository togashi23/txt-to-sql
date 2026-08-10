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

const THEME_KEY = 'txt-to-sql:theme';
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

// 手動で切り替えていない間はOSの設定に従う
const isDark = () => (localStorage.getItem(THEME_KEY) ?? (darkQuery.matches ? 'dark' : 'light')) === 'dark';

// テーマをhtml要素とMonacoの双方へ反映する
const applyTheme = () => {
  const dark = isDark();
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';

  // Monacoの読み込み前はcreate時のオプションで設定されるため何もしない
  if (window.monaco) {
    monaco.editor.setTheme(dark ? 'vs-dark' : 'vs');
  }
};

applyTheme();

document.getElementById('theme-toggle').addEventListener('click', () => {
  localStorage.setItem(THEME_KEY, isDark() ? 'light' : 'dark');
  applyTheme();
});

// OSの設定変更は、手動で切り替えていない場合のみ反映する
darkQuery.addEventListener('change', () => {
  if (!localStorage.getItem(THEME_KEY)) {
    applyTheme();
  }
});

/** DBMSごとのトランザクション構文 */
const TRANSACTION_SYNTAX = {
  sqlserver: {
    begin: 'BEGIN TRANSACTION;',
    rollback: 'ROLLBACK TRANSACTION;',
    commit: 'COMMIT TRANSACTION;',
  },
  mysql: {
    begin: 'START TRANSACTION;',
    rollback: 'ROLLBACK;',
    commit: 'COMMIT;',
  },
};

const dbmsSelect = document.getElementById('dbms');

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

  // トランザクションありの場合は、既定でロールバックされるように囲む
  const syntax = TRANSACTION_SYNTAX[dbmsSelect.value];
  const sql = document.getElementById('use-transaction').checked
    ? `${syntax.begin}
${insertStr}
${syntax.rollback}
-- ${syntax.commit}`
    : insertStr;

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
  const commonOptions = {
    theme: isDark() ? 'vs-dark' : 'vs',
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
