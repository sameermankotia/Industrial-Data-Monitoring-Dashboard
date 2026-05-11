import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Symbol, SymbolValue } from '@/types/api';
import { deriveStatus } from '@/utils/formatters';
import { buildCsv, downloadCsv, type CsvRow } from '@/utils/csvExport';
import PollingControls from './PollingControls';
import SymbolTable, { type Row, type SortKey, type SortDir } from './SymbolTable';
import SymbolCardList from './SymbolCardList';
import DashboardFooter from './DashboardFooter';
import styles from './css/SymbolsDashboard.module.css';

interface Props {
  symbols: Symbol[];
  values: Map<string, SymbolValue>;
  isPolling: boolean;
  pollingInterval: number;
  loading: boolean;
  onTogglePolling: () => void;
  onIntervalChange: (ms: number) => void;
  onSelectSymbol: (name: string) => void;
}

export default function SymbolsDashboard({
  symbols,
  values,
  isPolling,
  pollingInterval,
  loading,
  onTogglePolling,
  onIntervalChange,
  onSelectSymbol,
}: Props) {
  const { t, i18n } = useTranslation(['dashboard', 'common']);

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [pollingStartedAt, setPollingStartedAt] = useState<number | null>(null);
  const [pageInput, setPageInput] = useState('1');

  // tick every second so "X ago" labels and the elapsed timer stay current
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (isPolling) {
      setPollingStartedAt((prev) => prev ?? Date.now()); // preserve original start time across rerenders
    } else {
      setPollingStartedAt(null);
    }
  }, [isPolling]);

  const rows: Row[] = useMemo(() => {
    return symbols.map((s) => {
      const value = values.get(s.name);
      const status = value && value.lastUpdated.getTime() > 0
        ? deriveStatus(value.lastUpdated)
        : 'inactive';
      return { symbol: s, value, status };
    });
  }, [symbols, values]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.symbol.name.toLowerCase().includes(q));
  }, [rows, search]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') {
        cmp = a.symbol.name.localeCompare(b.symbol.name);
      } else {
        const av = a.value?.stVal ?? Number.NEGATIVE_INFINITY; // push missing values to bottom when sorting by value
        const bv = b.value?.stVal ?? Number.NEGATIVE_INFINITY;
        cmp = av - bv;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = sorted.slice(pageStart, pageStart + pageSize);

  useEffect(() => { setPage(1); }, [search, sortKey, sortDir, pageSize]);
  useEffect(() => { setPageInput(String(safePage)); }, [safePage]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const commitPageInput = () => {
    const n = parseInt(pageInput, 10);
    const clamped = isNaN(n) ? safePage : Math.min(Math.max(1, n), totalPages);
    setPage(clamped);
    setPageInput(String(clamped));
  };

  const handleExport = () => {
    const csvRows: CsvRow[] = sorted.map((r) => ({
      symbolName: r.symbol.name,
      value: r.value,
      status: r.status,
    }));
    const headers = [
      t('dashboard:table.symbol'),
      t('dashboard:table.value'),
      t('dashboard:table.timestamp'),
      t('dashboard:table.lastUpdated'),
      t('dashboard:table.status'),
    ];
    const csv = buildCsv(csvRows, headers);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadCsv(`industrial-symbols-${stamp}.csv`, csv);
  };

  const lng = i18n.resolvedLanguage ?? 'en';

  return (
    <section className={styles.wrap}>
      <PollingControls
        search={search}
        isPolling={isPolling}
        loading={loading}
        pollingInterval={pollingInterval}
        pollingStartedAt={pollingStartedAt}
        onSearchChange={setSearch}
        onTogglePolling={onTogglePolling}
        onIntervalChange={onIntervalChange}
      />

      <SymbolTable
        loading={loading}
        symbolCount={symbols.length}
        pageRows={pageRows}
        sortKey={sortKey}
        sortDir={sortDir}
        lng={lng}
        onToggleSort={toggleSort}
        onSelectSymbol={onSelectSymbol}
      />

      <SymbolCardList
        loading={loading}
        symbolCount={symbols.length}
        pageRows={pageRows}
        lng={lng}
        onSelectSymbol={onSelectSymbol}
      />

      <DashboardFooter
        shownCount={sorted.length}
        totalCount={symbols.length}
        exportDisabled={sorted.length === 0}
        pageSize={pageSize}
        safePage={safePage}
        totalPages={totalPages}
        pageInput={pageInput}
        onPageSizeChange={setPageSize}
        onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setPage((p) => Math.min(totalPages, p + 1))}
        onPageInputChange={setPageInput}
        onPageInputCommit={commitPageInput}
        onExport={handleExport}
      />

      <p className="sr-only" aria-live="polite">
        {isPolling
          ? `Polling every ${pollingInterval / 1000} seconds`
          : 'Polling stopped'}
      </p>
    </section>
  );
}
