import { CHIFFRES_SIGNIFICATIFS_FIABLES } from '../entities/ingredient';

function sansBruitFlottant(valeur: number): number {
  return Number(valeur.toPrecision(CHIFFRES_SIGNIFICATIFS_FIABLES));
}

export function arrondiAuSuperieur(valeur: number, decimales: number): number {
  const echelle = 10 ** decimales;
  return Math.ceil(sansBruitFlottant(valeur * echelle)) / echelle;
}
