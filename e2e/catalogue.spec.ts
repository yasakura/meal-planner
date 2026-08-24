import { expect, test, type Page } from '@playwright/test';

import { attendreAtteignable } from './support/atteignabilite';
import { failWrites } from './support/e2e-controls';

const TITRES_TRIES = ['Curry de pois chiches', 'Gratin dauphinois', 'Omelette aux herbes'];

function titresDuCatalogue(page: Page) {
  return page.locator('main ul li h2');
}

test.describe('Catalogue', () => {
  test('affiche les recettes triées par titre', async ({ page }) => {
    await page.goto('/catalogue');

    await expect(page.getByRole('heading', { level: 1, name: 'Recettes' })).toBeVisible();
    await expect(titresDuCatalogue(page)).toHaveText(TITRES_TRIES);
  });

  test('un catalogue sans recette le dit, et laisse en créer une', async ({ page }) => {
    await page.goto('/catalogue?recipes=0');

    await expect(page.getByText('Aucune recette')).toHaveCount(1);
    await expect(page.getByText('Crée ta première recette pour la retrouver ici')).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'Ajouter une recette' })).toBeVisible();
  });

  test('ouvre une recette, montre son contenu, et le lien retour ramène au catalogue', async ({
    page,
  }) => {
    await page.goto('/catalogue');

    await page.getByRole('link', { name: 'Gratin dauphinois' }).click();
    await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois');

    await expect(page.getByRole('heading', { level: 1, name: 'Gratin dauphinois' })).toBeVisible();
    await expect(page.getByText('Pour 6 personnes')).toBeVisible();

    const ingredients = page.locator('main ul li');
    await expect(ingredients).toHaveCount(2);
    await expect(ingredients.nth(0)).toContainText('Pommes de terre');
    await expect(ingredients.nth(0)).toContainText('1 kg');
    await expect(ingredients.nth(1)).toContainText('Crème');
    await expect(ingredients.nth(1)).toContainText('500 ml');

    await expect(
      page.getByText('Émincer les pommes de terre, napper de crème, cuire 1 h à 160 °C.'),
    ).toBeVisible();

    await page.getByRole('link', { name: '← Recettes' }).click();
    await expect(page).toHaveURL('/catalogue');
    await expect(titresDuCatalogue(page)).toHaveText(TITRES_TRIES);
  });

  test('une recette qui n’existe pas le dit, sans piéger l’utilisateur', async ({ page }) => {
    await page.goto('/catalogue/recette-qui-nexiste-pas');

    await expect(page.getByRole('alert')).toHaveText('Recette introuvable');
    await expect(page.getByRole('link', { name: '← Recettes' })).toBeVisible();
  });

  test('une recette créée se retrouve au catalogue, avec son contenu', async ({ page }) => {
    await page.goto('/catalogue');

    await page.getByRole('link', { name: 'Ajouter une recette' }).click();
    await expect(page).toHaveURL('/catalogue/nouvelle');

    await page.getByLabel('Titre').fill('Tarte aux poireaux');
    await page.getByLabel('Personnes').fill('5');

    await page.locator('#ingredient-name-0').fill('Poireaux');
    await page.locator('#ingredient-quantity-0').fill('3');
    await page.locator('#ingredient-unit-0').selectOption('piece');

    await page.getByRole('button', { name: 'Ajouter un ingrédient' }).click();
    await page.locator('#ingredient-name-1').fill('Crème');
    await page.locator('#ingredient-quantity-1').fill('200');
    await page.locator('#ingredient-unit-1').selectOption('ml');

    await page
      .getByLabel('Préparation')
      .fill('Faire suer les poireaux, verser la crème, enfourner.');

    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page).toHaveURL('/catalogue');
    await expect(titresDuCatalogue(page)).toHaveText([...TITRES_TRIES, 'Tarte aux poireaux']);

    await page.getByRole('link', { name: 'Tarte aux poireaux' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Tarte aux poireaux' })).toBeVisible();
    await expect(page.getByText('Pour 5 personnes')).toBeVisible();

    const ingredients = page.locator('main ul li');
    await expect(ingredients).toHaveCount(2);
    await expect(ingredients.nth(0)).toContainText('Poireaux');
    await expect(ingredients.nth(0)).toContainText('3 pièce');
    await expect(ingredients.nth(1)).toContainText('Crème');
    await expect(ingredients.nth(1)).toContainText('200 ml');
  });

  test('le formulaire de création reste verrouillé tant qu’il manque un titre ou un ingrédient', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await page.getByRole('link', { name: 'Ajouter une recette' }).click();

    const enregistrer = page.getByRole('button', { name: 'Enregistrer' });
    await expect(enregistrer).toBeDisabled();

    await page.locator('#ingredient-name-0').fill('Poireaux');
    await page.locator('#ingredient-quantity-0').fill('3');
    await expect(enregistrer).toBeDisabled();

    await page.getByLabel('Titre').fill('   ');
    await expect(enregistrer).toBeDisabled();

    await page.getByLabel('Titre').fill('Tarte aux poireaux');
    await expect(enregistrer).toBeEnabled();

    await page.locator('#ingredient-quantity-0').fill('');
    await expect(enregistrer).toBeDisabled();

    await page.locator('#ingredient-quantity-0').fill('3');
    await enregistrer.click();
    await expect(page).toHaveURL('/catalogue');
    await expect(titresDuCatalogue(page)).toHaveText([...TITRES_TRIES, 'Tarte aux poireaux']);
  });

  test('après une création, le formulaire se rouvre vierge et utilisable', async ({ page }) => {
    await page.goto('/catalogue');

    await page.getByRole('link', { name: 'Ajouter une recette' }).click();
    await page.getByLabel('Titre').fill('Tarte aux poireaux');
    await page.locator('#ingredient-name-0').fill('Poireaux');
    await page.locator('#ingredient-quantity-0').fill('3');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page).toHaveURL('/catalogue');

    await page.getByRole('link', { name: 'Ajouter une recette' }).click();

    await expect(page).toHaveURL('/catalogue/nouvelle');
    const titre = page.getByLabel('Titre');
    await expect(titre).toBeVisible();

    await expect(page).toHaveURL('/catalogue/nouvelle');

    await expect(titre).toHaveValue('');

    await titre.fill('Soupe de courge');
    await page.locator('#ingredient-name-0').fill('Courge');
    await page.locator('#ingredient-quantity-0').fill('800');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page).toHaveURL('/catalogue');
    await expect(titresDuCatalogue(page)).toHaveText([
      ...TITRES_TRIES,
      'Soupe de courge',
      'Tarte aux poireaux',
    ]);
  });
});

test.describe('Mise en page du catalogue', () => {
  test('le bouton d’enregistrement du formulaire est atteignable sans défiler', async ({
    page,
  }) => {
    await page.goto('/catalogue/nouvelle');

    await page.getByLabel('Titre').fill('Tarte aux poireaux');
    await page.locator('#ingredient-name-0').fill('Poireaux');
    await page.locator('#ingredient-quantity-0').fill('3');

    const bouton = page.getByRole('button', { name: 'Enregistrer' });
    await expect(bouton).toBeEnabled();

    const mesure = await attendreAtteignable(bouton);

    expect(mesure.largeur).toBeGreaterThan(0);
    expect(mesure.hauteur).toBeGreaterThan(0);
  });

  test('le bandeau de refus d’écriture est visible sans défiler', async ({ page }) => {
    await page.goto('/catalogue');
    await failWrites(page);
    await page.getByRole('link', { name: 'Ajouter une recette' }).click();

    await page.getByLabel('Titre').fill('Tarte aux poireaux');
    await page.locator('#ingredient-name-0').fill('Poireaux');
    await page.locator('#ingredient-quantity-0').fill('3');

    await page.getByRole('button', { name: 'Enregistrer' }).click();

    const bandeau = page.getByText('Une modification n’a pas pu être enregistrée.');
    await expect(bandeau).toBeVisible();

    await attendreAtteignable(bandeau);
  });

  test('la barre d’action masque le contenu qui défile dessous', async ({ page }) => {
    await page.goto('/catalogue/nouvelle');
    const bouton = page.getByRole('button', { name: 'Enregistrer' });
    await expect(bouton).toBeVisible();

    const fonds = await bouton.evaluate((element) => {
      const barre = element.parentElement as HTMLElement;
      const ecran = barre.closest('main > div') as HTMLElement;
      return {
        barre: getComputedStyle(barre).backgroundColor,
        ecran: getComputedStyle(ecran).backgroundColor,
      };
    });

    expect(fonds.ecran).not.toBe('rgba(0, 0, 0, 0)');
    expect(fonds.barre).toBe(fonds.ecran);
  });

  test('la barre d’action se pose exactement sur le haut de la tab bar', async ({ page }) => {
    await page.goto('/catalogue/nouvelle');
    const bouton = page.getByRole('button', { name: 'Enregistrer' });
    const tabBar = page.getByRole('navigation');
    await expect(bouton).toBeVisible();
    await expect(tabBar).toBeVisible();

    const barre = await bouton.evaluate((element) => {
      const boite = (element.parentElement as HTMLElement).getBoundingClientRect();
      return { bas: boite.bottom, hauteur: boite.height };
    });
    const hautDeLaTabBar = await tabBar.evaluate((element) => element.getBoundingClientRect().top);

    expect(barre.hauteur).toBeGreaterThan(0);
    expect(hautDeLaTabBar).toBeGreaterThan(0);
    expect(barre.bas).toBe(hautDeLaTabBar);
  });

  test('la tab bar se pose au bas de l’écran quand le contenu est court', async ({ page }) => {
    await page.goto('/catalogue?recipes=0');
    const tabBar = page.getByRole('navigation');
    await expect(tabBar).toBeVisible();

    const mesure = await tabBar.evaluate((element) => ({
      bas: element.getBoundingClientRect().bottom,
      hauteur: element.getBoundingClientRect().height,
      viewport: document.documentElement.clientHeight,
    }));

    expect(mesure.bas).toBe(mesure.viewport);
  });
});
