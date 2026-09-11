import 'monaco-editor/esm/vs/editor/edcore.main.js';
import 'monaco-editor/esm/vs/basic-languages/sql/sql.contribution.js';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker';
import { Copy, createIcons, FileText, Moon, Play, Sun, Table2 } from 'lucide';
import { buildInsertSql, type Dbms } from './sql.js';

self.MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
};

createIcons({ icons: { Copy, FileText, Moon, Play, Sun, Table2 } });

const getElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`要素が見つかりません: ${id}`);
  }

  return element as T;
};

const THEME_KEY = 'txt-to-sql:theme';
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

const isDark = (): boolean => (localStorage.getItem(THEME_KEY) ?? (darkQuery.matches ? 'dark' : 'light')) === 'dark';

const applyTheme = (): void => {
  const dark = isDark();
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  monaco.editor.setTheme(dark ? 'vs-dark' : 'vs');
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

const commonOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
  padding: { top: 8 },
  fontSize: 13,
  automaticLayout: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  tabSize: 4,
};

const inputEditor = monaco.editor.create(getElement('text-input'), {
  ...commonOptions,
  value: '',
  language: 'plaintext',
  wordWrap: 'off',
  renderWhitespace: 'all',
});

const outputEditor = monaco.editor.create(getElement('sql-output'), {
  ...commonOptions,
  value: '',
  language: 'sql',
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
