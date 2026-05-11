//  test for the i18n setup. Renders one tiny component twice — once
// in each language — and checks the translated string comes through.

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { I18nextProvider, useTranslation } from 'react-i18next';

import i18n from '@/i18n';

// Minimal component that just renders one translated key.
function Probe() {
  const { t } = useTranslation();
  return <span data-testid="probe">{t('actions.exportCsv')}</span>;
}

describe('i18n', () => {
  it('renders English by default', async () => {
    await i18n.changeLanguage('en');
    render(
      <I18nextProvider i18n={i18n}>
        <Probe />
      </I18nextProvider>,
    );
    expect(screen.getByTestId('probe').textContent).toBe('Export CSV');
  });

  it('switches to Spanish on demand', async () => {
    await i18n.changeLanguage('es');
    render(
      <I18nextProvider i18n={i18n}>
        <Probe />
      </I18nextProvider>,
    );
    expect(screen.getByTestId('probe').textContent).toBe('Exportar CSV');
    // Reset back to en so this doesn't fail into other tests.
    await i18n.changeLanguage('en');
  });
});
