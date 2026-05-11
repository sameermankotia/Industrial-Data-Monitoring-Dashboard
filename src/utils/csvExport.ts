// buildCsv (pure, testable) + downloadCsv (browser file trigger) for the dashboard table export

import type { SymbolValue, SymbolStatus } from '@/types/api';

interface CsvRow {
  symbolName: string;
  value: SymbolValue | undefined;
  status: SymbolStatus;
}


function escape(field: string | number | undefined | null): string {
  if (field === undefined || field === null) return '';
  const s = String(field);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// caller supplies localized headers; columns match the dashboard table order
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

// creates a temporary anchor, clicks it to trigger download, then cleans up the blob URL
export function downloadCsv(filename: string, csv: string): void {
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
