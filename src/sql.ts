export type Dbms = 'sqlserver' | 'mysql' | 'postgresql';

interface TransactionSyntax {
  begin: string;
  rollback: string;
  commit: string;
}

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
  postgresql: {
    begin: 'BEGIN;',
    rollback: 'ROLLBACK;',
    commit: 'COMMIT;',
  },
};

const ROWS_PER_INSERT = 1000;

interface InsertSqlOptions {
  tableName: string;
  dbms: Dbms;
  useTransaction: boolean;
}

const parseTsv = (str: string): string[][] => str.split(/\r\n|\n|\r/).map((line) => line.split('\t'));

const toSqlValue = (cell: string): string => {
  const escapedStr = cell.replace(/'/g, "''");

  return escapedStr === 'NULL' ? escapedStr : "'" + escapedStr + "'";
};

export const buildInsertSql = (tsv: string, { tableName, dbms, useTransaction }: InsertSqlOptions): string => {
  const [header, ...rows] = parseTsv(tsv);

  const columnNames = header.join(',');
  const values = rows.map((row) => '(' + row.map(toSqlValue).join(',') + ')');

  const statements: string[] = [];
  for (let i = 0; i < values.length; i += ROWS_PER_INSERT) {
    const chunk = values.slice(i, i + ROWS_PER_INSERT);
    statements.push(`INSERT INTO ${tableName} (${columnNames}) VALUES\n` + chunk.join(',\n') + ';');
  }

  const insertStr = statements.join('\n\n');

  if (!useTransaction) {
    return insertStr;
  }

  const syntax = TRANSACTION_SYNTAX[dbms];
  return `${syntax.begin}
${insertStr}
${syntax.rollback}
-- ${syntax.commit}`;
};
