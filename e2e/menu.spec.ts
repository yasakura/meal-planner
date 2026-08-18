import { expect, test } from '@playwright/test';

test.describe('Menu', () => {
  test('générer un menu remplit les repas de la quinzaine', async ({ page }) => {
    await page.goto('/menu');

    await expect(page.getByRole('heading', { level: 1, name: 'Menu' })).toBeVisible();
    await page.getByRole('button', { name: 'Générer un menu' }).click();

    // Fenêtre par défaut : 14 jours × 2 créneaux.
    const jours = page.locator('main section');
    await expect(jours).toHaveCount(14);
    await expect(page.locator('main section li')).toHaveCount(28);

    // `Recette inconnue` est le repli affiché quand un créneau référence une recette que la
    // page n'a pas su retrouver : un menu entièrement rempli de replis serait vert sur les
    // seuls comptes ci-dessus. Vérifié AVANT les titres, pour que ce soit cette assertion-là
    // qui parle si la correspondance id → titre se casse.
    await expect(page.getByText('Recette inconnue')).toHaveCount(0);

    await expect(jours.first().getByRole('heading', { level: 2 })).toHaveText('Jour 1');
    await expect(jours.last().getByRole('heading', { level: 2 })).toHaveText('Jour 14');

    // Le tirage du mode e2e est déterministe (`MathRandomPicker.create(() => 0)` : toujours la
    // tête du vivier), donc le premier jour est nommable exactement — c'est ce qui distingue
    // « des repas sont remplis » de « les bonnes recettes y sont ».
    const premierJour = jours.first().locator('li');
    await expect(premierJour).toHaveCount(2);
    await expect(premierJour.nth(0)).toContainText('Midi');
    await expect(premierJour.nth(0)).toContainText('Omelette aux herbes');
    await expect(premierJour.nth(1)).toContainText('Soir');
    await expect(premierJour.nth(1)).toContainText('Gratin dauphinois');

    await expect(page.getByRole('button', { name: 'Régénérer' })).toBeVisible();
  });

  /**
   * Issue #28. La fenêtre choisie vivait dans un `useState` du container, alors que le menu
   * généré vit dans le store : un aller-retour vers le catalogue remontait le container, donc
   * remettait le sélecteur à « 2 semaines » AU-DESSUS des 7 jours toujours affichés. L'écran
   * montrait une fenêtre et en décrivait une autre, sans aucune action de l'utilisateur.
   *
   * Navigation CLIENTE de bout en bout : un `page.goto()` entre les deux visites recréerait le
   * store, donc le menu, et le défaut deviendrait invisible.
   */
  test('la fenêtre choisie survit à un aller-retour vers le catalogue', async ({ page }) => {
    await page.goto('/menu');

    // Gage du localisateur et de l'attribut : avant tout clic, c'est « 2 semaines » qui porte
    // `aria-pressed=true` et « 1 semaine » qui porte `false`. L'assertion finale, qui exige
    // l'inverse, ne peut donc pas être vraie pour de mauvaises raisons.
    const uneSemaine = page.getByRole('button', { name: '1 semaine' });
    const deuxSemaines = page.getByRole('button', { name: '2 semaines' });
    await expect(uneSemaine).toHaveAttribute('aria-pressed', 'false');
    await expect(deuxSemaines).toHaveAttribute('aria-pressed', 'true');

    await uneSemaine.click();
    await page.getByRole('button', { name: 'Générer un menu' }).click();
    await expect(page.locator('main section')).toHaveCount(7);

    await page.click('nav a[href="/catalogue"]');
    await expect(page.getByRole('heading', { level: 1, name: 'Recettes' })).toBeVisible();
    await page.click('nav a[href="/menu"]');
    await expect(page.getByRole('heading', { level: 1, name: 'Menu' })).toBeVisible();

    // Le sélecteur décrit la fenêtre effectivement affichée : 7 jours, « 1 semaine ».
    await expect(page.locator('main section')).toHaveCount(7);
    await expect(uneSemaine).toHaveAttribute('aria-pressed', 'true');
    await expect(deuxSemaines).toHaveAttribute('aria-pressed', 'false');
  });
});
