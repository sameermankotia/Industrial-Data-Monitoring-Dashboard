// CSV export for the dashboard table. here I have two helpers:
//   - buildCsv: pure string-builder, easy to unit test
//   - downloadCsv: hands the string to the browser as a file download

import type { SymbolValue, SymbolStatus } from '@/types/api';

interface CsvRow {
  symbolName: string;
  value: SymbolValue | undefined;
  status: SymbolStatus;
}

// Wrap fields containing commas, quotes, or newlines in double-quotes and
// escape any embedded quotes by doubling them. Standard CSV rules.
function escape(field: string | number | undefined | null): string {
  if (field === undefined || field === null) return '';
  const s = String(field);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// Build the CSV body. Caller passes the localized header row so this stays
// language-agnostic. Column order matches the dashboard table:
// Symbol Name, Value, Timestamp, Last Updated, Status.
export function buildCsv(rows: CsvRow[], headers: string[]): string {
  const head = headers.map(escape).join(',');
  const body = rows
    .map((row) => {
      return [
        escape(row.symbolName),
        escape(row.value?.stVal),
        escape(row.value?.t),
        escape(row.value?.lastUpdated?.toISOString()),
        escape(row.status),
      ].join(',');
    })
    .join('\n');
  return `${head}\n${body}\n`;
}

// Trigger a browser download. Creates a temporary anchor, clicks it, and
// cleans up the blob URL afterwards.
export function downloadCsv(filename: string, csv: string): void {
  // The first character is a BOM (U+FEFF).
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // pushes it to the next tick, after the click has been queued.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export type { CsvRow };
