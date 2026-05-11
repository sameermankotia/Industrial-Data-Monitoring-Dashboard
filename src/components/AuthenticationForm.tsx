import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { storageService } from '@/services/storageService';
import type { ApiError, AuthCredentials } from '@/types/api';
import AuthBrand from './AuthBrand';
import ErrorDisplay from './ErrorDisplay';
import FormField from './FormField';
import styles from './css/AuthenticationForm.module.css';

const URL_PATTERN = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

interface FormState {
  serverUrl: string;
  username: string;
  password: string;
  remember: boolean;
}

interface FieldErrors {
  serverUrl?: string;
  username?: string;
  password?: string;
}

interface Props {
  onSubmit: (credentials: AuthCredentials) => Promise<boolean>;
  onLoginSuccess: (creds: { username: string; serverUrl: string }) => void;
  loading: boolean;
  error: ApiError | null;
  onDismissError: () => void;
}

export default function AuthenticationForm({ onSubmit, onLoginSuccess, loading, error, onDismissError }: Props) {
  const { t } = useTranslation(['auth', 'common']);

  const [form, setForm] = useState<FormState>(() => ({
    serverUrl: storageService.getString('auth-server-url') ?? 'https://192.168.3.2',
    username: storageService.getString('auth-username') ?? '',
    password: '',
    remember: storageService.getBoolean('remember-credentials') ?? true,
  }));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    // focus whichever field is still empty so the user can start typing right away
    const empty = !form.serverUrl ? 'server-url' : !form.username ? 'username' : 'password';
    document.getElementById(empty)?.focus();
  }, []);

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (!form.serverUrl.trim()) {
      errors.serverUrl = t('auth:validation.serverRequired');
    } else if (!URL_PATTERN.test(form.serverUrl.trim())) {
      errors.serverUrl = t('auth:validation.serverInvalid');
    }
    if (!form.username.trim()) errors.username = t('auth:validation.usernameRequired');
    if (!form.password) errors.password = t('auth:validation.passwordRequired');
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const serverUrl = form.serverUrl.trim();
    const username = form.username.trim();
    const success = await onSubmit({ serverUrl, username, password: form.password });
    if (success) {
      onLoginSuccess({ username, serverUrl });
      if (form.remember) {
        storageService.setString('auth-server-url', serverUrl);
        storageService.setString('auth-username', username);
        storageService.setBoolean('remember-credentials', true);
      } else {
        storageService.remove('auth-server-url');
        storageService.remove('auth-username');
        storageService.setBoolean('remember-credentials', false);
      }
    }
  };

  return (
    <div className={styles.shell}>
      <div className={styles.card}>
        <AuthBrand title={t('auth:title')} subtitle={t('auth:subtitle')} />

        <form noValidate onSubmit={handleSubmit} className={styles.form}>
          <FormField
            id="server-url"
            label={t('auth:fields.serverUrl')}
            type="url"
            autoComplete="url"
            placeholder={t('auth:fields.serverUrlPlaceholder')}
            value={form.serverUrl}
            error={fieldErrors.serverUrl}
            disabled={loading}
            onChange={(v) => setForm({ ...form, serverUrl: v })}
          />
          <FormField
            id="username"
            label={t('auth:fields.username')}
            type="text"
            autoComplete="username"
            placeholder={t('auth:fields.usernamePlaceholder')}
            value={form.username}
            error={fieldErrors.username}
            disabled={loading}
            onChange={(v) => setForm({ ...form, username: v })}
          />
          <FormField
            id="password"
            label={t('auth:fields.password')}
            type="password"
            autoComplete="current-password"
            placeholder={t('auth:fields.passwordPlaceholder')}
            value={form.password}
            error={fieldErrors.password}
            disabled={loading}
            onChange={(v) => setForm({ ...form, password: v })}
          />

          <label className={styles.remember}>
            <input
              type="checkbox"
              checked={form.remember}
              onChange={(e) => setForm({ ...form, remember: e.target.checked })}
              disabled={loading}
            />
            <span>{t('auth:remember')}</span>
          </label>

          {error && (
            <div className={styles.errorWrap}>
              <ErrorDisplay error={error} onDismiss={onDismissError} />
            </div>
          )}

          <button
            type="submit"
            className={`btn btn-primary ${styles.submit}`}
            disabled={loading}
          >
            {loading ? t('auth:submitting') : t('auth:submit')}
          </button>
        </form>

        <p className={styles.footer}>{t('auth:footer')}</p>
      </div>
    </div>
  );
}
