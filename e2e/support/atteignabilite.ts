import { expect, type Locator } from '@playwright/test';

export type Atteignabilite = {
  largeur: number;
  hauteur: number;
  defilement: number;
  obstacle: string | null;
};

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

export async function attendreAtteignable(cible: Locator): Promise<Atteignabilite> {
  await cible.page().evaluate(() => window.scrollTo(0, 0));

  const mesure = await atteignabilite(cible);
  expect(mesure.defilement).toBe(0);
  expect(mesure.obstacle).toBeNull();

  return mesure;
}
