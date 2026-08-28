import { type Unit } from '../../../domain/entities/ingredient';

const SEPARATEUR_DECIMAL_FRANCAIS = ',';

const PIECE_AU_SINGULIER = 'pièce';

const PIECE_AU_PLURIEL = 'pièces';

function nombreEnFrancais(quantity: number): string {
  return String(quantity).replace('.', SEPARATEUR_DECIMAL_FRANCAIS);
}

function uniteAccordee(quantity: number, unit: Unit): string {
  if (unit !== 'piece') return unit;
  return quantity >= 2 ? PIECE_AU_PLURIEL : PIECE_AU_SINGULIER;
}

export function quantiteAffichee(quantity: number, unit: Unit): string {
  return `${nombreEnFrancais(quantity)} ${uniteAccordee(quantity, unit)}`;
}
