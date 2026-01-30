import { createBdd } from 'playwright-bdd';
import { test } from 'playwright-bdd';

const { When, Then } = createBdd(test);

When('I run the command {string}', async ({ page }, command: string) => {
  await page.getByRole('button', { name: 'Terminal' }).click();
  const input = page.getByRole('textbox').first();
  await input.fill(command);
  await input.press('Enter');
  await page.waitForTimeout(400);
});

Then('I should see {string} in the output', async ({ page }, text: string) => {
  await test.expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 10000 });
});

Then('I should see the CLI prompt or welcome message', async ({ page }) => {
  const welcomeOrPrompt = page.locator('text=Welcome').or(page.locator('text=help')).or(page.locator('text=>'));
  await test.expect(welcomeOrPrompt.first()).toBeVisible({ timeout: 5000 });
});

Then('the terminal output should be cleared', async ({ page }) => {
  await page.waitForTimeout(300);
  // After "clear", output from the previous command (e.g. "contact list") should be gone.
  // "Contacts" or "No contacts" from "contact list" should not be visible.
  await test.expect(page.getByText('Contacts (', { exact: false })).not.toBeVisible();
  await test.expect(page.getByText('No contacts found', { exact: false })).not.toBeVisible();
});
