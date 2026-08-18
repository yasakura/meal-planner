import { expect, test, type Page } from '@playwright/test';

import { atteignabilite } from './support/atteignabilite';
import { failWrites, restore } from './support/e2e-controls';

/**
 * Modifier une recette existante. Le parcours se fait en navigation CLIENTE de bout en bout :
 * un `page.goto()` intermédiaire recréerait le store — donc le dépôt en mémoire, donc le
 * commutateur de panne — et masquerait aussi bien la rémanence du statut d'édition que la
 * persistance de la modification elle-même.
 */

const TITRES_DE_DEPART = ['Curry de pois chiches', 'Gratin dauphinois', 'Omelette aux herbes'];

function titresDuCatalogue(page: Page) {
  return page.locator('main ul li h2');
}

function ingredientsDuDetail(page: Page) {
  return page.locator('main ul li');
}

/** Catalogue → détail du gratin → formulaire de modification, par les liens de l'application. */
async function ouvrirLaModificationDuGratin(page: Page) {
  await page.getByRole('link', { name: 'Gratin dauphinois' }).click();
  await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois');

  await page.getByRole('link', { name: 'Modifier' }).click();
  await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois/modifier');
}

/**
 * Relire une recette DEPUIS le dépôt, et non depuis ce que le store porte encore.
 *
 * Au premier rendu, l'écran de détail repeint ce que le store porte : la recette précédemment
 * consultée, sous un statut qui dit déjà « succès ». Sur un « rien n'a bougé », cette peinture
 * périmée porte justement l'ancienne valeur — elle satisfait l'assertion sans qu'aucune lecture
 * n'ait eu lieu, et le filet ne retient plus rien. (Mesuré : un dépôt qui écrit AVANT son garde
 * de panne passait au travers.)
 *
 * Le détour par une autre recette rend cette peinture périmée incapable de satisfaire quoi que
 * ce soit : Playwright doit attendre la lecture réelle. Et pas de `page.goto()` — il recréerait
 * le store, donc le dépôt en mémoire, et rendrait la vérification vide de sens.
 *
 * Le garde d'identité de `recipe-for-route.ts` ne dispense PAS de ce détour, il le rend efficace.
 * Ce garde filtre une péremption d'IDENTITÉ — « la recette du store n'est pas celle de la route » ;
 * revenir du formulaire au détail de LA MÊME recette lui présente le bon identifiant sur un
 * contenu périmé, et il laisse passer, par construction. C'est le passage par l'omelette qui fait
 * diverger les identifiants, donc mordre le garde, donc blanchir la frame.
 *
 * Appelé depuis le FORMULAIRE, dont le retour rend maintenant le détail de la recette modifiée
 * et non plus le catalogue : deux liens pour rejoindre la liste, là où un seul suffisait. Le
 * détour par l'omelette, lui, est inchangé — c'est lui, et lui seul, qui force la relecture.
 */
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

  /**
   * Le parcours complet demandé : modifier le titre ET un ingrédient, enregistrer, retomber sur
   * LE DÉTAIL de la recette modifiée (jamais sur le catalogue, contrairement à la création),
   * puis retrouver le nouveau titre à sa nouvelle place alphabétique.
   *
   * Le nouveau titre est choisi pour CHANGER de rang : « Aubergines farcies » passe en tête,
   * là où « Gratin de… » serait resté deuxième et n'aurait rien prouvé du retri.
   */
  test('modifier titre et ingrédients se répercute au détail puis au catalogue', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await expect(titresDuCatalogue(page)).toHaveText(TITRES_DE_DEPART);

    await page.getByRole('link', { name: 'Gratin dauphinois' }).click();
    await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois');

    // GAGE des deux absences affirmées plus bas : les MÊMES localisateurs, vus trouver leur texte
    // sur ce détail-ci, avant modification. Sans lui, `toHaveCount(0)` passerait tout aussi bien
    // sur un sélecteur faux ou un écran vide.
    //
    // DEUX occurrences pour la crème, et le compte exact le dit : la ligne d'ingrédient, et la
    // préparation qui parle de « napper de crème » — `getByText` cherche une sous-chaîne SANS
    // tenir compte de la casse. C'est justement la contradiction que le défaut produisait :
    // l'ingrédient disparu, la préparation continuant de le nommer.
    await expect(page.getByText('Crème')).toHaveCount(2);
    await expect(page.getByText('Gratin dauphinois')).toHaveCount(1);

    await page.getByRole('link', { name: 'Modifier' }).click();
    await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois/modifier');

    await page.getByLabel('Titre').fill('Aubergines farcies');
    await page.locator('#ingredient-name-0').fill('Aubergines');
    await page.locator('#ingredient-quantity-0').fill('4');
    await page.locator('#ingredient-unit-0').selectOption('piece');

    // La seconde ligne est RETIRÉE : la modification remplace intégralement le contenu, elle ne
    // fusionne pas. « Crème » doit disparaître de la recette.
    await page.getByRole('button', { name: 'Retirer' }).nth(1).click();
    await expect(page.locator('#ingredient-name-1')).toHaveCount(0);

    await page.getByLabel('Préparation').fill('Farcir, enfourner 40 min.');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    // Retour sur LE DÉTAIL, pas sur le catalogue — et sous le MÊME identifiant : modifier
    // conserve l'identité de la recette.
    await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois');
    await expect(page.getByRole('heading', { level: 1, name: 'Aubergines farcies' })).toBeVisible();
    await expect(page.getByText('Pour 6 personnes')).toBeVisible();

    await expect(ingredientsDuDetail(page)).toHaveCount(1);
    await expect(ingredientsDuDetail(page).nth(0)).toContainText('Aubergines');
    await expect(ingredientsDuDetail(page).nth(0)).toContainText('4 pièce');
    await expect(page.getByText('Farcir, enfourner 40 min.')).toBeVisible();

    // Les deux localisateurs gagés en tête de scénario, désormais bredouilles : la crème a
    // vraiment quitté la recette, et l'ancien titre n'est plus nulle part.
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

  /**
   * Vider la quantité d'un ingrédient EXISTANT — le geste de qui va retaper une valeur. La ligne
   * était écartée en silence, la recette enregistrée sans elle, et l'application renavigüait vers
   * le détail : perte de donnée ET faux signal de succès. Le clic doit refuser.
   *
   * Ce scénario est le seul filet du parcours assemblé : la décision vit dans un `.ts` muté, mais
   * son câblage au bouton vit dans un `.tsx` que la mutation ne voit pas.
   */
  test('vider une quantité fait refuser l’enregistrement, et la recette n’est pas touchée', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await ouvrirLaModificationDuGratin(page);

    await page.locator('#ingredient-quantity-1').fill('');
    // Le bouton RESTE actif : c'est le clic qui refuse, pas un verrou posé d'avance.
    await expect(page.getByRole('button', { name: 'Enregistrer' })).toBeEnabled();
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(
      page.getByText('Complète ou retire les lignes d’ingrédient incomplètes.'),
    ).toBeVisible();
    // Aucune renavigation : rien ne fait croire à un succès.
    await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois/modifier');

    // Et la recette elle-même est intacte — c'est la donnée, pas seulement l'écran.
    await relireLeGratinDepuisLeDepot(page);
    await expect(ingredientsDuDetail(page)).toHaveCount(2);
    await expect(ingredientsDuDetail(page).nth(1)).toContainText('Crème');
    await expect(ingredientsDuDetail(page).nth(1)).toContainText('500 ml');
  });

  /** La SORTIE du constat : la ligne complétée, il s'efface et l'enregistrement repart. */
  test('la quantité retapée efface le constat et l’enregistrement repart', async ({ page }) => {
    await page.goto('/catalogue');
    await ouvrirLaModificationDuGratin(page);

    await page.locator('#ingredient-quantity-1').fill('');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    // Le localisateur court, celui de l'absence plus bas, vu ici en train de trouver le constat.
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

  /**
   * Rémanence du statut d'édition, même famille que l'issue #27 : resté à `success`, il ferait
   * renavigüer vers le détail un formulaire à peine rouvert. Tout se joue en navigation cliente,
   * sur le store de la session.
   */
  test('après une modification, le formulaire se rouvre sur le contenu à jour et resert', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await ouvrirLaModificationDuGratin(page);

    await page.getByLabel('Titre').fill('Aubergines farcies');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois');

    await page.getByRole('link', { name: 'Modifier' }).click();

    // Le défaut de la famille #27 : le formulaire se monte puis renvoie aussitôt au détail.
    // C'est l'URL qui porte la garantie — les assertions sur le champ réessaient jusqu'à
    // trouver, et le montage FUGACE du formulaire les satisferait toutes les deux.
    await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois/modifier');
    await expect(page.getByLabel('Titre')).toHaveValue('Aubergines farcies');
    await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois/modifier');

    // Rouvert ne suffit pas : il doit resservir de bout en bout.
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

  /**
   * Le retour du formulaire rend l'écran d'OÙ L'ON VIENT. Le lien menait au catalogue : annuler
   * une modification renvoyait deux crans plus loin que le détail dont on était parti. Tout en
   * navigation cliente — un `page.goto()` sur le détail passerait à côté du lien testé.
   */
  test('le lien de retour du formulaire ramène au détail de la recette modifiée', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await ouvrirLaModificationDuGratin(page);

    // `exact: true` : sans lui, `name` cherche une SOUS-CHAÎNE — « ← Recette » trouvait
    // « ← Recettes » et le libellé au singulier n'était plus asserté du tout.
    await page.getByRole('link', { name: '← Recette', exact: true }).click();

    await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois');
    await expect(page.getByRole('heading', { level: 1, name: 'Gratin dauphinois' })).toBeVisible();
  });

  /**
   * Un identifiant qui ne désigne rien : le constat, et surtout PAS de formulaire — préremplir
   * un formulaire de néant ferait enregistrer une recette sous un identifiant inventé.
   *
   * L'absence du formulaire est gagée par les scénarios ci-dessus, où le même `getByLabel('Titre')`
   * trouve bien son champ. (L'absence de « Recette introuvable », elle, se joue dans
   * `catalogue.spec.ts`, avec son propre témoin — rien à voir avec ce fichier.)
   */
  test('un identifiant inconnu affiche « Recette introuvable » au lieu d’un formulaire', async ({
    page,
  }) => {
    await page.goto('/catalogue/recette-qui-nexiste-pas/modifier');

    await expect(page.getByText('Recette introuvable')).toHaveCount(1);
    await expect(page.getByLabel('Titre')).toHaveCount(0);
    // L'écran n'est pas une impasse.
    await expect(page.getByRole('link', { name: '← Recettes' })).toBeVisible();
  });
});

test.describe('Modifier une recette hors ligne', () => {
  /**
   * L'échec d'enregistrement doit se VOIR. `toBeVisible()` ne suffit pas : il ne regarde ni le
   * recouvrement par un autre élément, ni la sortie du viewport. Le constat vit dans la barre
   * d'action collante précisément pour voyager avec le bouton ; seule une mesure de position au
   * repos le prouve sur cette route, qui est neuve même si l'écran est partagé.
   */
  test('l’échec d’enregistrement est visible sans défiler, et la recette n’est pas modifiée', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    // Panne armée AVANT d'entrer dans le formulaire, et on y entre par les liens : un
    // `page.goto()` recréerait le store, donc le commutateur, et l'écriture réussirait.
    await failWrites(page);
    await ouvrirLaModificationDuGratin(page);

    await page.getByLabel('Titre').fill('Aubergines farcies');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    const constat = page.getByText('Impossible d’enregistrer la recette.');
    await expect(constat).toBeVisible();

    // L'utilisateur n'a pas défilé : il a cliqué une commande qui était là, au repos.
    await page.evaluate(() => window.scrollTo(0, 0));
    const mesure = await atteignabilite(constat);
    expect(mesure.largeur).toBeGreaterThan(0);
    expect(mesure.hauteur).toBeGreaterThan(0);
    expect(mesure.defilement).toBe(0);
    expect(mesure.obstacle).toBeNull();

    // On reste sur le formulaire : l'échec ne fait pas croire à un succès en renavigüant.
    await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois/modifier');

    // « et la recette n'est pas modifiée » : la seconde moitié du nom, tenue. Rester sur le
    // formulaire ne prouve rien de la DONNÉE — un dépôt qui écrirait avant son garde de panne
    // afficherait ce constat sur une recette pourtant modifiée.
    await relireLeGratinDepuisLeDepot(page);
    await expect(ingredientsDuDetail(page)).toHaveCount(2);
    await expect(page.getByRole('link', { name: '← Recettes' })).toBeVisible();

    // Et le catalogue non plus n'a pas bougé : la lecture fraîche vient d'avoir lieu ci-dessus.
    await page.getByRole('link', { name: '← Recettes' }).click();
    await expect(page).toHaveURL('/catalogue');
    await expect(titresDuCatalogue(page)).toHaveText(TITRES_DE_DEPART);
  });

  /**
   * La SORTIE de l'état non-nominal, et non seulement son entrée : réseau rétabli, le même
   * formulaire doit repartir, et l'écran d'arrivée ne doit garder aucune trace du constat.
   */
  test('réseau rétabli, le même formulaire enregistre et ne laisse aucune trace du constat', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await failWrites(page);
    await ouvrirLaModificationDuGratin(page);

    await page.getByLabel('Titre').fill('Aubergines farcies');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    // Le localisateur court, celui de l'absence plus bas, vu ici en train de trouver le constat.
    await expect(page.getByText('Impossible d’enregistrer')).toHaveCount(1);

    await restore(page);
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois');
    await expect(page.getByRole('heading', { level: 1, name: 'Aubergines farcies' })).toBeVisible();
    await expect(page.getByText('Impossible d’enregistrer')).toHaveCount(0);

    // Et le constat ne ressuscite pas sur le formulaire rouvert.
    await page.getByRole('link', { name: 'Modifier' }).click();
    await expect(page.getByLabel('Titre')).toHaveValue('Aubergines farcies');
    await expect(page.getByText('Impossible d’enregistrer')).toHaveCount(0);
  });
});
