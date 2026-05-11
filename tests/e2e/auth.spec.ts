import { test, expect } from '@playwright/test';
import { login } from './helpers';

const isAuthToken = (url: URL) => url.pathname === '/api/v1/auth/token';
const isSymbolsList = (url: URL) => url.pathname === '/api/v1/logic-engine/symbols';

test.describe('Login form', () => {
  test('shows the login page by default', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Industrial Data Monitor' })).toBeVisible();
    await expect(page.getByLabel('Server URL')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Username' })).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Connect to server' })).toBeVisible();
  });

  test('shows validation errors for empty fields', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Server URL').clear();
    await page.getByRole('button', { name: 'Connect to server' }).click();
    await expect(page.getByText('Server URL is required')).toBeVisible();
    await expect(page.getByText('Username is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('shows format error for invalid server URL', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Server URL').fill('not-a-url');
    await page.getByRole('button', { name: 'Connect to server' }).click();
    await expect(page.getByText(/Enter a valid URL/)).toBeVisible();
  });

  test('shows an error on 401 from the server', async ({ page }) => {
    await page.route(isAuthToken, (route) => route.fulfill({ status: 401 }));
    await page.goto('/');
    await page.getByRole('textbox', { name: 'Username' }).fill('admin');
    await page.getByLabel('Password').fill('wrong');
    await page.getByRole('button', { name: 'Connect to server' }).click();
    // the error can appear in both the form error display and a toast — either is enough
    await expect(page.getByText(/Invalid credentials/).first()).toBeVisible();
  });

  test('navigates to the dashboard on successful login', async ({ page }) => {
    await login(page);
    await expect(page.getByRole('button', { name: 'Start polling' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'ALPHA_VOLTAGE' })).toBeVisible();
  });

  test('button is disabled while connecting', async ({ page }) => {
    await page.route(isAuthToken, async (route) => {
      await new Promise((r) => setTimeout(r, 300));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ AccessToken: 'tok', ExpiresIn: 3600 }),
      });
    });
    await page.route(isSymbolsList, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );
    await page.goto('/');
    await page.getByRole('textbox', { name: 'Username' }).fill('admin');
    await page.getByLabel('Password').fill('pass');
    await page.getByRole('button', { name: 'Connect to server' }).click();
    await expect(page.getByRole('button', { name: 'Connecting…' })).toBeDisabled();
  });
});
