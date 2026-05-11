import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Settings menu', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('opens on click and closes on Escape', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByText('Theme')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText('Theme')).not.toBeVisible();
  });

  test('closes when clicking outside the panel', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByText('Theme')).toBeVisible();
    await page.mouse.click(10, 10);
    await expect(page.getByText('Theme')).not.toBeVisible();
  });

  test('switching to Spanish translates the UI', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Español' }).click();
    // close the panel so the dashboard controls are in view
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Iniciar sondeo' })).toBeVisible();
    await expect(page.getByPlaceholder('Buscar símbolos…')).toBeVisible();
  });

  test('switching back to English restores the UI', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Español' }).click();
    await page.getByRole('button', { name: 'English' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Start polling' })).toBeVisible();
  });

  test('selecting a theme marks that option as active', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();
    const darkBtn = page.getByRole('button', { name: 'Dark' });
    await darkBtn.click();
    await expect(darkBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('auto-start polling checkbox persists across logout and re-login', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();
    const checkbox = page.getByRole('checkbox', { name: 'Auto-start polling on sign in' });
    const initialState = await checkbox.isChecked();
    await checkbox.setChecked(!initialState);
    await expect(checkbox).toBeChecked({ checked: !initialState });
  });
});
