import { expect, test, type Page } from '@playwright/test';

import { attendreAtteignable } from './support/atteignabilite';
import { failWrites, restore } from './support/e2e-controls';

const TITRES_DE_DEPART = ['Curry de pois chiches', 'Gratin dauphinois', 'Omelette aux herbes'];

function titresDuCatalogue(page: Page) {
  return page.locator('main ul li h2');
}

function ingredientsDuDetail(page: Page) {
  return page.locator('main ul li');
}

async function ouvrirLaModificationDuGratin(page: Page) {
  await page.getByRole('link', { name: 'Gratin dauphinois' }).click();
  await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois');

  await page.getByRole('link', { name: 'Modifier' }).click();
  await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois/modifier');
}

async function relireLeGratinDepuisLeDepot(page: Page) {
  await page.getByRole('link', { name: '← Recette', exact: true }).click();
  await page.getByRole('link', { name: '← Recettes' }).click();
  await page.getByRole('link', { name: 'Omelette aux herbes' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Omelette aux herbes' })).toBeVisible();

  await page.getByRole('link', { name: '← Recettes' }).click();
  await page.getByRole('link', { name: 'Gratin dauphinois' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Gratin dauphinois' })).toBeVisible();
}

test.describe('Modifier une recette', () => {
  test('le formulaire s’ouvre prérempli avec le contenu de la recette', async ({ page }) => {
    await page.goto('/catalogue');
    await ouvrirLaModificationDuGratin(page);

    await expect(
      page.getByRole('heading', { level: 1, name: 'Modifier la recette' }),
    ).toBeVisible();
    await expect(page.getByLabel('Titre')).toHaveValue('Gratin dauphinois');
    await expect(page.getByLabel('Personnes')).toHaveValue('6');
    await expect(page.locator('#ingredient-name-0')).toHaveValue('Pommes de terre');
    await expect(page.locator('#ingredient-quantity-0')).toHaveValue('1');
    await expect(page.locator('#ingredient-unit-0')).toHaveValue('kg');
    await expect(page.locator('#ingredient-name-1')).toHaveValue('Crème');
    await expect(page.locator('#ingredient-quantity-1')).toHaveValue('500');
    await expect(page.locator('#ingredient-unit-1')).toHaveValue('ml');
    await expect(page.getByLabel('Préparation')).toHaveValue(
      'Émincer les pommes de terre, napper de crème, cuire 1 h à 160 °C.',
    );
  });

  test('modifier titre et ingrédients se répercute au détail puis au catalogue', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await expect(titresDuCatalogue(page)).toHaveText(TITRES_DE_DEPART);

    await page.getByRole('link', { name: 'Gratin dauphinois' }).click();
    await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois');

    await expect(page.getByText('Crème')).toHaveCount(2);
    await expect(page.getByText('Gratin dauphinois')).toHaveCount(1);

    await page.getByRole('link', { name: 'Modifier' }).click();
    await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois/modifier');

    await page.getByLabel('Titre').fill('Aubergines farcies');
    await page.locator('#ingredient-name-0').fill('Aubergines');
    await page.locator('#ingredient-quantity-0').fill('4');
    await page.locator('#ingredient-unit-0').selectOption('piece');

    await page.getByRole('button', { name: 'Retirer' }).nth(1).click();
    await expect(page.locator('#ingredient-name-1')).toHaveCount(0);

    await page.getByLabel('Préparation').fill('Farcir, enfourner 40 min.');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois');
    await expect(page.getByRole('heading', { level: 1, name: 'Aubergines farcies' })).toBeVisible();
    await expect(page.getByText('Pour 6 personnes')).toBeVisible();

    await expect(ingredientsDuDetail(page)).toHaveCount(1);
    await expect(ingredientsDuDetail(page).nth(0)).toContainText('Aubergines');
    await expect(ingredientsDuDetail(page).nth(0)).toContainText('4 pièce');
    await expect(page.getByText('Farcir, enfourner 40 min.')).toBeVisible();

    await expect(page.getByText('Crème')).toHaveCount(0);
    await expect(page.getByText('Gratin dauphinois')).toHaveCount(0);

    await page.getByRole('link', { name: '← Recettes' }).click();
    await expect(page).toHaveURL('/catalogue');
    await expect(titresDuCatalogue(page)).toHaveText([
      'Aubergines farcies',
      'Curry de pois chiches',
      'Omelette aux herbes',
    ]);
  });

  test('vider une quantité fait refuser l’enregistrement, et la recette n’est pas touchée', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await ouvrirLaModificationDuGratin(page);

    await page.locator('#ingredient-quantity-1').fill('');
    await expect(page.getByRole('button', { name: 'Enregistrer' })).toBeEnabled();
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(
      page.getByText('Complète ou retire les lignes d’ingrédient incomplètes.'),
    ).toBeVisible();
    await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois/modifier');

    await relireLeGratinDepuisLeDepot(page);
    await expect(ingredientsDuDetail(page)).toHaveCount(2);
    await expect(ingredientsDuDetail(page).nth(1)).toContainText('Crème');
    await expect(ingredientsDuDetail(page).nth(1)).toContainText('500 ml');
  });

  test('la quantité retapée efface le constat et l’enregistrement repart', async ({ page }) => {
    await page.goto('/catalogue');
    await ouvrirLaModificationDuGratin(page);

    await page.locator('#ingredient-quantity-1').fill('');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Complète ou retire')).toHaveCount(1);

    await page.locator('#ingredient-quantity-1').fill('400');
    await expect(page.getByText('Complète ou retire')).toHaveCount(0);

    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois');
    await expect(ingredientsDuDetail(page)).toHaveCount(2);
    await expect(ingredientsDuDetail(page).nth(1)).toContainText('Crème');
    await expect(ingredientsDuDetail(page).nth(1)).toContainText('400 ml');
    await expect(page.getByText('Complète ou retire')).toHaveCount(0);
  });

  test('après une modification, le formulaire se rouvre sur le contenu à jour et resert', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await ouvrirLaModificationDuGratin(page);

    await page.getByLabel('Titre').fill('Aubergines farcies');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois');

    await page.getByRole('link', { name: 'Modifier' }).click();

    await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois/modifier');
    await expect(page.getByLabel('Titre')).toHaveValue('Aubergines farcies');
    await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois/modifier');

    await page.getByLabel('Titre').fill('Zaalouk d’aubergines');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Zaalouk d’aubergines' }),
    ).toBeVisible();

    await page.getByRole('link', { name: '← Recettes' }).click();
    await expect(titresDuCatalogue(page)).toHaveText([
      'Curry de pois chiches',
      'Omelette aux herbes',
      'Zaalouk d’aubergines',
    ]);
  });

  test('le lien de retour du formulaire ramène au détail de la recette modifiée', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await ouvrirLaModificationDuGratin(page);

    await page.getByRole('link', { name: '← Recette', exact: true }).click();

    await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois');
    await expect(page.getByRole('heading', { level: 1, name: 'Gratin dauphinois' })).toBeVisible();
  });

  test('un identifiant inconnu affiche « Recette introuvable » au lieu d’un formulaire', async ({
    page,
  }) => {
    await page.goto('/catalogue/recette-qui-nexiste-pas/modifier');

    await expect(page.getByText('Recette introuvable')).toHaveCount(1);
    await expect(page.getByLabel('Titre')).toHaveCount(0);
    await expect(page.getByRole('link', { name: '← Recettes' })).toBeVisible();
  });
});

test.describe('Modifier une recette hors ligne', () => {
  test('l’enregistrement non confirmé est visible sans défiler, et la recette n’est pas modifiée', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await failWrites(page);
    await ouvrirLaModificationDuGratin(page);

    await page.getByLabel('Titre').fill('Aubergines farcies');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    const constat = page.getByText(
      'Aucune connexion — l’enregistrement de la recette n’a pas pu être confirmé.',
    );
    await expect(constat).toBeVisible();

    await attendreAtteignable(constat);

    await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois/modifier');

    await relireLeGratinDepuisLeDepot(page);
    await expect(ingredientsDuDetail(page)).toHaveCount(2);
    await expect(page.getByRole('link', { name: '← Recettes' })).toBeVisible();

    await page.getByRole('link', { name: '← Recettes' }).click();
    await expect(page).toHaveURL('/catalogue');
    await expect(titresDuCatalogue(page)).toHaveText(TITRES_DE_DEPART);
  });

  test('réseau rétabli, le même formulaire enregistre et ne laisse aucune trace du constat non confirmé', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await failWrites(page);
    await ouvrirLaModificationDuGratin(page);

    await page.getByLabel('Titre').fill('Aubergines farcies');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(
      page.getByText('l’enregistrement de la recette n’a pas pu être confirmé'),
    ).toHaveCount(1);

    await restore(page);
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois');
    await expect(page.getByRole('heading', { level: 1, name: 'Aubergines farcies' })).toBeVisible();
    await expect(
      page.getByText('l’enregistrement de la recette n’a pas pu être confirmé'),
    ).toHaveCount(0);

    await page.getByRole('link', { name: 'Modifier' }).click();
    await expect(page.getByLabel('Titre')).toHaveValue('Aubergines farcies');
    await expect(
      page.getByText('l’enregistrement de la recette n’a pas pu être confirmé'),
    ).toHaveCount(0);
  });
});
