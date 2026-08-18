import { expect, test } from '@playwright/test';

import { openAccountSheet } from './support/account-sheet';

test.describe('Sheet Compte', () => {
  test('montre le foyer et la déconnexion, et masque l’info d’environnement hors dev', async ({
    page,
  }) => {
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

    // L'info d'environnement est réservée à `dev` (`env.name === 'dev'` dans `AccountSheet`).
    // Les scénarios tournent en `e2e`, donc elle ne doit PAS s'afficher : ce que cette
    // assertion verrouille, c'est que l'identifiant du projet Firebase ne fuit pas hors dev.
    await expect(page.getByText('Environnement :')).toHaveCount(0);
    await expect(page.getByText('Firebase :')).toHaveCount(0);
  });

  test('se déconnecter ramène à l’écran de connexion', async ({ page }) => {
    await page.goto('/catalogue');
    await openAccountSheet(page);

    // Les DEUX localisateurs des absences ci-dessous, vus ici en train de trouver quelque
    // chose : une absence dont le localisateur est faux est vraie pour de mauvaises raisons.
    await expect(page.locator('nav a[href="/catalogue"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="account-sheet-panel"]')).toHaveCount(1);

    await page.getByRole('button', { name: 'Se déconnecter' }).click();

    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();

    // Le chrome applicatif disparaît avec la session : ni tab bar, ni sheet restée ouverte
    // par-dessus l'écran de connexion.
    await expect(page.locator('nav a[href="/catalogue"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="account-sheet-panel"]')).toHaveCount(0);
  });
});
