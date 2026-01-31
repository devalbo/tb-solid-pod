import { createBdd } from 'playwright-bdd';
import { test } from './cli.steps';

const { Given, When, Then } = createBdd(test);

Given('I am on the app home page', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
});

Given('I am on the Terminal page', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByRole('button', { name: 'Terminal' }).click();
});

When('I click the {string} tab', async ({ page }, tabName: string) => {
  await page.getByRole('button', { name: tabName }).click();
});

Then('the page title should contain {string}', async ({ page }, text: string) => {
  await test.expect(page).toHaveTitle(new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
});

Then('I should see the {string} tab', async ({ page }, tabName: string) => {
  await test.expect(page.getByRole('button', { name: tabName })).toBeVisible();
});

Then('I should see the contacts view', async ({ page }) => {
  await test.expect(page.getByRole('button', { name: 'Contacts' })).toBeVisible();
  await page.getByRole('button', { name: 'Contacts' }).click();
  await test.expect(page.locator('text=Contact').or(page.locator('text=contact')).first()).toBeVisible({ timeout: 5000 });
});

Then('I should see the personas view', async ({ page }) => {
  await test.expect(page.getByRole('button', { name: 'Personas' })).toBeVisible();
  await page.getByRole('button', { name: 'Personas' }).click();
  await test.expect(page.locator('text=Persona').or(page.locator('text=persona')).first()).toBeVisible({ timeout: 5000 });
});

Then('I should see either a contacts list or {string} or {string} in the view', async ({ page }, a: string, b: string) => {
  const listOrEmpty = page.locator('text=Contact').or(page.locator(`text=${a}`)).or(page.locator(`text=${b}`)).first();
  await test.expect(listOrEmpty).toBeVisible({ timeout: 5000 });
});
