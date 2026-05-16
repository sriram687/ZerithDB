import { test, expect } from '@playwright/test';

test.describe('CRDT Synchronization Engine', () => {
  
  test('Should instantly sync state between peers in the homepage playground', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.getByRole('link', { name: 'Try Playground' }).click();
    await expect(page).toHaveURL(/#playground/);

    const uniqueTestMessage = `Automated Sync Test - ${Date.now()}`;
    const editor = page.getByLabel('ZerithDB query editor');

    await editor.fill(`await db("notes").insert({
  text: "${uniqueTestMessage}",
});`);
    await page.getByRole('button', { name: 'Run query' }).click();

    await expect(page.getByText(uniqueTestMessage)).toHaveCount(2);
  });

  test('Should instantly sync state between peers in the full playground', async ({ page }) => {
    await page.goto('http://localhost:3000/playground');

    const aliceInput = page.getByPlaceholder('Type a message offline/online...').first();
    const aliceSaveBtn = page.getByRole('button', { name: 'Save' }).first();

    const uniqueTestMessage = `Automated Sync Test - ${Date.now()}`;

    await aliceInput.fill(uniqueTestMessage);
    await aliceSaveBtn.click();

    await expect(page.getByText(uniqueTestMessage)).toHaveCount(2);
  });
  
});
