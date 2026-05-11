import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AuthenticationForm from '@/components/AuthenticationForm';
import ConfirmDialog from '@/components/ConfirmDialog';
import ConnectionStatus from '@/components/ConnectionStatus';
import ErrorDisplay from '@/components/ErrorDisplay';
import SymbolDetailView from '@/components/SymbolDetailView';
import SymbolsDashboard from '@/components/SymbolsDashboard';
import { ToastProvider, useToast } from '@/components/ToastNotification';
import UserMenu, { type ThemePreference } from '@/components/UserMenu';
import { useSymbolPolling } from '@/hooks/useSymbolPolling';
import { storageService } from '@/services/storageService';
import styles from './App.module.css';

// sets the data-theme attribute on <html> which the CSS variables all key off of
function applyTheme(theme: ThemePreference) {
  document.documentElement.setAttribute('data-theme', theme);
}

function AppShell() {
  const { t, i18n } = useTranslation();
  const toast = useToast();

  const polling = useSymbolPolling();
  const [theme, setTheme] = useState<ThemePreference>(() => {
    const stored = storageService.getString('theme');
    return stored === 'light' || stored === 'dark' || stored === 'auto' ? stored : 'auto';
  });
  const [autoStart, setAutoStart] = useState<boolean>(
    () => storageService.getBoolean('auto-start-polling') ?? true,
  );
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [sessionCreds, setSessionCreds] = useState<{ username: string; serverUrl: string } | null>(null);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage ?? 'en';
  }, [i18n.resolvedLanguage]);

  // start polling automatically once symbols are available, if the user has that setting on
  const symbolCount = polling.symbols.length;
  useEffect(() => {
    if (
      autoStart &&
      polling.connectionStatus.isConnected &&
      symbolCount > 0 &&
      !polling.pollingState.isPolling
    ) {
      polling.startPolling();
    }
  }, [autoStart, polling.connectionStatus.isConnected, symbolCount]);

  // show fetch errors as a toast so they're visible even if the error banner gets dismissed
  useEffect(() => {
    if (polling.error && !polling.error.cancelled) {
      toast.push(polling.error.message, 'error');
    }
  }, [polling.error, toast]);

  const handleThemeChange = (next: ThemePreference) => {
    setTheme(next);
    storageService.setString('theme', next);
  };

  const handleAutoStartChange = (val: boolean) => {
    setAutoStart(val);
    storageService.setBoolean('auto-start-polling', val);
  };

  const handleLogout = () => {
    polling.disconnect();
    setActiveSymbol(null);
    setConfirmLogout(false);
    setSessionCreds(null);
    toast.push(t('actions.logout'), 'info');
  };

  const handleTogglePolling = () => {
    if (polling.pollingState.isPolling) polling.stopPolling();
    else polling.startPolling();
  };

  if (!polling.connectionStatus.isConnected) {
    return (
      <div className={styles.loginWrap}>
        <div className={styles.loginSettings}>
          <UserMenu
            theme={theme}
            onThemeChange={handleThemeChange}
            autoStartPolling={autoStart}
            onAutoStartChange={handleAutoStartChange}
            showAutoStart={false}
          />
        </div>
        <AuthenticationForm
          onSubmit={polling.authenticate}
          onLoginSuccess={setSessionCreds}
          loading={polling.loading}
          error={polling.error}
          onDismissError={polling.clearError}
        />
      </div>
    );
  }

  const username = sessionCreds?.username ?? storageService.getString('auth-username') ?? '—';
  const serverUrl = sessionCreds?.serverUrl ?? storageService.getString('auth-server-url') ?? '—';
  const activeValue = activeSymbol ? polling.symbolValues.get(activeSymbol) : undefined;
  const activeHistory = activeSymbol ? polling.symbolHistory.get(activeSymbol) : undefined;

  return (
    <div className={styles.app}>
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <div className={styles.logoBadge} aria-hidden="true">
            ID
          </div>
          <span className={styles.appTitle}>{t('appShortName')}</span>
        </div>
        <div className={styles.actions}>
          <UserMenu
            theme={theme}
            onThemeChange={handleThemeChange}
            autoStartPolling={autoStart}
            onAutoStartChange={handleAutoStartChange}
          />
        </div>
      </header>

      <ConnectionStatus
        connection={polling.connectionStatus}
        polling={polling.pollingState}
        username={username}
        serverUrl={serverUrl}
        loading={polling.loading}
        onRefresh={polling.refreshOnce}
        onLogout={() => setConfirmLogout(true)}
      />

      <main className={styles.main}>
        {polling.error && !polling.error.cancelled && (
          <div className={styles.errorWrap}>
            <ErrorDisplay
              error={polling.error}
              onDismiss={polling.clearError}
              onRetry={polling.refreshOnce}
            />
          </div>
        )}

        <SymbolsDashboard
          symbols={polling.symbols}
          values={polling.symbolValues}
          isPolling={polling.pollingState.isPolling}
          pollingInterval={polling.pollingState.interval}
          loading={polling.loading}
          onTogglePolling={handleTogglePolling}
          onIntervalChange={polling.setPollingInterval}
          onSelectSymbol={setActiveSymbol}
        />
      </main>

      <SymbolDetailView
        open={activeSymbol !== null}
        symbolName={activeSymbol}
        value={activeValue}
        history={activeHistory}
        onClose={() => setActiveSymbol(null)}
      />

      <ConfirmDialog
        open={confirmLogout}
        title={t('dashboard:logoutConfirm.title')}
        body={t('dashboard:logoutConfirm.body')}
        confirmLabel={t('dashboard:logoutConfirm.confirm')}
        destructive
        onCancel={() => setConfirmLogout(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}
