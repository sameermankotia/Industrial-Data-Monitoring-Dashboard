import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { storageService } from '@/services/storageService';
import type { ApiError, AuthCredentials } from '@/types/api';
import ErrorDisplay from './ErrorDisplay';
import styles from './AuthenticationForm.module.css';

interface Props {
  onSubmit: (credentials: AuthCredentials) => Promise<boolean>;
  loading: boolean;
  error: ApiError | null;
  onDismissError: () => void;
}

// basic url check
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

export default function AuthenticationForm({ onSubmit, loading, error, onDismissError }: Props) {
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
    const empty =
      !form.serverUrl ? 'server-url' : !form.username ? 'username' : 'password';
    const el = document.getElementById(empty);
    el?.focus();
    //only run on mount
  }, []);

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (!form.serverUrl.trim()) {
      errors.serverUrl = t('auth:validation.serverRequired');
    } else if (!URL_PATTERN.test(form.serverUrl.trim())) {
      errors.serverUrl = t('auth:validation.serverInvalid');
    }
    if (!form.username.trim()) {
      errors.username = t('auth:validation.usernameRequired');
    }
    if (!form.password) {
      errors.password = t('auth:validation.passwordRequired');
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const success = await onSubmit({
      serverUrl: form.serverUrl.trim(),
      username: form.username.trim(),
      password: form.password,
    });

    if (success) {
      // save or wipe stored credentials based on the remember checkbox
      if (form.remember) {
        storageService.setString('auth-server-url', form.serverUrl.trim());
        storageService.setString('auth-username', form.username.trim());
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
        <div className={styles.brand}>
          <div className={styles.logo} aria-hidden="true">
            <span className={styles.logoText}>ID</span>
          </div>
          <h1 className={styles.title}>{t('auth:title')}</h1>
          <p className={styles.subtitle}>{t('auth:subtitle')}</p>
        </div>

        <form noValidate onSubmit={handleSubmit} className={styles.form}>
          <div className="field">
            <label className="field-label" htmlFor="server-url">
              {t('auth:fields.serverUrl')}
            </label>
            <input
              id="server-url"
              name="server-url"
              type="url"
              autoComplete="url"
              className="field-input"
              placeholder={t('auth:fields.serverUrlPlaceholder')}
              value={form.serverUrl}
              onChange={(e) => setForm({ ...form, serverUrl: e.target.value })}
              aria-invalid={fieldErrors.serverUrl ? 'true' : 'false'}
              aria-describedby={fieldErrors.serverUrl ? 'server-url-error' : undefined}
              disabled={loading}
            />
            {fieldErrors.serverUrl && (
              <span id="server-url-error" className="field-error">
                {fieldErrors.serverUrl}
              </span>
            )}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="username">
              {t('auth:fields.username')}
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              className="field-input"
              placeholder={t('auth:fields.usernamePlaceholder')}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              aria-invalid={fieldErrors.username ? 'true' : 'false'}
              aria-describedby={fieldErrors.username ? 'username-error' : undefined}
              disabled={loading}
            />
            {fieldErrors.username && (
              <span id="username-error" className="field-error">
                {fieldErrors.username}
              </span>
            )}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="password">
              {t('auth:fields.password')}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="field-input"
              placeholder={t('auth:fields.passwordPlaceholder')}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              aria-invalid={fieldErrors.password ? 'true' : 'false'}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              disabled={loading}
            />
            {fieldErrors.password && (
              <span id="password-error" className="field-error">
                {fieldErrors.password}
              </span>
            )}
          </div>

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
