// CSV builder tests.

import { describe, expect, it } from 'vitest';

import { buildCsv, type CsvRow } from '@/utils/csvExport';

describe('buildCsv', () => {
  it('writes a header row plus body rows', () => {
    const rows: CsvRow[] = [
      {
        symbolName: 'AnalogDeadband',
        status: 'active',
        value: {
          symbolName: 'AnalogDeadband',
          stVal: 42,
          t: '2024-12-03T14:30:00.000Z',
          lastUpdated: new Date('2024-12-03T14:30:01.000Z'),
        },
      },
    ];
    const csv = buildCsv(rows, ['Symbol', 'Value', 'Timestamp', 'Last Updated', 'Status']);
    const lines = csv.trim().split('\n');
    expect(lines[0]).toBe('Symbol,Value,Timestamp,Last Updated,Status');
    expect(lines[1]).toContain('AnalogDeadband');
    expect(lines[1]).toContain('42');
    expect(lines[1]).toContain('active');
  });

  it('quotes fields with commas, quotes, and newlines', () => {
    const rows: CsvRow[] = [
      {
        symbolName: 'comma,name',
        status: 'inactive',
        value: undefined,
      },
    ];
    const csv = buildCsv(rows, ['a', 'b', 'c', 'd', 'e']);
    expect(csv).toContain('"comma,name"');
  });

  it('handles missing value gracefully', () => {
    const rows: CsvRow[] = [
      { symbolName: 'EmptySym', status: 'inactive', value: undefined },
    ];
    const csv = buildCsv(rows, ['Symbol', 'Value', 'Timestamp', 'Last Updated', 'Status']);
    expect(csv.trim().split('\n')[1]).toBe('EmptySym,,,,inactive');
  });
});
