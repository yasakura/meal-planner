import { type Convive } from '../entities/convive';
import {
  BASES_PAR_GRANDE_UNITE,
  UNITE_DE_BASE,
  UNITS,
  enUniteDeBase,
  estUneGrandeUnite,
  type Ingredient,
  type Unit,
} from '../entities/ingredient';
import { type Menu } from '../entities/menu';
import { type Recipe } from '../entities/recipe';
import { arrondiAuSuperieur } from '../lib/arrondi';
import { effectifDuRepas } from './effectif-du-repas';
import { effectiveIngredients } from './effective-ingredients';

const DECIMALES_DE_LA_GRANDE_UNITE = 2;

export type LigneDeCourses = {
  readonly name: string;
  readonly quantity: number;
  readonly unit: Unit;
};

export type ListeDeCourses = {
  readonly lignes: readonly LigneDeCourses[];
};

type Cumul = {
  readonly name: string;
  readonly unite: Unit;
  readonly bases: number;
};

function cleDuNom(name: string): string {
  return name.replace(/\s+/g, ' ').toLocaleLowerCase('fr');
}

function grandeUniteDe(unite: Unit): Unit | undefined {
  return UNITS.find((autre) => estUneGrandeUnite(autre) && UNITE_DE_BASE[autre] === unite);
}

function ligneDe(cumul: Cumul): LigneDeCourses {
  const bases = arrondiAuSuperieur(cumul.bases, 0);
  const grandeUnite = grandeUniteDe(cumul.unite);
  if (grandeUnite !== undefined && bases >= BASES_PAR_GRANDE_UNITE) {
    return {
      name: cumul.name,
      quantity: arrondiAuSuperieur(bases / BASES_PAR_GRANDE_UNITE, DECIMALES_DE_LA_GRANDE_UNITE),
      unit: grandeUnite,
    };
  }
  return { name: cumul.name, quantity: bases, unit: cumul.unite };
}

function parNomPuisUnite(un: Cumul, autre: Cumul): number {
  const parNom = un.name.localeCompare(autre.name, 'fr');
  return parNom === 0 ? un.unite.localeCompare(autre.unite) : parNom;
}

function cumuler(cumuls: Map<string, Map<Unit, Cumul>>, mesure: Ingredient): void {
  const cle = cleDuNom(mesure.name);
  const unite = UNITE_DE_BASE[mesure.unit];
  const parUnite = cumuls.get(cle) ?? new Map<Unit, Cumul>();
  const cumul = parUnite.get(unite) ?? { name: mesure.name, unite, bases: 0 };
  parUnite.set(unite, {
    ...cumul,
    bases: cumul.bases + enUniteDeBase(mesure.quantity, mesure.unit),
  });
  cumuls.set(cle, parUnite);
}

export function listeDeCourses(
  menu: Menu,
  recipes: readonly Recipe[],
  foyer: readonly Convive[],
): ListeDeCourses {
  const recetteParId = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const cumuls = new Map<string, Map<Unit, Cumul>>();

  for (const repas of menu.repas) {
    const effectif = effectifDuRepas(repas, foyer);
    if (effectif === 0) continue;
    for (const slot of repas.slots) {
      const recipe = recetteParId.get(slot.recipeId);
      const mesures = recipe === undefined ? null : effectiveIngredients(recipe, effectif);
      if (mesures === null) continue;
      for (const mesure of mesures) cumuler(cumuls, mesure);
    }
  }

  const lignes = [...cumuls.values()]
    .flatMap((parUnite) => [...parUnite.values()])
    .sort(parNomPuisUnite)
    .map(ligneDe);

  return { lignes };
}
