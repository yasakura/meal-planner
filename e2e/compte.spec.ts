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

  /**
   * La reconnexion est le seul parcours qui traverse DEUX sessions sur un même store : la
   * déconnexion démonte tout le chrome applicatif, mais elle ne recrée ni le store, ni les
   * adapters en mémoire — c'est la définition même du singleton de session. Aucun test RTL ne
   * peut l'exercer : chacun repart d'un store neuf, donc d'une première session.
   */
  test('se reconnecter rouvre l’application sur le foyer laissé par la session précédente', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await openAccountSheet(page);
    // Les DEUX localisateurs des absences plus bas, vus ici en train de trouver quelque chose.
    await expect(page.locator('[data-testid="account-sheet-panel"]')).toHaveCount(1);
    await expect(page.locator('nav a[href="/catalogue"]')).toHaveCount(1);

    // Une trace laissée dans la session : le foyer gagne un convive avant la déconnexion.
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

    // L'application revient, à la route où la session précédente l'avait laissée.
    await expect(page.getByRole('heading', { level: 1, name: 'Recettes' })).toBeVisible();
    await expect(page).toHaveURL('/catalogue');
    await expect(page.locator('nav a[href="/catalogue"]')).toHaveCount(1);
    // Et elle revient FERMÉE : la sheet ouverte au moment de la déconnexion ne se rouvre pas
    // toute seule par-dessus l'écran d'accueil de la nouvelle session.
    await expect(page.locator('[data-testid="account-sheet-panel"]')).toHaveCount(0);

    // Le foyer relu est celui de la session précédente, Zoé comprise : ni la déconnexion ni la
    // reconnexion n'ont rechargé la page, donc le dépôt de la session est toujours le même.
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
