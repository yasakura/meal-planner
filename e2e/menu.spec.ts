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

/**
 * Le menu affichait un INSTANTANÉ des recettes, figé à la génération : `generateMenu` lisait le
 * catalogue une fois et stockait le tableau, et l'écran résolvait ses titres depuis ce tableau-là.
 * Tant qu'aucun titre ne pouvait changer, l'instantané ne pouvait pas devenir périmé ; la feature
 * de modification l'a rendu observable — menu généré, titre modifié, ancien titre toujours au menu.
 *
 * Navigation CLIENTE de bout en bout. Un `page.goto('/menu')` au retour recréerait le store, donc
 * le menu lui-même disparaîtrait : il n'y aurait plus rien de périmé à observer, et le scénario
 * serait vert sans avoir rien vérifié.
 *
 * La vérif navigateur n'a pas vu le défaut parce qu'elle REGÉNÉRAIT le menu après la modification.
 * Ce scénario ne clique jamais « Régénérer » — c'est tout son objet.
 */
test.describe('Menu et modification de recette', () => {
  test('modifier le titre d’une recette rafraîchit le menu déjà généré, sans le régénérer', async ({
    page,
  }) => {
    await page.goto('/menu');
    await page.getByRole('button', { name: 'Générer un menu' }).click();

    // GAGE de l'absence affirmée à la fin : le MÊME localisateur, vu trouver son texte 9 fois
    // avant modification. Le tirage du mode e2e est déterministe (toujours la tête du vivier) et
    // le vivier de 3 recettes se répète en cycle sur les 28 créneaux de la quinzaine : le gratin
    // occupe le 2e de chaque cycle, soit 9 créneaux sur 28. Sans ce gage, `toHaveCount(0)`
    // passerait aussi bien sur un sélecteur faux ou sur un écran vide.
    const ancienTitre = page.getByText('Gratin dauphinois');
    const nouveauTitre = page.getByText('Aubergines farcies');
    await expect(ancienTitre).toHaveCount(9);
    await expect(nouveauTitre).toHaveCount(0);

    const premierJour = page.locator('main section').first().locator('li');
    await expect(premierJour.nth(1)).toContainText('Gratin dauphinois');

    // Détour par le catalogue pour modifier le titre — par les liens, jamais par l'URL.
    await page.click('nav a[href="/catalogue"]');
    await page.getByRole('link', { name: 'Gratin dauphinois' }).click();
    await page.getByRole('link', { name: 'Modifier' }).click();
    await page.getByLabel('Titre').fill('Aubergines farcies');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois');

    // Retour au menu SANS le régénérer : « Régénérer » est là, on ne le clique pas.
    await page.click('nav a[href="/menu"]');
    await expect(page.getByRole('button', { name: 'Régénérer' })).toBeVisible();

    // Les mêmes repas, aux mêmes jours, avec les bons noms : le compte est identique — 9 créneaux,
    // toujours le 2e de chaque cycle — seul le nom a changé.
    await expect(nouveauTitre).toHaveCount(9);
    await expect(ancienTitre).toHaveCount(0);
    await expect(premierJour.nth(1)).toContainText('Aubergines farcies');
    // Le menu n'a pas été rejoué : la quinzaine entière est toujours là, et aucun créneau n'est
    // retombé sur le repli « Recette inconnue ».
    await expect(page.locator('main section')).toHaveCount(14);
    await expect(page.locator('main section li')).toHaveCount(28);
    await expect(page.getByText('Recette inconnue')).toHaveCount(0);
  });
});
