import { type Locator } from '@playwright/test';

/**
 * Mesure d'ATTEIGNABILITÉ AU REPOS, partagée par les scénarios qui posent une commande ou un
 * constat sous une barre collante (issues #32 et #37).
 *
 * Extrait de `layout.spec.ts` quand la route de modification de recette a eu besoin de la même
 * mesure : dupliquer ce bloc aurait créé deux filets divergents. Aucune assertion n'a bougé au
 * passage — seul le lieu de la fonction change.
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
 */
export async function atteignabilite(cible: Locator): Promise<Atteignabilite> {
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
