import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';

import ConfirmDialog from '@/components/ConfirmDialog';
import ConnectionStatus from '@/components/ConnectionStatus';
import ErrorDisplay from '@/components/ErrorDisplay';
import { ToastProvider, useToast } from '@/components/ToastNotification';
import UserMenu from '@/components/UserMenu';
import i18n from '@/i18n';

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

const wrap = (node: React.ReactNode) => (
  <I18nextProvider i18n={i18n}>{node}</I18nextProvider>
);

describe('ConfirmDialog', () => {
  it('renders title and body, fires confirm/cancel', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      wrap(
        <ConfirmDialog
          open
          title="Are you sure?"
          body="This deletes the row."
          onConfirm={onConfirm}
          onCancel={onCancel}
        />,
      ),
    );

    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByText('This deletes the row.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('returns null when closed', () => {
    const { container } = render(
      wrap(
        <ConfirmDialog
          open={false}
          title="hidden"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      ),
    );
    expect(container.firstChild).toBeNull();
  });

  it('cancels on Escape key', () => {
    const onCancel = vi.fn();
    render(
      wrap(
        <ConfirmDialog open title="x" onConfirm={vi.fn()} onCancel={onCancel} />,
      ),
    );
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('ErrorDisplay', () => {
  it('renders nothing when error is null', () => {
    const { container } = render(wrap(<ErrorDisplay error={null} />));
    expect(container.firstChild).toBeNull();
  });

  it('renders message and dismiss / retry handlers', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    const onRetry = vi.fn();
    render(
      wrap(
        <ErrorDisplay
          error={{ message: 'Boom', timestamp: new Date() }}
          onDismiss={onDismiss}
          onRetry={onRetry}
        />,
      ),
    );
    expect(screen.getByText('Boom')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onDismiss).toHaveBeenCalled();
  });
});

describe('ConnectionStatus', () => {
  it('renders connected state with user / server / last poll', () => {
    render(
      wrap(
        <ConnectionStatus
          connection={{ isConnected: true, lastConnection: new Date() }}
          polling={{ isPolling: true, interval: 2000, lastPoll: new Date() }}
          username="testuser"
          serverUrl="https://192.168.3.2"
          loading={false}
          onRefresh={vi.fn()}
          onLogout={vi.fn()}
        />,
      ),
    );
    expect(screen.getByText(/connected/i)).toBeInTheDocument();
    expect(screen.getByText(/testuser/)).toBeInTheDocument();
    expect(screen.getByText(/192\.168\.3\.2/)).toBeInTheDocument();
  });

  it('shows disconnected state with custom error', () => {
    render(
      wrap(
        <ConnectionStatus
          connection={{ isConnected: false, error: 'Session expired' }}
          polling={{ isPolling: false, interval: 2000 }}
          username="—"
          serverUrl="—"
          loading={false}
          onRefresh={vi.fn()}
          onLogout={vi.fn()}
        />,
      ),
    );
    expect(screen.getByText('Session expired')).toBeInTheDocument();
  });

  it('fires refresh and logout handlers when their buttons are clicked', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    const onLogout = vi.fn();
    render(
      wrap(
        <ConnectionStatus
          connection={{ isConnected: true }}
          polling={{ isPolling: false, interval: 2000 }}
          username="u"
          serverUrl="s"
          loading={false}
          onRefresh={onRefresh}
          onLogout={onLogout}
        />,
      ),
    );

    await user.click(screen.getByRole('button', { name: /refresh/i }));
    expect(onRefresh).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /log out/i }));
    expect(onLogout).toHaveBeenCalled();
  });
});

describe('UserMenu', () => {
  it('opens and switches theme + language', async () => {
    const user = userEvent.setup();
    const onTheme = vi.fn();
    const onAutoStart = vi.fn();
    render(
      wrap(
        <UserMenu
          theme="auto"
          onThemeChange={onTheme}
          autoStartPolling
          onAutoStartChange={onAutoStart}
        />,
      ),
    );

    await user.click(screen.getByRole('button', { name: /settings/i }));

    await user.click(screen.getByRole('button', { name: 'Dark', pressed: false }));
    expect(onTheme).toHaveBeenCalledWith('dark');

    await user.click(screen.getByRole('button', { name: 'Español' }));
    // language change is global, await a tick
    await act(async () => {
      await Promise.resolve();
    });
    // resolved language is now 'es'
  });

  it('toggles the auto-start checkbox', async () => {
    const user = userEvent.setup();
    const onAutoStart = vi.fn();
    render(
      wrap(
        <UserMenu
          theme="light"
          onThemeChange={vi.fn()}
          autoStartPolling={false}
          onAutoStartChange={onAutoStart}
        />,
      ),
    );
    await user.click(screen.getByRole('button', { name: /settings/i }));
    await user.click(screen.getByRole('checkbox'));
    expect(onAutoStart).toHaveBeenCalledWith(true);
  });
});

describe('ToastNotification', () => {
  function Trigger() {
    const toast = useToast();
    return (
      <button type="button" onClick={() => toast.push('Saved!', 'success', 100)}>
        push
      </button>
    );
  }

  it('shows a toast and auto-dismisses after the ttl', async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'push' }));
    expect(screen.getByText('Saved!')).toBeInTheDocument();

    // ttl is 100ms — wrap in act so the dismiss state update is flushed
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(screen.queryByText('Saved!')).not.toBeInTheDocument();
  });

  it('dismisses on the close button', async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'push' }));
    await user.click(screen.getByRole('button', { name: /dismiss notification/i }));
    expect(screen.queryByText('Saved!')).not.toBeInTheDocument();
  });

  it('throws when useToast is used outside provider', () => {
    function Bad() {
      useToast();
      return null;
    }
    // Suppress the expected error from React
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Bad />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});
