import {
  BASES_PAR_GRANDE_UNITE,
  LIMITE_DU_COMPTE_JUSTE,
  UNITE_DE_BASE,
  createIngredient,
  enUniteDeBase,
  estUneGrandeUnite,
  type Ingredient,
  type Unit,
} from '../entities/ingredient';
import { type Recipe } from '../entities/recipe';
import { arrondiAuSuperieur } from '../lib/arrondi';

const DECIMALES_DE_LA_GRANDE_UNITE = 2;

function besoinEnUniteDeBase(ingredient: Ingredient, facteur: number): number | null {
  const besoin = enUniteDeBase(ingredient.quantity, ingredient.unit) * facteur;
  if (besoin >= LIMITE_DU_COMPTE_JUSTE) return null;
  return arrondiAuSuperieur(besoin, 0);
}

function mesureLisible(bases: number, unit: Unit): { quantity: number; unit: Unit } {
  if (estUneGrandeUnite(unit) && bases >= BASES_PAR_GRANDE_UNITE) {
    const quantity = arrondiAuSuperieur(
      bases / BASES_PAR_GRANDE_UNITE,
      DECIMALES_DE_LA_GRANDE_UNITE,
    );
    return { quantity, unit };
  }
  return { quantity: bases, unit: UNITE_DE_BASE[unit] };
}

function sansFractionDePiece(ingredient: Ingredient): Ingredient {
  if (ingredient.unit !== 'piece') return ingredient;
  return createIngredient({
    ...ingredient,
    quantity: arrondiAuSuperieur(ingredient.quantity, 0),
  });
}

function mesureDe(ingredient: Ingredient, facteur: number): Ingredient | null {
  const besoin = besoinEnUniteDeBase(ingredient, facteur);
  if (besoin === null) return null;
  return createIngredient({
    name: ingredient.name,
    ...mesureLisible(besoin, ingredient.unit),
  });
}

export function effectiveIngredients(recipe: Recipe, convivesCible: number): Ingredient[] | null {
  if (!Number.isInteger(convivesCible) || convivesCible < 1) {
    throw new Error('Le nombre de personnes doit être un entier positif');
  }

  if (convivesCible === recipe.convivesReference) {
    return recipe.ingredients.map(sansFractionDePiece);
  }

  const facteur = convivesCible / recipe.convivesReference;

  const mesures: Ingredient[] = [];
  for (const ingredient of recipe.ingredients) {
    const mesure = mesureDe(ingredient, facteur);
    if (mesure === null) return null;
    mesures.push(mesure);
  }
  return mesures;
}
