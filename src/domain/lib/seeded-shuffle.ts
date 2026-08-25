import { elementAt } from './element-at';

const GRAINE = 0x9e3779b9;

function suiteDeterministe(graine: number): () => number {
  let etat = graine;
  return () => {
    etat = (etat + 0x6d2b79f5) | 0;
    let tirage = Math.imul(etat ^ (etat >>> 15), 1 | etat);
    tirage = (tirage + Math.imul(tirage ^ (tirage >>> 7), 61 | tirage)) ^ tirage;
    return ((tirage ^ (tirage >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: readonly T[]): T[] {
  const melange = [...items];
  const tirageSuivant = suiteDeterministe(GRAINE);
  for (let rang = melange.length - 1; rang > 0; rang -= 1) {
    const cible = Math.floor(tirageSuivant() * (rang + 1));
    const retenu = elementAt(melange, rang);
    melange[rang] = elementAt(melange, cible);
    melange[cible] = retenu;
  }
  return melange;
}
