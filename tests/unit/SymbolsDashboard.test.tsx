import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';

import SymbolsDashboard from '@/components/SymbolsDashboard';
import i18n from '@/i18n';
import type { Symbol, SymbolValue } from '@/types/api';

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

const symbols: Symbol[] = [
  { name: 'AnalogDeadband', type: 'INS', description: 'Analog input deadband threshold' },
  { name: 'BinaryDebounce', type: 'INS', description: 'Binary debounce' },
  { name: 'CommTimeout', type: 'INS', description: 'Comm timeout' },
  { name: 'SystemTimer', type: 'INS', description: 'System timer' },
];

// builds a values map for all test symbols — pass overrides to set specific stVal/timestamp per symbol
const buildValues = (overrides: Partial<Record<string, Partial<SymbolValue>>> = {}): Map<string, SymbolValue> => {
  const m = new Map<string, SymbolValue>();
  for (const s of symbols) {
    const ov = overrides[s.name] ?? {};
    m.set(s.name, {
      symbolName: s.name,
      stVal: ov.stVal ?? 1,
      t: ov.t ?? '2024-12-03T14:30:00.000Z',
      lastUpdated: ov.lastUpdated ?? new Date(),
    });
  }
  return m;
};

// same pattern as renderForm ,wrapped in i18n provider and spread in any overrides
const renderDashboard = (override?: Partial<React.ComponentProps<typeof SymbolsDashboard>>) => {
  const defaults = {
    symbols,
    values: buildValues({ AnalogDeadband: { stVal: 42 }, BinaryDebounce: { stVal: 150 }, CommTimeout: { stVal: 5000 }, SystemTimer: { stVal: 12_458 } }),
    isPolling: false,
    pollingInterval: 2000,
    loading: false,
    onTogglePolling: vi.fn(),
    onIntervalChange: vi.fn(),
    onSelectSymbol: vi.fn(),
    ...override,
  };
  return {
    ...defaults,
    ...render(
      <I18nextProvider i18n={i18n}>
        <SymbolsDashboard {...defaults} />
      </I18nextProvider>,
    ),
  };
};

describe('SymbolsDashboard', () => {
  it('renders all rows', () => {
    renderDashboard();
    // Both the table row and the mobile card render the name, so getAllByText is used.
    expect(screen.getAllByText('AnalogDeadband').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SystemTimer').length).toBeGreaterThan(0);
  });

  it('filters by search term', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await user.type(screen.getByPlaceholderText(/search symbols/i), 'comm');
    expect(screen.getAllByText('CommTimeout').length).toBeGreaterThan(0);
    expect(screen.queryByText('SystemTimer')).not.toBeInTheDocument();
  });

  it('toggles sort direction when the symbol header is clicked twice', async () => {
    const user = userEvent.setup();
    renderDashboard();
    const symHeader = screen.getByRole('button', { name: /symbol name/i });

    await user.click(symHeader);
    let rows = screen.getAllByRole('row').slice(1); // skip header
    expect(within(rows[0]!).getByText('SystemTimer')).toBeInTheDocument();

    await user.click(symHeader);
    rows = screen.getAllByRole('row').slice(1);
    expect(within(rows[0]!).getByText('AnalogDeadband')).toBeInTheDocument();
  });

  it('opens detail when a row is clicked', async () => {
    const user = userEvent.setup();
    const onSelectSymbol = vi.fn();
    renderDashboard({ onSelectSymbol });
    // Click the first occurrence (table row); the mobile card is the second.
    await user.click(screen.getAllByText('AnalogDeadband')[0]!);
    expect(onSelectSymbol).toHaveBeenCalledWith('AnalogDeadband');
  });

  it('shows the empty state when search matches nothing', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await user.type(screen.getByPlaceholderText(/search symbols/i), 'zzzzzzz');
    // Both the table and the mobile card list show the empty message.
    expect(screen.getAllByText(/no symbols match/i).length).toBeGreaterThan(0);
  });

  it('toggles polling button label based on isPolling prop', () => {
    const { rerender } = render(
      <I18nextProvider i18n={i18n}>
        <SymbolsDashboard
          symbols={symbols}
          values={buildValues()}
          isPolling={false}
          pollingInterval={2000}
          loading={false}
          onTogglePolling={vi.fn()}
          onIntervalChange={vi.fn()}
          onSelectSymbol={vi.fn()}
        />
      </I18nextProvider>,
    );
    expect(screen.getByRole('button', { name: /start polling/i })).toBeInTheDocument();

    rerender(
      <I18nextProvider i18n={i18n}>
        <SymbolsDashboard
          symbols={symbols}
          values={buildValues()}
          isPolling
          pollingInterval={2000}
          loading={false}
          onTogglePolling={vi.fn()}
          onIntervalChange={vi.fn()}
          onSelectSymbol={vi.fn()}
        />
      </I18nextProvider>,
    );
    expect(screen.getByRole('button', { name: /stop polling/i })).toBeInTheDocument();
  });
});
