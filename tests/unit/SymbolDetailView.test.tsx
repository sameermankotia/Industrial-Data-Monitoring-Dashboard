import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';

vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="line-chart" />,
}));

import SymbolDetailView from '@/components/SymbolDetailView';
import i18n from '@/i18n';
import type { SymbolHistory, SymbolValue } from '@/types/api';

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

// shorthand so each test doesn't have to repeat the i18n provider boilerplate
const wrap = (node: React.ReactNode) => (
  <I18nextProvider i18n={i18n}>{node}</I18nextProvider>
);

const sampleValue: SymbolValue = {
  symbolName: 'AnalogDeadband',
  stVal: 42,
  t: '2024-12-03T14:30:00.000Z',
  lastUpdated: new Date(),
  rawData: {
    stVal: 42,
    q: {
      validity: 'good',
      source: 'process',
      test: false,
      operatorBlocked: false,
      detailQual: {
        overflow: false,
        outOfRange: false,
        badReference: false,
        oscillatory: false,
        failure: false,
        oldData: false,
        inconsistent: false,
        inaccurate: false,
      },
    },
    t: {
      value: '2024-12-03T14:30:00.000Z',
      leapSecondsKnown: true,
      clockFailure: false,
      clockNotSynchronized: false,
      timeAccuracy: 10,
      source: 'ntp',
    },
    range: 'normal',
    units: 'mV',
    multiplier: 1,
    d: 'Analog input deadband threshold',
  },
};

const history: SymbolHistory = {
  symbolName: 'AnalogDeadband',
  maxPoints: 50,
  dataPoints: [
    { value: 40, timestamp: new Date(), formattedTime: '14:29:55' },
    { value: 42, timestamp: new Date(), formattedTime: '14:30:00' },
  ],
};

describe('SymbolDetailView', () => {
  it('returns null when closed', () => {
    const { container } = render(
      wrap(
        <SymbolDetailView open={false} symbolName={null} value={undefined} history={undefined} onClose={vi.fn()} />,
      ),
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders symbol name, value, units and the chart when open', () => {
    render(
      wrap(
        <SymbolDetailView
          open
          symbolName="AnalogDeadband"
          value={sampleValue}
          history={history}
          onClose={vi.fn()}
        />,
      ),
    );

    expect(screen.getByRole('heading', { name: 'AnalogDeadband' })).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getAllByText('mV').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('shows an empty chart message when history is missing', () => {
    render(
      wrap(
        <SymbolDetailView
          open
          symbolName="AnalogDeadband"
          value={sampleValue}
          history={undefined}
          onClose={vi.fn()}
        />,
      ),
    );
    expect(screen.getByText(/no history yet/i)).toBeInTheDocument();
  });

  it('closes on close button and ESC', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      wrap(
        <SymbolDetailView
          open
          symbolName="AnalogDeadband"
          value={sampleValue}
          history={history}
          onClose={onClose}
        />,
      ),
    );
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
    onClose.mockClear();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
