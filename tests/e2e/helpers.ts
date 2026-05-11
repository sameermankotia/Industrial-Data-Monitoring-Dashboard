import type { Page } from '@playwright/test';

export const MOCK_SYMBOLS = [
  { Name: 'ALPHA_VOLTAGE', Type: 'INS', Description: 'Alpha phase voltage' },
  { Name: 'BETA_CURRENT', Type: 'INS', Description: 'Beta phase current' },
  { Name: 'GAMMA_POWER', Type: 'INS', Description: 'Gamma phase power' },
];

const MOCK_SYMBOL_VALUE = {
  stVal: 120,
  t: { value: '2024-01-15T10:30:00.000Z' },
  q: { validity: 'good' },
};

const isSymbolsList = (url: URL) =>
  url.pathname === '/api/v1/logic-engine/symbols';

const isSymbolValue = (url: URL) =>
  url.pathname.startsWith('/api/v1/logic-engine/symbols/');

const isAuthToken = (url: URL) =>
  url.pathname === '/api/v1/auth/token';

export async function login(page: Page) {
  // storageService prefixes every key with 'dashboard:'
  await page.addInitScript(`localStorage.setItem('dashboard:auto-start-polling', 'false');`);

  await page.route(isAuthToken, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ AccessToken: 'e2e-test-token', ExpiresIn: 3600 }),
    }),
  );

  await page.route(isSymbolsList, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_SYMBOLS),
    }),
  );

  await page.route(isSymbolValue, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_SYMBOL_VALUE),
    }),
  );

  await page.goto('/');
  await page.getByLabel('Server URL').fill('https://192.168.3.2');
  await page.getByRole('textbox', { name: 'Username' }).fill('admin');
  await page.getByLabel('Password').fill('correct');
  await page.getByRole('button', { name: 'Connect to server' }).click();
  await page.getByRole('button', { name: 'Start polling' }).waitFor();
}
