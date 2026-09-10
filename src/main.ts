import { buildInsertSql, type Dbms } from './sql.js';

// Monacoの読み込み状態をwindow経由で判定する
declare global {
  interface Window {
    monaco?: typeof monaco;
  }
}

const MONACO_CDN = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs';

// CDN上のWorkerを同一オリジンのdata URL経由で起動する
self.MonacoEnvironment = {
  getWorkerUrl: () => {
    const proxy = `self.MonacoEnvironment = { baseUrl: '${MONACO_CDN}/' };
importScripts('${MONACO_CDN}/base/worker/workerMain.js');`;
    return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(proxy);
  },
};

const getElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`要素が見つかりません: ${id}`);
  }

  return element as T;
};

let inputEditor!: monaco.editor.IStandaloneCodeEditor;
let outputEditor!: monaco.editor.IStandaloneCodeEditor;

const THEME_KEY = 'txt-to-sql:theme';
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

const isDark = (): boolean => (localStorage.getItem(THEME_KEY) ?? (darkQuery.matches ? 'dark' : 'light')) === 'dark';

const applyTheme = (): void => {
  const dark = isDark();
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';

  // 読み込み前のMonacoには生成時にテーマを渡す
  if (window.monaco) {
    monaco.editor.setTheme(dark ? 'vs-dark' : 'vs');
  }
};

applyTheme();

getElement('theme-toggle').addEventListener('click', () => {
  localStorage.setItem(THEME_KEY, isDark() ? 'light' : 'dark');
  applyTheme();
});

darkQuery.addEventListener('change', () => {
  if (!localStorage.getItem(THEME_KEY)) {
    applyTheme();
  }
});

const create = (): void => {
  const sql = buildInsertSql(inputEditor.getValue(), {
    tableName: getElement<HTMLInputElement>('table-name').value,
    dbms: getElement<HTMLSelectElement>('dbms').value as Dbms,
    useTransaction: getElement<HTMLInputElement>('use-transaction').checked,
  });

  outputEditor.setValue(sql);
};

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

  const syncCopyButton = (): void => {
    copyButton.disabled = outputEditor.getValue() === '';
  };
  outputEditor.onDidChangeModelContent(syncCopyButton);
  syncCopyButton();

  getElement('create').addEventListener('click', create);
  copyButton.addEventListener('click', copy);

  // Monaco既定の割り当てを上書きする
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
