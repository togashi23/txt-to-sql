// Monacoは非同期に読み込まれるため、読み込み済みかどうかをwindow経由で判定する
interface Window {
  monaco?: typeof monaco;
}

const MONACO_CDN = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs';

// CDNから読み込む場合、workerは同一オリジンから起動する必要があるためプロキシを挟む
self.MonacoEnvironment = {
  getWorkerUrl: () => {
    const proxy = `self.MonacoEnvironment = { baseUrl: '${MONACO_CDN}/' };
importScripts('${MONACO_CDN}/base/worker/workerMain.js');`;
    return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(proxy);
  },
};

/** IDから要素を取得する（存在しない場合は例外） */
const getElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`要素が見つかりません: ${id}`);
  }

  return element as T;
};

// エディタの生成前は参照されない
let inputEditor!: monaco.editor.IStandaloneCodeEditor;
let outputEditor!: monaco.editor.IStandaloneCodeEditor;

const THEME_KEY = 'txt-to-sql:theme';
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

// 手動で切り替えていない間はOSの設定に従う
const isDark = (): boolean => (localStorage.getItem(THEME_KEY) ?? (darkQuery.matches ? 'dark' : 'light')) === 'dark';

// テーマをhtml要素とMonacoの双方へ反映する
const applyTheme = (): void => {
  const dark = isDark();
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';

  // Monacoの読み込み前はcreate時のオプションで設定されるため何もしない
  if (window.monaco) {
    monaco.editor.setTheme(dark ? 'vs-dark' : 'vs');
  }
};

applyTheme();

getElement('theme-toggle').addEventListener('click', () => {
  localStorage.setItem(THEME_KEY, isDark() ? 'light' : 'dark');
  applyTheme();
});

// OSの設定変更は、手動で切り替えていない場合のみ反映する
darkQuery.addEventListener('change', () => {
  if (!localStorage.getItem(THEME_KEY)) {
    applyTheme();
  }
});

/** 対応しているDBMS */
type Dbms = 'sqlserver' | 'mysql';

/** トランザクション構文 */
interface TransactionSyntax {
  begin: string;
  rollback: string;
  commit: string;
}

/** DBMSごとのトランザクション構文 */
const TRANSACTION_SYNTAX: Record<Dbms, TransactionSyntax> = {
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

const dbmsSelect = getElement<HTMLSelectElement>('dbms');

const parseTsv = (str: string): string[][] => {
  let result: string[][] = [];
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

const create = (): void => {
  const tableName = getElement<HTMLInputElement>('table-name').value;
  const inputText = inputEditor.getValue();

  const lines = parseTsv(inputText);

  const columnNames = lines[0].join(',');

  let values: string[] = [];
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
  let statements: string[] = [];
  for (let i = 0; i < values.length; i += ROWS_PER_INSERT) {
    const chunk = values.slice(i, i + ROWS_PER_INSERT);
    statements.push(`INSERT INTO ${tableName} (${columnNames}) VALUES\n` + chunk.join(',\n') + ';');
  }

  const insertStr = statements.join('\n\n');

  // トランザクションありの場合は、既定でロールバックされるように囲む
  const syntax = TRANSACTION_SYNTAX[dbmsSelect.value as Dbms];
  const sql = getElement<HTMLInputElement>('use-transaction').checked
    ? `${syntax.begin}
${insertStr}
${syntax.rollback}
-- ${syntax.commit}`
    : insertStr;

  outputEditor.setValue(sql);
};

// SQLをクリップボードへコピーし、ボタンのラベルで結果を知らせる
const copy = async (): Promise<void> => {
  const label = getElement('copy-label');

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
  const commonOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    theme: isDark() ? 'vs-dark' : 'vs',
    padding: { top: 8 },
    fontSize: 13,
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    tabSize: 4,
  };

  inputEditor = monaco.editor.create(getElement('text-input'), {
    ...commonOptions,
    value: '',
    language: 'plaintext',
    wordWrap: 'off',
    renderWhitespace: 'all',
  });

  outputEditor = monaco.editor.create(getElement('sql-output'), {
    ...commonOptions,
    value: '',
    language: 'sql',
  });

  const copyButton = getElement<HTMLButtonElement>('copy');

  // SQLが空のうちはコピーボタンを無効にしておく
  const syncCopyButton = (): void => {
    copyButton.disabled = outputEditor.getValue() === '';
  };
  outputEditor.onDidChangeModelContent(syncCopyButton);
  syncCopyButton();

  getElement('create').addEventListener('click', create);
  copyButton.addEventListener('click', copy);

  // Ctrl + Enter で作成（エディタ側の既定の割り当てを上書きする）
  const createKeybinding = monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter;
  inputEditor.addCommand(createKeybinding, create);
  outputEditor.addCommand(createKeybinding, create);

  getElement('table-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      create();
    }
  });
});
