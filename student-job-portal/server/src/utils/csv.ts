export interface CsvColumn {
  key: string;
  header: string;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);

  // A cell starting with = + - @ can run as a formula when opened in Excel.
  // Student-entered text (names, titles) ends up here, so neutralise it.
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;

  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Builds CSV text that Excel opens correctly (UTF-8 with a byte order mark). */
export function toCsv(rows: Record<string, unknown>[], columns: CsvColumn[]): string {
  const header = columns.map((c) => formatCell(c.header)).join(',');
  const lines = rows.map((row) => columns.map((c) => formatCell(row[c.key])).join(','));
  return '﻿' + [header, ...lines].join('\r\n') + '\r\n';
}
