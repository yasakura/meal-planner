import { expect, test, type Page } from '@playwright/test';

import { failReads, restore } from './support/e2e-controls';

/**
 * Ordre attendu du catalogue : alphabétique par titre, collation française. Il n'est PAS
 * l'ordre du jeu de départ, et il n'est pas non plus celui que le dépôt rend — l'adapter e2e
 * inverse délibérément son ordre d'insertion, parce que le port ne promet aucun ordre. Cette
 * liste ne peut donc être verte que si `listRecipesUseCase` trie réellement.
 */
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

  /**
   * Ce scénario est aussi le TÉMOIN des assertions d'absence du catalogue hors ligne : c'est
   * ici, et seulement ici, que « Aucune recette » a le droit d'exister. Sans lui, une absence
   * portant sur un libellé renommé resterait vraie pour de mauvaises raisons.
   */
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

    // L'enregistrement ramène au catalogue, qui se recharge : la recette est relue depuis le
    // dépôt, elle n'est pas simplement affichée de mémoire.
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

  /**
   * Le VERROU de soumission, jamais exercé au parcours assemblé jusqu'ici. Il vit dans
   * `recipe-form-submission.ts`, que la mutation couvre — mais son CÂBLAGE au bouton vit dans un
   * `.tsx`, que Stryker ne regarde pas. Un verrou correctement calculé et jamais branché produit
   * exactement le défaut qu'il existe pour empêcher : une recette sans titre, ou sans le moindre
   * ingrédient, écrite au dépôt.
   *
   * Distinct du refus au clic de la ligne INCOMPLÈTE (`modifier-recette.spec.ts`) : ici le bouton
   * ne part pas du tout, là il part et se fait refuser.
   */
  test('le formulaire de création reste verrouillé tant qu’il manque un titre ou un ingrédient', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await page.getByRole('link', { name: 'Ajouter une recette' }).click();

    const enregistrer = page.getByRole('button', { name: 'Enregistrer' });
    // À l'ouverture, rien n'est saisi.
    await expect(enregistrer).toBeDisabled();

    // Un ingrédient valide ne suffit pas : la recette n'a pas de nom.
    await page.locator('#ingredient-name-0').fill('Poireaux');
    await page.locator('#ingredient-quantity-0').fill('3');
    await expect(enregistrer).toBeDisabled();

    // Un titre d'espaces n'est pas un titre.
    await page.getByLabel('Titre').fill('   ');
    await expect(enregistrer).toBeDisabled();

    // GAGE des quatre verrous ci-dessus : le bouton s'ouvre bel et bien quand les deux exigences
    // sont tenues. Sans lui, un bouton désactivé pour une tout autre raison — ou introuvable —
    // les rendrait tous vrais sans rien défendre.
    await page.getByLabel('Titre').fill('Tarte aux poireaux');
    await expect(enregistrer).toBeEnabled();

    // Et il se referme : vidée de sa quantité, la seule ligne n'est plus un ingrédient valide.
    await page.locator('#ingredient-quantity-0').fill('');
    await expect(enregistrer).toBeDisabled();

    // SORTIE du verrou, et preuve que rien n'a fui entre-temps : la quantité retapée rouvre le
    // bouton, et le catalogue reçoit UNE recette — pas trois brouillons partis en chemin.
    await page.locator('#ingredient-quantity-0').fill('3');
    await enregistrer.click();
    await expect(page).toHaveURL('/catalogue');
    await expect(titresDuCatalogue(page)).toHaveText([...TITRES_TRIES, 'Tarte aux poireaux']);
  });

  /**
   * Le statut d'enregistrement est un état transitoire du store, et le store est un singleton
   * de session : resté à `success`, il fait renavigüer vers le catalogue le formulaire à peine
   * monté. Tout se joue donc en navigation CLIENT — jamais de `page.goto()` entre les deux
   * ouvertures, qui recréerait le store et masquerait le défaut.
   */
  test('après une création, le formulaire se rouvre vierge et utilisable', async ({ page }) => {
    await page.goto('/catalogue');

    await page.getByRole('link', { name: 'Ajouter une recette' }).click();
    await page.getByLabel('Titre').fill('Tarte aux poireaux');
    await page.locator('#ingredient-name-0').fill('Poireaux');
    await page.locator('#ingredient-quantity-0').fill('3');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page).toHaveURL('/catalogue');

    await page.getByRole('link', { name: 'Ajouter une recette' }).click();

    // Le défaut vécu : le formulaire se montait puis renvoyait aussitôt au catalogue.
    await expect(page).toHaveURL('/catalogue/nouvelle');
    const titre = page.getByLabel('Titre');
    await expect(titre).toBeVisible();

    // Ré-assertion de l'URL, et c'est ELLE qui porte la garantie. Les deux assertions ci-dessus
    // réessaient jusqu'à trouver : le montage FUGACE du formulaire, juste avant que le défaut ne
    // renvoie au catalogue, les satisfait l'une comme l'autre. Ici en revanche l'URL est
    // définitivement revenue à `/catalogue` sous le défaut, donc le rouge tombe à la ligne qui
    // l'annonce, et il le dit — au lieu d'un « element(s) not found » sur le champ trois lignes
    // plus bas, ou d'un `fill()` d'élément détaché vingt lignes plus loin.
    await expect(page).toHaveURL('/catalogue/nouvelle');

    await expect(titre).toHaveValue('');

    // Vierge ne suffit pas : il doit aussi resservir de bout en bout.
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

test.describe('Catalogue hors ligne', () => {
  test('dit qu’il n’y a pas de connexion, jamais qu’il n’y a pas de recette, et laisse ajouter', async ({
    page,
  }) => {
    // On démarre AILLEURS puis on entre au catalogue par la tab bar : `page.goto()` recharge la
    // page, donc recrée le store et le commutateur de panne avec lui — la panne serait perdue
    // avant d'être observée, et le scénario passerait sur un catalogue nominal.
    await page.goto('/menu');
    await failReads(page);
    await page.click('nav a[href="/catalogue"]');

    await expect(
      page.getByText('Aucune connexion — le catalogue n’a pas pu être chargé.'),
    ).toBeVisible();

    // Le défaut vécu : hors ligne, l'écran affirmait un catalogue VIDE. Une absence de réseau
    // n'est pas une absence de recette. (Les mêmes localisateurs trouvent bien quelque chose
    // dans « un catalogue sans recette le dit » — c'est ce qui rend ces absences parlantes.)
    await expect(page.getByText('Aucune recette')).toHaveCount(0);
    await expect(page.getByText('Crée ta première recette pour la retrouver ici')).toHaveCount(0);

    // Le lien d'ajout reste la porte de sortie : l'écran n'est pas une impasse.
    await expect(page.getByRole('link', { name: 'Ajouter une recette' })).toBeVisible();
  });

  test('au retour du réseau, la liste revient et ne garde aucune trace du constat', async ({
    page,
  }) => {
    await page.goto('/menu');
    await failReads(page);
    await page.click('nav a[href="/catalogue"]');
    await expect(
      page.getByText('Aucune connexion — le catalogue n’a pas pu être chargé.'),
    ).toBeVisible();
    // Le localisateur court, celui de l'absence plus bas, vu ici en train de trouver le constat.
    await expect(page.getByText('Aucune connexion')).toHaveCount(1);

    await restore(page);
    // Aller-retour par la tab bar : re-cliquer l'onglet courant ne remonte rien.
    await page.click('nav a[href="/menu"]');
    await page.click('nav a[href="/catalogue"]');

    await expect(titresDuCatalogue(page)).toHaveText(TITRES_TRIES);
    await expect(page.getByText('Aucune connexion')).toHaveCount(0);
  });

  /**
   * TÉMOIN de l'absence affirmée par le scénario suivant : « Recette introuvable » n'a le droit
   * d'exister qu'ici, quand la recette n'existe réellement pas. Rangé dans ce groupe, et non
   * avec les scénarios nominaux, pour rester lisible à côté de ce qu'il rend discriminant.
   */
  test('une recette qui n’existe pas le dit, sans piéger l’utilisateur', async ({ page }) => {
    await page.goto('/catalogue/recette-qui-nexiste-pas');

    await expect(page.getByText('Recette introuvable')).toHaveCount(1);
    await expect(page.getByRole('link', { name: '← Recettes' })).toBeVisible();
  });

  test('sur le détail d’une recette, le lien retour reste accessible', async ({ page }) => {
    await page.goto('/catalogue');
    await expect(titresDuCatalogue(page)).toHaveText(TITRES_TRIES);

    await failReads(page);
    await page.getByRole('link', { name: 'Gratin dauphinois' }).click();

    await expect(
      page.getByText('Aucune connexion — la recette n’a pas pu être chargée.'),
    ).toBeVisible();
    // Hors ligne n'est pas « cette recette n'existe pas » : l'écran ne doit pas l'affirmer.
    // Même localisateur que le scénario témoin juste au-dessus, où il trouve bien son texte.
    await expect(page.getByText('Recette introuvable')).toHaveCount(0);

    // Sans lien retour, l'utilisateur est piégé sur un écran qui ne montre rien.
    const retour = page.getByRole('link', { name: '← Recettes' });
    await expect(retour).toBeVisible();

    await restore(page);
    await retour.click();
    await expect(page).toHaveURL('/catalogue');
    await expect(titresDuCatalogue(page)).toHaveText(TITRES_TRIES);
  });
});
