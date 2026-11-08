import { expect, test } from '@playwright/test';

test('creates a store and navigates Studio tabs', async ({ page }) => {
  let stores: Array<{ id: string; name: string }> = [];

  await page.route('**/api/stores', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { name: string };
      stores = [{ id: 'e2e-store', name: body.name }];
      await route.fulfill({ json: stores[0] });
      return;
    }

    await route.fulfill({ json: { stores } });
  });

  await page.route('**/api/stores/e2e-store/authorization-models', async (route) => {
    await route.fulfill({ json: { authorization_models: [] } });
  });

  await page.route('**/api/stores/e2e-store/read', async (route) => {
    await route.fulfill({ json: { tuples: [] } });
  });

  await page.goto('/');
  await expect(page.getByRole('button', { name: 'New Store' })).toBeVisible();
  await page.getByRole('button', { name: 'New Store' }).click();

  await page.getByRole('textbox', { name: 'Store Name' }).fill('E2E Store');
  await page.getByRole('button', { name: 'Create', exact: true }).click();

  const modelTab = page.getByRole('tab', { name: 'Authorization Model' });
  const tuplesTab = page.getByRole('tab', { name: 'Tuples' });
  const queryTab = page.getByRole('tab', { name: 'Query' });

  await expect(modelTab).toBeVisible();
  await expect(modelTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('E2E Store', { exact: false })).toBeVisible();

  await tuplesTab.click();
  await expect(tuplesTab).toHaveAttribute('aria-selected', 'true');
  await queryTab.click();
  await expect(queryTab).toHaveAttribute('aria-selected', 'true');
});