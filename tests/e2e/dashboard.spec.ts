import { test, expect } from '@playwright/test';
import { login, MOCK_SYMBOLS } from './helpers';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('shows connection status with user and server info', async ({ page }) => {
    await expect(page.getByText('User: admin')).toBeVisible();
    await expect(page.getByText('Server: https://192.168.3.2')).toBeVisible();
  });

  test('renders all loaded symbols in the table', async ({ page }) => {
    for (const sym of MOCK_SYMBOLS) {
      await expect(page.getByRole('cell', { name: sym.Name })).toBeVisible();
    }
  });

  test('search filters symbols by name', async ({ page }) => {
    await page.getByPlaceholder('Search symbols…').fill('ALPHA');
    await expect(page.getByRole('cell', { name: 'ALPHA_VOLTAGE' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'BETA_CURRENT' })).not.toBeVisible();
    await expect(page.getByRole('cell', { name: 'GAMMA_POWER' })).not.toBeVisible();
  });

  test('clearing the search restores all symbols', async ({ page }) => {
    await page.getByPlaceholder('Search symbols…').fill('ALPHA');
    await page.getByPlaceholder('Search symbols…').clear();
    for (const sym of MOCK_SYMBOLS) {
      await expect(page.getByRole('cell', { name: sym.Name })).toBeVisible();
    }
  });

  test('start polling button switches to stop polling when active', async ({ page }) => {
    await page.getByRole('button', { name: 'Start polling' }).click();
    await expect(page.getByRole('button', { name: 'Stop polling' })).toBeVisible();
  });

  test('stop polling returns the button to start polling', async ({ page }) => {
    await page.getByRole('button', { name: 'Start polling' }).click();
    await page.getByRole('button', { name: 'Stop polling' }).click();
    await expect(page.getByRole('button', { name: 'Start polling' })).toBeVisible();
  });

  test('clicking a symbol row opens the detail panel', async ({ page }) => {
    await page.getByRole('cell', { name: 'ALPHA_VOLTAGE' }).click();
    await expect(page.getByText('Current value')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'ALPHA_VOLTAGE' })).toBeVisible();
  });

  test('export CSV button is enabled when symbols are loaded', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeEnabled();
  });

  test('logout opens a confirm dialog and returns to the login page', async ({ page }) => {
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page.getByRole('heading', { name: 'Log out?' })).toBeVisible();
    // dismiss with Cancel first to check the dialog closes
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Log out?' })).not.toBeVisible();
    // then actually log out
    await page.getByRole('button', { name: 'Log out' }).click();
    await page.getByRole('button', { name: 'Log out' }).last().click();
    await expect(page.getByRole('heading', { name: 'Industrial Data Monitor' })).toBeVisible();
  });
});
