import { expect, test, type Locator, type Page } from '@playwright/test';

import { failWrites } from './support/e2e-controls';

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
 */

type Atteignabilite = {
  largeur: number;
  hauteur: number;
  defilement: number;
  obstacle: string | null;
};

/**
 * `document.elementFromPoint` au centre de la cible : il rend l'élément réellement PEINT à ce
 * point, donc celui que le doigt toucherait. `obstacle` est nul quand c'est la cible elle-même
 * (ou un de ses descendants — une icône, un span), et nomme le coupable sinon.
 *
 * `largeur`/`hauteur` sont rendues pour gager la mesure : `elementFromPoint` sur une boîte de
 * taille nulle rendrait un obstacle tout aussi nul, et le test serait vert sans rien avoir vu.
 */
async function atteignabilite(cible: Locator): Promise<Atteignabilite> {
  return cible.evaluate((element) => {
    const boite = element.getBoundingClientRect();
    const x = boite.left + boite.width / 2;
    const y = boite.top + boite.height / 2;
    const auCentre = document.elementFromPoint(x, y);
    const atteinte = auCentre !== null && (auCentre === element || element.contains(auCentre));
    const decrire = (noeud: Element) =>
      `<${noeud.tagName.toLowerCase()}> « ${(noeud.textContent ?? '').trim().slice(0, 40)} »`;

    return {
      largeur: boite.width,
      hauteur: boite.height,
      defilement: window.scrollY,
      obstacle: atteinte
        ? null
        : auCentre === null
          ? `rien de peint au point (${Math.round(x)}, ${Math.round(y)}) — la cible est hors du viewport`
          : decrire(auCentre),
    };
  });
}

/**
 * Hauteur offerte au défilement contre hauteur du viewport. Les écrans qui s'en servent tiennent
 * tous dans l'écran avec le jeu de départ e2e : l'égalité y signifie « aucun défilement », et
 * tout écart est du défilement MORT — des pixels de page que rien n'occupe, et qui décalent vers
 * le bas ce qui devrait tenir à l'écran. Le jour où un jeu de départ dépassera l'écran, c'est le
 * scénario qu'il faudra revoir, pas la mesure.
 */
async function defilementDeLaPage(page: Page): Promise<{ offerte: number; viewport: number }> {
  return page.evaluate(() => ({
    offerte: document.documentElement.scrollHeight,
    viewport: document.documentElement.clientHeight,
  }));
}

/**
 * Contenu peint d'un onglet — icône et libellé — contre la boîte de CONTENU du <nav>.
 *
 * Depuis que la tab bar déclare `height: var(--tabbar-h)`, sa boîte ne dit plus rien de ce
 * qu'elle contient : elle vaut la variable, débordement ou pas. Mesurer cette boîte-là, comme le
 * font les deux autres scénarios qui touchent la tab bar, ne peut donc RIEN révéler d'un contenu
 * trop grand pour elle. Le budget est serré : 55px de boîte, moins 16px de padding d'onglet,
 * moins 22px d'icône et 4px d'interstice, pour un libellé à 11px dont l'interligne dépend de la
 * police que la machine résout pour `system-ui`.
 *
 * Ce sont les boîtes PEINTES qui sont mesurées, et non la somme des tailles déclarées : l'onglet
 * est une colonne flex, donc l'icône se laisse comprimer avant que rien ne déborde — mesuré,
 * elle tombe de 22px à 7px quand le libellé passe à 24px, et à 0 au-delà. Le débordement ne
 * commence qu'une fois l'icône épuisée, quand l'interligne du libellé excède à lui seul la
 * boîte ; rien ne le rogne alors (`overflow` est visible), il se voit à l'écran.
 *
 * Les DEUX marges sont rendues parce que `justify-content: center` répartit l'excès des deux
 * côtés : le bas mord sous le viewport, le haut sort par-dessus la bordure dans le contenu. Un
 * débordement par le haut ne fait pas défiler la page — aucun autre scénario ne le verrait.
 */
type ContenuDOnglet = {
  onglet: string;
  hauteurDuBloc: number;
  margeAuDessus: number;
  margeEnDessous: number;
};

async function contenuDesOnglets(
  tabBar: Locator,
): Promise<{ hauteurDeLaBoite: number; onglets: ContenuDOnglet[] }> {
  return tabBar.evaluate((nav) => {
    const style = getComputedStyle(nav);
    const boite = nav.getBoundingClientRect();
    const hautDeLaBoite =
      boite.top + parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop);
    const basDeLaBoite =
      boite.bottom - parseFloat(style.borderBottomWidth) - parseFloat(style.paddingBottom);

    return {
      hauteurDeLaBoite: basDeLaBoite - hautDeLaBoite,
      onglets: [...nav.children].map((onglet) => {
        const enfants = [...onglet.children].map((enfant) => enfant.getBoundingClientRect());
        const haut = Math.min(...enfants.map((rectangle) => rectangle.top));
        const bas = Math.max(...enfants.map((rectangle) => rectangle.bottom));

        return {
          onglet: (onglet.textContent ?? '').trim(),
          hauteurDuBloc: bas - haut,
          margeAuDessus: haut - hautDeLaBoite,
          margeEnDessous: basDeLaBoite - bas,
        };
      }),
    };
  });
}

/**
 * Centrage vertical d'un état plein écran (constat, état vide) dans la hauteur qui lui est
 * OFFERTE — et non dans sa propre boîte, qui l'épouserait et rendrait la mesure tautologique.
 *
 * La zone offerte va du bas de ce qui précède l'état (en-tête ou lien retour, marge comprise)
 * au bas de la boîte de contenu de l'écran. Le bloc mesuré est l'union des ENFANTS de l'état :
 * `justify-content: center` les centre dans la zone, et c'est cette position-là que l'œil voit.
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

    const precedent = element.previousElementSibling as HTMLElement;
    const hautDeLaZone =
      precedent.getBoundingClientRect().bottom +
      parseFloat(getComputedStyle(precedent).marginBottom);
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

test.describe('Mise en page', () => {
  test('le catalogue tient dans l’écran, sans aucun défilement', async ({ page }) => {
    await page.goto('/catalogue');
    await expect(page.getByRole('heading', { level: 1, name: 'Recettes' })).toBeVisible();

    // Le gage de cette mesure est le `toBeVisible()` du <h1> ci-dessus, et lui seul : sur une
    // page non peinte, `scrollHeight` et `clientHeight` vaudraient tous deux la hauteur du
    // viewport, et l'égalité serait vraie sans que rien n'ait été rendu.
    const mesure = await defilementDeLaPage(page);
    expect(mesure.offerte).toBe(mesure.viewport);
  });

  test('le détail d’une recette tient dans l’écran, sans aucun défilement', async ({ page }) => {
    await page.goto('/catalogue/recipe-gratin-dauphinois');
    await expect(page.getByRole('heading', { level: 1, name: 'Gratin dauphinois' })).toBeVisible();

    const mesure = await defilementDeLaPage(page);
    expect(mesure.offerte).toBe(mesure.viewport);
  });

  test('le menu, avant génération, tient dans l’écran, sans aucun défilement', async ({ page }) => {
    await page.goto('/menu');
    await expect(page.getByRole('heading', { level: 1, name: 'Menu' })).toBeVisible();

    const mesure = await defilementDeLaPage(page);
    expect(mesure.offerte).toBe(mesure.viewport);
  });

  test('le lien d’ajout du catalogue est atteignable à l’ouverture', async ({ page }) => {
    await page.goto('/catalogue');
    const lien = page.getByRole('link', { name: 'Ajouter une recette' });
    await expect(lien).toBeVisible();

    const mesure = await atteignabilite(lien);
    expect(mesure.largeur).toBeGreaterThan(0);
    expect(mesure.hauteur).toBeGreaterThan(0);
    expect(mesure.defilement).toBe(0);
    expect(mesure.obstacle).toBeNull();
  });

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

    // `fill()` fait défiler le champ dans la vue : on revient au repos, la position où l'écran
    // s'ouvre. `defilement` est asserté à 0 juste en dessous — c'est ce qui prouve que la mesure
    // porte bien sur l'écran au repos et non sur une page qu'un défilement a déjà rattrapée.
    await page.evaluate(() => window.scrollTo(0, 0));

    const mesure = await atteignabilite(bouton);
    expect(mesure.largeur).toBeGreaterThan(0);
    expect(mesure.hauteur).toBeGreaterThan(0);
    expect(mesure.defilement).toBe(0);
    expect(mesure.obstacle).toBeNull();
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
   * scénario reste vert. Cette valeur a un plancher, et il est tenu ailleurs : par « le contenu
   * de la tab bar tient dans sa boîte », qui mesure le contenu et non la boîte.
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
   * reste vrai pendant que la tab bar flotte au milieu de l'écran. Les trois scénarios de
   * défilement ci-dessus ne peuvent donc PAS voir ce défaut — celui-ci le peut.
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

    // Gage : une tab bar effondrée poserait son bas n'importe où sans que rien ne le dise.
    expect(mesure.hauteur).toBeGreaterThan(0);
    expect(mesure.bas).toBe(mesure.viewport);
  });

  /**
   * Le pendant du scénario ci-dessus : celui-là gage la POSITION de la tab bar, celui-ci gage
   * qu'elle contient ce qu'elle affiche. C'est aussi le seul endroit où la valeur de `--tabbar-h`
   * est confrontée à autre chose qu'elle-même — il lui impose un PLANCHER, celui du contenu des
   * onglets.
   */
  test('le contenu de la tab bar tient dans sa boîte', async ({ page }) => {
    await page.goto('/catalogue');
    const tabBar = page.getByRole('navigation');
    await expect(tabBar).toBeVisible();

    const mesure = await contenuDesOnglets(tabBar);

    // Gages : une boîte effondrée, un bloc effondré ou une tab bar sans onglet rendraient les
    // comparaisons ci-dessous vraies sans rien avoir mesuré — `0 >= 0`, ou une boucle vide.
    expect(mesure.hauteurDeLaBoite).toBeGreaterThan(0);
    expect(mesure.onglets).toHaveLength(2);

    for (const onglet of mesure.onglets) {
      expect(onglet.hauteurDuBloc, onglet.onglet).toBeGreaterThan(0);
      expect(onglet.margeAuDessus, onglet.onglet).toBeGreaterThanOrEqual(0);
      expect(onglet.margeEnDessous, onglet.onglet).toBeGreaterThanOrEqual(0);
    }
  });

  /**
   * F1 — le constat d'échec voyage-t-il AVEC la commande ? Le bouton remonte avec la barre
   * collante ; un message resté à sa position naturelle finit sous le pli, et l'utilisateur
   * qui vient de cliquer ne voit rien — il reclique. Même famille que l'échec d'ajout
   * silencieux de FR-3.
   *
   * `toBeVisible()` ne suffit pas ici : il ne regarde pas si un autre élément recouvre la
   * cible, ni si elle est hors du viewport. Seule la mesure de position le dit.
   */
  test('le constat d’échec d’enregistrement est visible sans défiler', async ({ page }) => {
    // On arme la panne AVANT d'entrer dans le formulaire, et on y entre par le lien : un
    // `page.goto()` recréerait le store, donc le commutateur, et l'écriture réussirait.
    await page.goto('/catalogue');
    await failWrites(page);
    await page.getByRole('link', { name: 'Ajouter une recette' }).click();

    await page.getByLabel('Titre').fill('Tarte aux poireaux');
    await page.locator('#ingredient-name-0').fill('Poireaux');
    await page.locator('#ingredient-quantity-0').fill('3');

    await page.getByRole('button', { name: 'Enregistrer' }).click();

    const constat = page.getByText('Impossible d’enregistrer la recette.');
    await expect(constat).toBeVisible();

    // Retour au repos : l'utilisateur n'a pas défilé, il a cliqué une commande qui était là.
    await page.evaluate(() => window.scrollTo(0, 0));

    const mesure = await atteignabilite(constat);
    expect(mesure.largeur).toBeGreaterThan(0);
    expect(mesure.hauteur).toBeGreaterThan(0);
    expect(mesure.defilement).toBe(0);
    expect(mesure.obstacle).toBeNull();
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
   * F5 — `CenteredState` a été écrit pour centrer un constat dans la hauteur restante. Il ne
   * peut le faire que si l'écran qui le contient a une hauteur à distribuer : sans elle, le
   * constat se colle sous l'en-tête et laisse un demi-écran de crème vide sous lui.
   */
  test('le catalogue vide centre son constat dans la hauteur offerte', async ({ page }) => {
    await page.goto('/catalogue?recipes=0');
    await expect(page.getByText('Aucune recette')).toBeVisible();

    const mesure = await centrageVertical(page.getByText('Aucune recette').locator('..'));

    // Gages : un bloc effondré, ou un bloc qui remplit toute la zone, rendrait « centré » vrai
    // sans que rien ne soit centré.
    expect(mesure.hauteurDuBloc).toBeGreaterThan(0);
    expect(mesure.espaceAuDessus).toBeGreaterThan(0);
    expect(Math.abs(mesure.espaceAuDessus - mesure.espaceEnDessous)).toBeLessThanOrEqual(1);
  });

  test('une recette introuvable centre son constat dans la hauteur offerte', async ({ page }) => {
    await page.goto('/catalogue/recette-qui-nexiste-pas');
    await expect(page.getByText('Recette introuvable')).toBeVisible();

    const mesure = await centrageVertical(page.getByText('Recette introuvable').locator('..'));

    expect(mesure.hauteurDuBloc).toBeGreaterThan(0);
    expect(mesure.espaceAuDessus).toBeGreaterThan(0);
    expect(Math.abs(mesure.espaceAuDessus - mesure.espaceEnDessous)).toBeLessThanOrEqual(1);
  });
});
