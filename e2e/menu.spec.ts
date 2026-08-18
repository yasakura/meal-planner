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
});
