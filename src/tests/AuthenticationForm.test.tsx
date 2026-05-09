import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';

import AuthenticationForm from '@/components/AuthenticationForm';
import i18n from '@/i18n';

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

// helper to render the form with sensible defaults so each test only overrides what it cares about
const renderForm = (props: Partial<React.ComponentProps<typeof AuthenticationForm>> = {}) => {
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue(true);
  const onDismissError = props.onDismissError ?? vi.fn();
  return {
    onSubmit,
    onDismissError,
    ...render(
      <I18nextProvider i18n={i18n}>
        <AuthenticationForm
          onSubmit={onSubmit}
          loading={props.loading ?? false}
          error={props.error ?? null}
          onDismissError={onDismissError}
        />
      </I18nextProvider>,
    ),
  };
};

describe('AuthenticationForm', () => {
  it('renders the three required fields', () => {
    renderForm();
    expect(screen.getByLabelText('Server URL')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('blocks submit and shows validation errors when fields are empty', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    // clear the prefilled URL so all three fields are blank
    await user.clear(screen.getByLabelText('Server URL'));
    await user.click(screen.getByRole('button', { name: /connect to server/i }));

    expect(await screen.findByText(/server url is required/i)).toBeInTheDocument();
    expect(screen.getByText(/username is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects an obviously bad URL', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.clear(screen.getByLabelText('Server URL'));
    await user.type(screen.getByLabelText('Server URL'), 'not a url');
    await user.type(screen.getByLabelText('Username'), 'u');
    await user.type(screen.getByLabelText('Password'), 'p');
    await user.click(screen.getByRole('button', { name: /connect to server/i }));

    expect(await screen.findByText(/enter a valid url/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits valid credentials and disables the button while loading', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(true);
    renderForm({ onSubmit });

    await user.type(screen.getByLabelText('Username'), 'testuser');
    await user.type(screen.getByLabelText('Password'), 'testpass');
    await user.click(screen.getByRole('button', { name: /connect to server/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      serverUrl: 'https://192.168.3.2',
      username: 'testuser',
      password: 'testpass',
    });
  });

  it('shows the error banner when an auth error is supplied', () => {
    renderForm({
      error: { message: 'Invalid credentials or session expired', timestamp: new Date(), status: 401 },
    });
    expect(screen.getByText(/invalid credentials or session expired/i)).toBeInTheDocument();
  });

  it('disables inputs while loading is true', () => {
    renderForm({ loading: true });
    expect(screen.getByLabelText('Username')).toBeDisabled();
    expect(screen.getByLabelText('Password')).toBeDisabled();
    expect(screen.getByRole('button', { name: /connecting/i })).toBeDisabled();
  });
});
