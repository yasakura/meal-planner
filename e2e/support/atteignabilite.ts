import { expect, type Locator } from '@playwright/test';

/**
 * Mesure d'ATTEIGNABILITÉ AU REPOS, partagée par les scénarios qui posent une commande ou un
 * constat sous une barre collante (issues #32 et #37).
 *
 * Extrait d'un `layout.spec.ts` aujourd'hui supprimé, quand la route de modification de recette
 * a eu besoin de la même mesure. Le sens d'« atteignable » — le retour au repos, la mesure, et
 * ses deux assertions — vit ICI et nulle part ailleurs, pour la même raison : quatre copies du
 * même bloc, c'était quatre définitions libres de diverger.
 *
 * Ni la RTL ni les autres scénarios ne peuvent voir ce défaut : la RTL ignore la mise en page,
 * et Playwright fait défiler l'élément dans la vue avant de cliquer. Les deux « cliquent » un
 * élément que l'utilisateur ne peut pas atteindre.
 */
export type Atteignabilite = {
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
 * Ce gage n'est PAS asserté par `attendreAtteignable` — voir ci-dessous —, il reste à la charge
 * de l'appelant chez qui il est encore vivant.
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
 * « Atteignable » en un seul endroit : retour au repos, mesure, et les deux assertions qui la
 * portent. Le retour en haut fait partie de la définition — `fill()` et `click()` font défiler
 * leur cible dans la vue, donc mesurer sans revenir à 0 mesurerait une page que Playwright a
 * déjà rattrapée, jamais l'écran tel qu'il s'ouvre. `defilement` asserté à 0 est ce qui prouve
 * que ce retour a bien eu lieu.
 *
 * Ne sont assertés ici que `defilement` et `obstacle`, et c'est délibéré : `largeur > 0` /
 * `hauteur > 0` placés APRÈS un `toBeVisible()` ne peuvent jamais rougir, puisque `toBeVisible()`
 * exige déjà une boîte englobante non vide (vérifié : sur une cible forcée à 0×0, il tombe). Là
 * où le gage n'est PAS acquis — une cible seulement gagée par `toBeEnabled()`, qui n'implique
 * aucune boîte —, l'appelant les assert sur la mesure rendue, en disant pourquoi.
 */
export async function attendreAtteignable(cible: Locator): Promise<Atteignabilite> {
  await cible.page().evaluate(() => window.scrollTo(0, 0));

  const mesure = await atteignabilite(cible);
  expect(mesure.defilement).toBe(0);
  expect(mesure.obstacle).toBeNull();

  return mesure;
}
