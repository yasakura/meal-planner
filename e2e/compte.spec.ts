import { expect, test } from '@playwright/test';

import { openAccountSheet } from './support/account-sheet';

test.describe('Sheet Compte', () => {
  test('montre le foyer et la déconnexion', async ({ page }) => {
    await page.goto('/catalogue');
    await openAccountSheet(page);

    await expect(page.getByRole('heading', { level: 3, name: 'Foyer' })).toBeVisible();
    await expect(page.locator('[data-testid="convive-name"]')).toHaveText([
      'Alice',
      'Bruno',
      'Chloé',
      'Émile',
    ]);
    await expect(page.getByRole('button', { name: 'Se déconnecter' })).toBeVisible();
  });

  test('se reconnecter rouvre l’application sur le foyer laissé par la session précédente', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await openAccountSheet(page);
    await expect(page.locator('[data-testid="account-sheet-panel"]')).toHaveCount(1);
    await expect(page.locator('nav a[href="/catalogue"]')).toHaveCount(1);

    await page.getByLabel('Prénom', { exact: true }).fill('Zoé');
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await expect(page.locator('[data-testid="convive-name"]')).toHaveText([
      'Alice',
      'Bruno',
      'Chloé',
      'Émile',
      'Zoé',
    ]);

    await page.getByRole('button', { name: 'Se déconnecter' }).click();
    await expect(page.getByLabel('Email')).toBeVisible();

    await page.getByLabel('Email').fill('e2e@foyer.test');
    await page.getByLabel('Mot de passe').fill('peu-importe');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Recettes' })).toBeVisible();
    await expect(page).toHaveURL('/catalogue');
    await expect(page.locator('nav a[href="/catalogue"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="account-sheet-panel"]')).toHaveCount(0);

    await openAccountSheet(page);
    await expect(page.locator('[data-testid="convive-name"]')).toHaveText([
      'Alice',
      'Bruno',
      'Chloé',
      'Émile',
      'Zoé',
    ]);
  });

  test('se déconnecter ramène à l’écran de connexion', async ({ page }) => {
    await page.goto('/catalogue');
    await openAccountSheet(page);

    await expect(page.locator('nav a[href="/catalogue"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="account-sheet-panel"]')).toHaveCount(1);

    await page.getByRole('button', { name: 'Se déconnecter' }).click();

    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();

    await expect(page.locator('nav a[href="/catalogue"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="account-sheet-panel"]')).toHaveCount(0);
  });
});
