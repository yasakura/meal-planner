import { expect, test, type Page } from '@playwright/test';

import { attendreAtteignable } from './support/atteignabilite';
import { failReads, failWrites, restore } from './support/e2e-controls';

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

    // Le RÔLE autant que le texte : l'écran déclare `status` (poli) et non `alert` (assertif)
    // parce qu'une absence de réseau n'appelle aucune action immédiate. Aucun scénario ne
    // l'assertait — tout basculer en `alert` serait passé inaperçu. `status` est unique dans le
    // document sur cet écran, donc le rôle suffit à désigner la cible.
    await expect(page.getByRole('status')).toHaveText(
      'Aucune connexion — le catalogue n’a pas pu être chargé.',
    );

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
    await expect(page.getByRole('status')).toHaveText(
      'Aucune connexion — le catalogue n’a pas pu être chargé.',
    );
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

    // `alert` (assertif) et non `status` : une recette introuvable interrompt le parcours, elle
    // appelle une action. La distinction est argumentée dans `RecipeDetailScreen` et n'était
    // assertée nulle part.
    await expect(page.getByRole('alert')).toHaveText('Recette introuvable');
    await expect(page.getByRole('link', { name: '← Recettes' })).toBeVisible();
  });

  test('sur le détail d’une recette, le lien retour reste accessible', async ({ page }) => {
    await page.goto('/catalogue');
    await expect(titresDuCatalogue(page)).toHaveText(TITRES_TRIES);

    await failReads(page);
    await page.getByRole('link', { name: 'Gratin dauphinois' }).click();

    // `status` et non `alert` : même arbitrage que pour le catalogue hors ligne, et c'est ici
    // qu'il se distingue de l'`alert` du scénario témoin juste au-dessus — deux constats sur le
    // MÊME écran, dont un seul interrompt le parcours.
    await expect(page.getByRole('status')).toHaveText(
      'Aucune connexion — la recette n’a pas pu être chargée.',
    );
    // Hors ligne n'est pas « cette recette n'existe pas » : l'écran ne doit pas l'affirmer.
    // Le scénario témoin juste au-dessus montre ce TEXTE là où il a le droit d'exister, ce qui
    // rend cette absence parlante : renommé ou disparu, le témoin rougit le premier.
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

/**
 * Issues #32 et #37 — des commandes rendues SOUS les barres collantes.
 *
 * Ni la RTL ni les autres scénarios de cette suite ne peuvent voir ce défaut : la RTL ignore la
 * mise en page, et Playwright fait défiler l'élément dans la vue avant de cliquer. Les deux
 * « cliquent » un bouton que l'utilisateur ne peut pas atteindre — même famille que le champ
 * `disabled` de FR-3 : un test qui emprunte un chemin qu'aucun humain ne peut prendre.
 *
 * Le seul filet possible est donc une MESURE de position dans un vrai navigateur, sans aucun
 * défilement préalable : c'est l'atteignabilité AU REPOS, à l'ouverture de l'écran.
 *
 * Ces scénarios vivaient dans un `layout.spec.ts` à part, aujourd'hui supprimé. Ils sont revenus
 * AUPRÈS du parcours qu'ils protègent : la mise en page du catalogue et de son formulaire n'est
 * pas un sujet transverse, c'est une propriété de ces écrans-là. Ce qui les accompagnait et ne
 * mesurait que du DÉFILEMENT MORT — un proxy — est parti avec le fichier.
 */
test.describe('Mise en page du catalogue', () => {
  test('le bouton d’enregistrement du formulaire est atteignable sans défiler', async ({
    page,
  }) => {
    await page.goto('/catalogue/nouvelle');

    // Le formulaire est rempli pour que le bouton soit ACTIF : on mesure la commande telle que
    // l'utilisateur la trouve au moment où il veut s'en servir, pas une commande inerte.
    await page.getByLabel('Titre').fill('Tarte aux poireaux');
    await page.locator('#ingredient-name-0').fill('Poireaux');
    await page.locator('#ingredient-quantity-0').fill('3');

    const bouton = page.getByRole('button', { name: 'Enregistrer' });
    await expect(bouton).toBeEnabled();

    // `fill()` a fait défiler les champs dans la vue ; `attendreAtteignable` revient au repos,
    // la position où l'écran s'ouvre, et l'assert.
    const mesure = await attendreAtteignable(bouton);

    // Les SEULS `largeur`/`hauteur` encore vivants de la suite, et ils le sont parce que la
    // cible n'est gagée que par `toBeEnabled()`, qui n'implique AUCUNE boîte : un bouton actif
    // de taille nulle rendrait `elementFromPoint` tout aussi nul, et le scénario serait vert
    // sans rien avoir vu. Partout ailleurs un `toBeVisible()` précédait, et il exige déjà une
    // boîte englobante non vide — les mêmes deux lignes y étaient mortes, elles ont été
    // retirées. Ne pas les supprimer ici par symétrie : le gage n'y est pas.
    expect(mesure.largeur).toBeGreaterThan(0);
    expect(mesure.hauteur).toBeGreaterThan(0);
  });

  /**
   * F1 — le constat de non-acquittement voyage-t-il AVEC la commande ? Le bouton remonte avec
   * la barre collante ; un message resté à sa position naturelle finit sous le pli, et
   * l'utilisateur qui vient de cliquer ne voit rien — il reclique. Même famille que l'ajout
   * silencieux de FR-3.
   *
   * `toBeVisible()` ne suffit pas ici : il ne regarde pas si un autre élément recouvre la
   * cible, ni si elle est hors du viewport. Seule la mesure de position le dit.
   */
  test('le constat d’enregistrement non confirmé est visible sans défiler', async ({ page }) => {
    // On arme la panne AVANT d'entrer dans le formulaire, et on y entre par le lien : un
    // `page.goto()` recréerait le store, donc le commutateur, et l'écriture réussirait.
    await page.goto('/catalogue');
    await failWrites(page);
    await page.getByRole('link', { name: 'Ajouter une recette' }).click();

    await page.getByLabel('Titre').fill('Tarte aux poireaux');
    await page.locator('#ingredient-name-0').fill('Poireaux');
    await page.locator('#ingredient-quantity-0').fill('3');

    await page.getByRole('button', { name: 'Enregistrer' }).click();

    const constat = page.getByText(
      'Aucune connexion — l’enregistrement de la recette n’a pas pu être confirmé.',
    );
    await expect(constat).toBeVisible();

    // Retour au repos : l'utilisateur n'a pas défilé, il a cliqué une commande qui était là.
    await attendreAtteignable(constat);
  });

  /**
   * F2 — une barre collante ne réserve pas sa place : le formulaire défile DERRIÈRE elle. Sans
   * fond opaque, ses champs se voient au travers de la marge de la barre, et l'utilisateur ne
   * sait plus où le champ s'arrête ni où la commande commence. Le fond n'est donc pas un
   * ornement : il est ce qui fait de la barre une surface, et non un trou.
   */
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

    // Gage : si l'écran lui-même était transparent, l'égalité ci-dessous serait vraie et muette.
    expect(fonds.ecran).not.toBe('rgba(0, 0, 0, 0)');
    expect(fonds.barre).toBe(fonds.ecran);
  });

  /**
   * `elementFromPoint` prouve que la commande est ATTEIGNABLE ; il ne dit pas OÙ. Ce scénario-ci
   * gage la coordonnée, et avec elle ce que l'atteignabilité ne peut pas voir : que la barre
   * d'action et la tab bar lisent bien LA MÊME hauteur. `--tabbar-h` est publiée par `Layout`,
   * consommée comme décalage par la barre d'action dans un autre fichier, et déclarée comme
   * hauteur par la tab bar dans un troisième ; le jour où l'un des deux consommateurs cesse de la
   * lire — valeur écrite en dur, hauteur redevenue émergente —, la barre cesse d'être posée sur
   * le haut de la tab bar, et cette égalité le dit immédiatement, à chaque exécution.
   *
   * Ce qu'il ne gage PAS, contrairement à ce qu'on pourrait lire dans l'égalité : la VALEUR de
   * `--tabbar-h`. Les deux membres en dérivent — `bottom: var(--tabbar-h)` d'un côté,
   * `height: var(--tabbar-h)` de l'autre —, donc la porter à 72px les déplace ensemble et le
   * scénario reste vert. Le PLANCHER de cette valeur — la hauteur qu'il faut au contenu des
   * onglets — n'est plus tenu par aucun scénario : celui qui s'en chargeait mesurait des pixels
   * à 0,1 px près, donc dépendait de la police que la machine résout pour `system-ui`, pour un
   * débordement qui n'apparaît qu'à des tailles que l'application n'utilise jamais.
   *
   * C'est la BARRE qui est mesurée, et non le bouton qu'elle contient : la barre lui réserve du
   * padding, donc le bas du bouton n'est plus le bas de ce qui se pose sur la tab bar.
   */
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

    // Gages : deux boîtes effondrées rendraient `0 === 0`, vrai et muet.
    expect(barre.hauteur).toBeGreaterThan(0);
    expect(hautDeLaTabBar).toBeGreaterThan(0);
    expect(barre.bas).toBe(hautDeLaTabBar);
  });

  /**
   * F4 — sur un écran COURT, la seule chose qui pousse la tab bar au bas du viewport est le
   * `flex: 1` de `Content` : `Shell` garde son `min-height`, donc « la page ne défile pas »
   * reste vrai pendant que la tab bar flotte au milieu de l'écran. C'est la raison pour laquelle
   * ce scénario a survécu aux trois « tient dans l'écran, sans aucun défilement » qui
   * l'entouraient : eux mesuraient du défilement MORT, un proxy aveugle à ce décrochage ; lui
   * mesure DIRECTEMENT la conséquence visible, la seule que l'utilisateur constate.
   *
   * Rangé au catalogue, et non au menu : c'est `/catalogue?recipes=0` qu'il ouvre, et c'est déjà
   * ce fichier qui possède l'écran vide du catalogue.
   */
  test('la tab bar se pose au bas de l’écran quand le contenu est court', async ({ page }) => {
    await page.goto('/catalogue?recipes=0');
    const tabBar = page.getByRole('navigation');
    await expect(tabBar).toBeVisible();

    const mesure = await tabBar.evaluate((element) => ({
      bas: element.getBoundingClientRect().bottom,
      hauteur: element.getBoundingClientRect().height,
      viewport: document.documentElement.clientHeight,
    }));

    // Le gage est le `toBeVisible()` ci-dessus, et lui seul suffit : il exige déjà une boîte
    // englobante non vide, donc une tab bar effondrée — qui poserait son bas n'importe où — ne
    // peut pas arriver jusqu'ici. Un `expect(mesure.hauteur).toBeGreaterThan(0)` a occupé cette
    // place et ne pouvait pas rougir ; ne pas le remettre.
    expect(mesure.bas).toBe(mesure.viewport);
  });
});
