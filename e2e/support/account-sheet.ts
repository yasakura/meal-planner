import { expect, type Page } from '@playwright/test';

/**
 * Ouvre la sheet Compte et attend qu'elle soit là. Elle est rendue dans un PORTAIL sur
 * `document.body`, donc hors de `main` : aucun scénario ne doit la chercher dans le contenu
 * de la route.
 */
export async function openAccountSheet(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Compte' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Compte' })).toBeVisible();
}
