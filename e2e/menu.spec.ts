import { expect, test, type Locator, type Page } from '@playwright/test';

import { failReads, failWrites, restore } from './support/e2e-controls';

test.describe('Menu', () => {
  test('générer un menu remplit les repas de la quinzaine', async ({ page }) => {
    await page.goto('/menu');

    await expect(page.getByRole('heading', { level: 1, name: 'Menu' })).toBeVisible();
    await page.getByRole('button', { name: 'Générer un menu' }).click();

    // Fenêtre par défaut : 14 jours × 2 créneaux.
    const jours = page.locator('main section');
    await expect(jours).toHaveCount(14);
    await expect(page.locator('main section li')).toHaveCount(28);

    // Les 28 créneaux portent TOUS un titre du vivier, et ils se répartissent exactement :
    // le tirage du mode e2e est déterministe (toujours la tête du vivier) et le vivier de 3
    // recettes se répète en cycle sur les 28 créneaux, d'où 10 + 9 + 9 = 28. Un créneau retombé
    // sur le repli « Recette inconnue » ferait chuter l'un de ces comptes.
    //
    // C'est la forme PERMANENTE de ce que disait `getByText('Recette inconnue')).toHaveCount(0)`,
    // qui l'a remplacée ici : ce localisateur-là n'était vu trouver son texte NULLE PART dans la
    // suite, donc son absence passait aussi bien sur un sélecteur faux, un libellé renommé ou un
    // écran vide. Ces trois-ci sont des assertions de PRÉSENCE : elles se gagent à chaque
    // exécution. Vérifiées AVANT les titres du premier jour, pour que ce soit cette
    // répartition-là qui parle si la correspondance id → titre se casse.
    await expect(page.getByText('Omelette aux herbes')).toHaveCount(10);
    await expect(page.getByText('Gratin dauphinois')).toHaveCount(9);
    await expect(page.getByText('Curry de pois chiches')).toHaveCount(9);

    // Chaque jour porte sa DATE réelle. Le mode e2e fige son horloge au jeudi 1er janvier 2026
    // (`E2E_TODAY`), et le menu part du prochain lundi : lundi 5 janvier, quatorzième jour
    // dimanche 18. Sans cette horloge figée, ces deux libellés changeraient chaque jour.
    await expect(jours.first().getByRole('heading', { level: 2 })).toHaveText('lundi 5 janvier');
    await expect(jours.last().getByRole('heading', { level: 2 })).toHaveText('dimanche 18 janvier');

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

  /**
   * TRANCHE 4b — un menu ne peut pas démarrer dans le passé. Le mode e2e fige son horloge au
   * jeudi 1er janvier 2026 (`E2E_TODAY`) : c'est ce jour-là le plancher, et le lundi 5 janvier
   * la date de début proposée par défaut.
   *
   * Le vrai geste, c'est la SAISIE : `fill` dépose une valeur dans le champ natif exactement
   * comme le clavier, `min` ou pas — c'est bien le slice qui refuse, et non l'attribut.
   */
  test('le menu refuse une date de début passée, puis accepte le jour même', async ({ page }) => {
    await page.goto('/menu');

    const champ = page.getByLabel('Début du menu');
    await expect(champ).toHaveValue('2026-01-05');
    // L'affordance : le sélecteur natif n'offre rien avant aujourd'hui.
    await expect(champ).toHaveAttribute('min', '2026-01-01');

    await champ.fill('2025-12-25');

    // L'écran ne peut pas se taire : il garde sa date ET dit pourquoi celle qu'on vient de
    // saisir n'y est plus.
    const constat = page.getByText('Le menu ne peut pas commencer avant aujourd’hui.');
    await expect(constat).toHaveCount(1);
    await expect(champ).toHaveValue('2026-01-05');

    // SORTIE de l'état : le jour même est recevable — le plancher est aujourd'hui, pas demain.
    await champ.fill('2026-01-01');

    await expect(champ).toHaveValue('2026-01-01');
    await expect(constat).toHaveCount(0);

    // Et c'est bien de ce jour-là que part le menu.
    await page.getByRole('button', { name: 'Générer un menu' }).click();
    const premierJour = page.locator('main section').first();
    await expect(premierJour.getByRole('heading', { level: 2 })).toHaveText('jeudi 1er janvier');
  });

  /**
   * TÉMOIN de l'absence affirmée par le scénario hors ligne : « Ajoute d'abord des recettes »
   * n'a le droit d'exister QUE quand le catalogue est réellement vide. Les deux constats du menu
   * sortent des deux branches du même ternaire (`errorMessage`, `MenuContainer.tsx`), donc rien
   * ne distingue « pas de recette » de « pas de réseau » sinon le texte lui-même.
   */
  test('sans recette, le menu refuse de générer et le dit ; une recette créée, il génère', async ({
    page,
  }) => {
    await page.goto('/menu?recipes=0');
    await page.getByRole('button', { name: 'Générer un menu' }).click();

    await expect(page.getByRole('alert')).toHaveText(
      "Ajoute d'abord des recettes pour générer un menu.",
    );
    await expect(page.getByText("Ajoute d'abord des recettes")).toHaveCount(1);
    // Le constat nomme le remède, encore faut-il que l'écran ne soit pas une impasse.
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible();

    // SORTIE de l'état : le remède annoncé est appliqué, par les liens et jamais par l'URL —
    // un `goto` recréerait le store, donc effacerait le constat sans que rien ne le prouve.
    await page.click('nav a[href="/catalogue"]');
    await page.getByRole('link', { name: 'Ajouter une recette' }).click();
    await page.getByLabel('Titre').fill('Tarte aux poireaux');
    await page.locator('#ingredient-name-0').fill('Poireaux');
    await page.locator('#ingredient-quantity-0').fill('3');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page).toHaveURL('/catalogue');

    await page.click('nav a[href="/menu"]');
    await page.getByRole('button', { name: 'Réessayer' }).click();

    // Le catalogue ne compte qu'une recette : elle occupe donc les 28 créneaux, et ce compte de
    // PRÉSENCE se gage seul — aucun créneau n'est retombé sur le repli « Recette inconnue ».
    await expect(page.locator('main section')).toHaveCount(14);
    await expect(page.locator('main section li')).toHaveCount(28);
    await expect(page.getByText('Tarte aux poireaux')).toHaveCount(28);
    await expect(page.getByText("Ajoute d'abord des recettes")).toHaveCount(0);
  });

  /**
   * Ce que ce scénario défend depuis toujours, et qui reste vrai : le catalogue vide et le réseau
   * coupé sont deux constats DIFFÉRENTS. Un menu qui accuserait le catalogue d'être vide alors
   * que c'est le réseau qui manque enverrait l'utilisateur créer des recettes qu'il a déjà.
   *
   * Ce qui est RÉVOQUÉ (itération « hors ligne simplifié ») : « et Réessayer le sort de là ».
   * Hors ligne, l'écran n'offre plus aucun bouton — aucun ne peut aboutir — et porte son propre
   * constat, qui nomme le MENU. La sortie existe toujours, mais elle se fait en REVENANT
   * sur l'écran une fois le réseau rétabli : c'est ce que la seconde moitié exerce désormais, à
   * la place du clic sur « Réessayer ».
   */
  test('hors ligne, le menu porte le constat du menu et non celui d’un catalogue vide', async ({
    page,
  }) => {
    // On arrive en `idle`, PUIS on coupe : `page.goto()` recrée le store, donc le commutateur.
    await page.goto('/menu');
    await failReads(page);
    const generer = page.getByRole('button', { name: 'Générer un menu' });
    // GAGE de l'absence affirmée plus bas : ce localisateur-ci trouve bel et bien son bouton
    // avant que la panne ne le retire de l'écran.
    await expect(generer).toHaveCount(1);
    await generer.click();

    // Le constat NOMME l'écran : la lecture qui a échoué est celle du catalogue, mais on n'est
    // pas dans un catalogue — c'est son menu que l'utilisateur venait voir.
    // `exact: true` : sans lui, `getByText` cherche une SOUS-CHAÎNE, et cet écran-ci porte aussi
    // « l’enregistrement du menu n’a pas pu être confirmé ». Les deux constats ne doivent jamais
    // pouvoir se répondre l'un pour l'autre.
    const constat = page.getByText('Aucune connexion — le menu n’a pas pu être chargé.', {
      exact: true,
    });
    await expect(constat).toHaveCount(1);
    // Le constat de l'AUTRE branche, celui du scénario témoin juste au-dessus, reste muet.
    await expect(page.getByText("Ajoute d'abord des recettes")).toHaveCount(0);
    // Aucun bouton : ni « Générer un menu », ni « Réessayer » — dont le TÉMOIN est ce même
    // scénario voisin, où il est bien visible là où le réessai a un sens.
    await expect(generer).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Réessayer' })).toHaveCount(0);

    // SORTIE de l'état, et sans bouton pour la déclencher : revenir sur l'écran rend l'offre de
    // générer. Par les liens, jamais par l'URL — un `goto` recréerait le store, donc le
    // commutateur de panne, et la sortie serait vraie pour de mauvaises raisons.
    await restore(page);
    await page.click('nav a[href="/catalogue"]');
    await page.click('nav a[href="/menu"]');
    await generer.click();

    await expect(page.locator('main section')).toHaveCount(14);
    await expect(page.locator('main section li')).toHaveCount(28);
    await expect(page.getByText('Omelette aux herbes')).toHaveCount(10);
    // Le MÊME localisateur, vu trouver son texte plus haut : plus aucune trace du constat.
    await expect(constat).toHaveCount(0);
  });

  /**
   * TRANCHE 4a — le menu généré s'ENREGISTRE. Le dépôt du mode e2e démarre VIDE : ce qui s'y
   * trouve à la fin du parcours ne peut venir que du parcours lui-même.
   */
  test('générer un menu, puis l’enregistrer', async ({ page }) => {
    await page.goto('/menu');
    await page.getByRole('button', { name: 'Générer un menu' }).click();
    await expect(page.locator('main section')).toHaveCount(14);

    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page.getByText('Menu enregistré')).toHaveCount(1);
  });

  /**
   * Panne d'ÉCRITURE, armée après l'arrivée sur l'écran : `page.goto()` recrée le store, donc le
   * commutateur, et la perdrait. Le constat ne réclame rien — l'écriture est partie, rien ne dit
   * qu'elle est perdue — et le bouton reste la seule porte de sortie.
   */
  test('hors ligne, l’enregistrement n’est pas confirmé ; le réseau rétabli, il l’est', async ({
    page,
  }) => {
    await page.goto('/menu');
    await page.getByRole('button', { name: 'Générer un menu' }).click();
    await expect(page.locator('main section')).toHaveCount(14);

    await failWrites(page);
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    const panne = page.getByText(
      'Aucune connexion — l’enregistrement du menu n’a pas pu être confirmé.',
    );
    await expect(panne).toHaveCount(1);

    // SORTIE de l'état : le réseau revient, le même bouton reprend la main.
    await restore(page);
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page.getByText('Menu enregistré')).toHaveCount(1);
    // Le MÊME localisateur, vu trouver son texte quelques lignes plus haut : plus aucune trace.
    await expect(panne).toHaveCount(0);
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
    // Le menu porte ce MÊME titre en 9 liens : un clic parti avant que la route ait basculé les
    // trouverait encore, et s'en irait sur un lien du menu en croyant prendre celui du catalogue.
    await expect(page.getByRole('heading', { level: 1, name: 'Recettes' })).toBeVisible();
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
    // Le menu n'a pas été rejoué : la quinzaine entière est toujours là. Et les deux AUTRES
    // recettes, que la modification n'a pas touchées, occupent toujours leurs créneaux —
    // 9 + 10 + 9 = 28, soit tous les créneaux comptés juste au-dessus. Aucun n'est donc retombé
    // sur le repli « Recette inconnue », dit par une assertion de PRÉSENCE qui se gage seule
    // plutôt que par un `toHaveCount(0)` sur un localisateur jamais vu trouver son texte.
    await expect(page.locator('main section')).toHaveCount(14);
    await expect(page.locator('main section li')).toHaveCount(28);
    await expect(page.getByText('Omelette aux herbes')).toHaveCount(10);
    await expect(page.getByText('Curry de pois chiches')).toHaveCount(9);
  });
});

/**
 * Centrage vertical d'un état plein écran (constat, état vide) dans la hauteur qui lui est
 * OFFERTE — et non dans sa propre boîte, qui l'épouserait et rendrait la mesure tautologique.
 *
 * La zone offerte va du bord HAUT de l'état au bas de la boîte de contenu de `main`. Ces deux
 * bords viennent de sources différentes, et c'est tout l'intérêt : l'état ne borne que le haut,
 * jamais le bas. Un état qui aurait perdu sa hauteur épouserait ses enfants et se poserait sous
 * l'en-tête, laissant la moitié basse de la page vide — le bas venant de `main`, l'écart entre
 * les deux bords reste alors entier, il se retrouve en totalité SOUS le bloc, et l'égalité des
 * espaces tombe. C'est ce qui empêche la mesure d'être tautologique.
 *
 * Le bloc mesuré est l'union des ENFANTS de l'état : `justify-content: center` les centre dans
 * la zone, et c'est cette position-là que l'œil voit.
 *
 * Cette mesure servait trois surfaces — catalogue vide, recette introuvable, menu sans recette.
 * Une seule a été gardée : la garantie est la même et la chaîne `flex: 1` traversée aussi, donc
 * les deux autres ne pouvaient rougir que là où celle-ci rougit déjà. C'est le menu qui reste,
 * parce que c'est le seul `error` ATTEIGNABLE par un parcours et le seul à qui l'issue #41 donne
 * une provenance — d'où le déménagement de la mesure jusqu'ici, auprès de son unique appelant.
 */
type Centrage = {
  hauteurDuBloc: number;
  espaceAuDessus: number;
  espaceEnDessous: number;
};

async function centrageVertical(etat: Locator): Promise<Centrage> {
  return etat.evaluate((element) => {
    const ecran = element.parentElement as HTMLElement;
    const region = element.closest('main') as HTMLElement;

    // Le haut de la zone est le bord haut de l'état lui-même : ce que l'espacement qui le
    // précède a déjà repoussé est, par construction, hors de la zone offerte. Rien n'est donc
    // à mesurer sur le frère précédent, et le véhicule de cet espacement — marge, `gap` — n'a
    // aucune prise sur le résultat.
    const hautDeLaZone = element.getBoundingClientRect().top;
    // Le bas de la zone se lit sur `main`, PAS sur l'écran : un écran qui a perdu sa hauteur
    // épouse son contenu, et mesurer dans sa boîte rendrait « centré » vrai alors que la moitié
    // basse de la page est vide. La marge basse que l'écran se réserve est retranchée, sans quoi
    // un centrage correct paraîtrait décalé d'autant.
    const basDeLaZone =
      region.getBoundingClientRect().bottom -
      parseFloat(getComputedStyle(region).paddingBottom) -
      parseFloat(getComputedStyle(ecran).paddingBottom);

    const enfants = [...element.children].map((enfant) => enfant.getBoundingClientRect());
    const haut = Math.min(...enfants.map((boite) => boite.top));
    const bas = Math.max(...enfants.map((boite) => boite.bottom));

    return {
      hauteurDuBloc: bas - haut,
      espaceAuDessus: haut - hautDeLaZone,
      espaceEnDessous: basDeLaZone - bas,
    };
  });
}

test.describe('Mise en page du menu', () => {
  /**
   * F5 — `CenteredState` a été écrit pour centrer un constat dans la hauteur restante. Il ne
   * peut le faire que si l'écran qui le contient a une hauteur à distribuer : sans elle, le
   * constat se colle sous l'en-tête et laisse un demi-écran de crème vide sous lui.
   *
   * Issue #41 — l'état `error` était le SEUL à ne pas être centré, alors que `loading`,
   * `unavailable`, `empty` et `notFound` le sont tous. L'écart ne date pas d'une décision : il
   * date du jour où `Page` a pris `flex: 1` et où il y a enfin eu une hauteur à distribuer.
   *
   * C'est le menu qui l'exerce, parce que c'est le seul `error` ATTEIGNABLE par un parcours :
   * un catalogue vide fait refuser la génération. Le commutateur e2e ne sait produire qu'un
   * `RepositoryUnavailableError`, donc l'`error` du catalogue reste hors de portée d'ici.
   */
  test('le menu sans recette centre son constat dans la hauteur offerte', async ({ page }) => {
    await page.goto('/menu?recipes=0');
    await page.getByRole('button', { name: 'Générer un menu' }).click();
    await expect(page.getByRole('alert')).toHaveText(
      "Ajoute d'abord des recettes pour générer un menu.",
    );

    const mesure = await centrageVertical(page.getByRole('alert').locator('..'));

    // Gages : un bloc effondré, ou un bloc qui remplit toute la zone, rendrait « centré » vrai
    // sans que rien ne soit centré.
    expect(mesure.hauteurDuBloc).toBeGreaterThan(0);
    expect(mesure.espaceAuDessus).toBeGreaterThan(0);
    expect(Math.abs(mesure.espaceAuDessus - mesure.espaceEnDessous)).toBeLessThanOrEqual(1);
  });
});

/**
 * TRANCHE 3 — le menu MÈNE aux fiches. La provenance vit dans l'URL (`?depuis=menu`) : c'est
 * elle, et rien d'autre, qui fait dire « ← Menu » au retour de la fiche.
 *
 * Piège de nommage Playwright : `name` cherche une SOUS-CHAÎNE. « Menu » trouverait aussi
 * l'onglet du bas (`nav a[href="/menu"]`), et « ← Recette » trouve « ← Recettes » — d'où
 * `exact: true` partout où la distinction porte le scénario.
 */
test.describe('Du menu à la fiche recette', () => {
  const retourMenu = (page: Page) => page.getByRole('link', { name: '← Menu', exact: true });
  const retourRecettes = (page: Page) => page.getByRole('link', { name: '← Recettes' });

  test('ouvrir une recette du menu, puis revenir au menu tel qu’il était', async ({ page }) => {
    await page.goto('/menu');
    await page.getByRole('button', { name: 'Générer un menu' }).click();
    await expect(page.locator('main section')).toHaveCount(14);

    // Le premier créneau du premier jour : le tirage du mode e2e est déterministe, c'est
    // « Omelette aux herbes ». Scopé au créneau, sinon le titre est trouvé 10 fois.
    const premierJour = page.locator('main section').first().locator('li');
    await premierJour.nth(0).getByRole('link', { name: 'Omelette aux herbes' }).click();

    await expect(page).toHaveURL('/catalogue/recipe-omelette-herbes?depuis=menu');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Omelette aux herbes' }),
    ).toBeVisible();

    // La fiche nomme sa provenance. L'absence de « ← Recettes » a son TÉMOIN à la fin de ce
    // même scénario, où la MÊME fiche, ouverte depuis le catalogue, le porte bel et bien.
    await expect(retourMenu(page)).toHaveCount(1);
    await expect(retourRecettes(page)).toHaveCount(0);

    await retourMenu(page).click();
    await expect(page).toHaveURL('/menu');

    // Le menu est retrouvé TEL QUEL : ni régénéré, ni perdu. Navigation cliente de bout en
    // bout — un `goto` recréerait le store, donc le menu, et il n'y aurait rien à retrouver.
    await expect(page.getByRole('button', { name: 'Régénérer' })).toBeVisible();
    await expect(page.locator('main section')).toHaveCount(14);
    await expect(page.locator('main section li')).toHaveCount(28);

    // La MÊME fiche, atteinte depuis le catalogue : la provenance change, le retour aussi.
    await page.click('nav a[href="/catalogue"]');
    // Le menu porte ce MÊME titre en 10 liens : un clic parti avant que la route ait basculé les
    // trouverait encore, et s'en irait sur un lien du menu en croyant prendre celui du catalogue.
    await expect(page.getByRole('heading', { level: 1, name: 'Recettes' })).toBeVisible();
    await page.getByRole('link', { name: 'Omelette aux herbes' }).click();
    await expect(page).toHaveURL('/catalogue/recipe-omelette-herbes');
    await expect(retourRecettes(page)).toHaveCount(1);
    await expect(retourMenu(page)).toHaveCount(0);
  });

  /**
   * LE cas du rechargement. Un état de navigation (`Link state`) serait perdu ici, et le retour
   * retomberait sur le catalogue au milieu d'un parcours qui vient du menu. Dans l'URL, la
   * provenance traverse le rechargement — et le retour MÈNE bien au menu, sur un store neuf qui
   * n'a plus de menu généré : l'écran le propose à nouveau au lieu d'être une impasse.
   */
  test('la provenance survit à un rechargement de la fiche', async ({ page }) => {
    await page.goto('/menu');
    await page.getByRole('button', { name: 'Générer un menu' }).click();
    const premierJour = page.locator('main section').first().locator('li');
    await premierJour.nth(0).getByRole('link', { name: 'Omelette aux herbes' }).click();
    await expect(retourMenu(page)).toHaveCount(1);

    await page.reload();

    await expect(
      page.getByRole('heading', { level: 1, name: 'Omelette aux herbes' }),
    ).toBeVisible();
    await expect(retourMenu(page)).toHaveCount(1);
    await expect(retourRecettes(page)).toHaveCount(0);

    await retourMenu(page).click();
    await expect(page).toHaveURL('/menu');
    await expect(page.getByRole('button', { name: 'Générer un menu' })).toBeVisible();
  });

  /**
   * La provenance traverse le FORMULAIRE. Elle se perdait dès l'aller — le lien « Modifier » ne
   * la portait pas — donc la fiche rendue après un enregistrement disait « ← Recettes » et
   * renvoyait au catalogue quelqu'un qui venait du menu.
   *
   * Navigation CLIENTE de bout en bout : un `goto` recréerait le store, donc le menu, et le
   * retour n'aurait plus rien à retrouver.
   */
  test('modifier une recette ouverte depuis le menu, puis revenir au menu', async ({ page }) => {
    await page.goto('/menu');
    await page.getByRole('button', { name: 'Générer un menu' }).click();
    await expect(page.locator('main section')).toHaveCount(14);

    const premierJour = page.locator('main section').first().locator('li');
    await premierJour.nth(0).getByRole('link', { name: 'Omelette aux herbes' }).click();
    await expect(page).toHaveURL('/catalogue/recipe-omelette-herbes?depuis=menu');

    await page.getByRole('link', { name: 'Modifier' }).click();
    await expect(page).toHaveURL('/catalogue/recipe-omelette-herbes/modifier?depuis=menu');
    // Les DEUX sorties du formulaire gardent le fil. Celle-ci n'est pas cliquée — le scénario
    // suit l'autre — mais son adresse se lit ici. `exact` : « ← Recettes » répondrait sinon.
    await expect(page.getByRole('link', { name: '← Recette', exact: true })).toHaveAttribute(
      'href',
      '/catalogue/recipe-omelette-herbes?depuis=menu',
    );

    await page.getByLabel('Titre').fill('Omelette aux fines herbes');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    // La fiche d'arrivée montre la modification ET sait encore d'où l'on vient. L'absence de
    // « ← Recettes » a son TÉMOIN dans le scénario voisin, où la même fiche, ouverte depuis le
    // catalogue, le porte bel et bien.
    await expect(page).toHaveURL('/catalogue/recipe-omelette-herbes?depuis=menu');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Omelette aux fines herbes' }),
    ).toBeVisible();
    await expect(retourMenu(page)).toHaveCount(1);
    await expect(retourRecettes(page)).toHaveCount(0);

    await retourMenu(page).click();
    await expect(page).toHaveURL('/menu');

    // Le menu est retrouvé TEL QUEL, et il porte le nouveau titre : la boucle est bouclée.
    await expect(page.getByRole('button', { name: 'Régénérer' })).toBeVisible();
    await expect(page.locator('main section')).toHaveCount(14);
    await expect(page.getByText('Omelette aux fines herbes')).toHaveCount(10);
  });

  /**
   * Le formulaire SANS recette — ici parce que la lecture tombe en panne — est le seul écran du
   * parcours qui n'offre rien d'autre que sa sortie. Elle disait « ← Recettes » et ramenait au
   * catalogue, alors que l'URL portait encore `?depuis=menu` : le fil coupé là où l'utilisateur
   * n'a même pas de formulaire pour se rattraper.
   *
   * La panne est un état du STORE : armée une fois sur la fiche, et tout le parcours se fait par
   * les liens — un `page.goto()` recréerait le store, donc le commutateur, et la lecture
   * réussirait. Les deux libellés se cherchent en `exact` : « ← Recettes » répondrait à
   * « ← Recette », et « Menu » à l'onglet du bas.
   */
  test('la lecture en panne sur le formulaire venu du menu ramène au menu', async ({ page }) => {
    await page.goto('/menu');
    await page.getByRole('button', { name: 'Générer un menu' }).click();
    await expect(page.locator('main section')).toHaveCount(14);

    const premierJour = page.locator('main section').first().locator('li');
    await premierJour.nth(0).getByRole('link', { name: 'Omelette aux herbes' }).click();
    await expect(page).toHaveURL('/catalogue/recipe-omelette-herbes?depuis=menu');

    await failReads(page);
    await page.getByRole('link', { name: 'Modifier' }).click();
    await expect(page).toHaveURL('/catalogue/recipe-omelette-herbes/modifier?depuis=menu');
    await expect(
      page.getByText('Aucune connexion — la recette n’a pas pu être chargée.'),
    ).toHaveCount(1);

    // L'URL dit d'où l'on vient, l'écran aussi. L'absence de « ← Recettes » a son TÉMOIN dans
    // les scénarios voisins, où la même fiche ouverte depuis le catalogue le porte bel et bien.
    await expect(retourMenu(page)).toHaveCount(1);
    await expect(retourRecettes(page)).toHaveCount(0);

    await retourMenu(page).click();
    await expect(page).toHaveURL('/menu');

    // La sortie ramène sur quelque chose, mais pas sur le menu : la relecture du catalogue
    // échoue elle aussi, et l'écran DEVIENT le constat — celui du MENU, pas celui de la page
    // des recettes. Rien de faux n'est affiché : des titres qu'on ne peut plus vérifier ne sont
    // pas montrés.
    // `exact: true` : sans lui, `getByText` cherche une SOUS-CHAÎNE, et cet écran-ci porte aussi
    // « l’enregistrement du menu n’a pas pu être confirmé ».
    const constat = page.getByText('Aucune connexion — le menu n’a pas pu être chargé.', {
      exact: true,
    });
    await expect(constat).toHaveCount(1);
    // Aucun bouton : ni « Régénérer », ni « Réessayer » ne peuvent aboutir sans réseau. Le
    // TÉMOIN de ces absences est le scénario voisin « modifier une recette ouverte depuis le
    // menu, puis revenir au menu », où le même localisateur trouve bien son bouton — et la
    // sortie ci-dessous le retrouve à son tour.
    await expect(page.getByRole('button', { name: 'Régénérer' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Réessayer' })).toHaveCount(0);
    await expect(page.locator('main section')).toHaveCount(0);

    // SORTIE de l'état, et sans bouton pour la déclencher : le menu n'a jamais quitté le store,
    // et revenir sur l'écran relance la lecture. Par les liens, jamais par l'URL — un `goto`
    // recréerait le store, donc effacerait le menu au lieu de le retrouver.
    await restore(page);
    await page.click('nav a[href="/catalogue"]');
    await page.click('nav a[href="/menu"]');

    await expect(page.getByRole('button', { name: 'Régénérer' })).toBeVisible();
    await expect(page.locator('main section')).toHaveCount(14);
    await expect(page.getByText('Omelette aux herbes')).toHaveCount(10);
    // Le MÊME localisateur, vu trouver son texte plus haut : plus aucune trace du constat.
    await expect(constat).toHaveCount(0);
  });
});
