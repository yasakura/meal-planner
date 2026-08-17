import { type Convive } from '../../domain/entities/convive';
import { type Recipe } from '../../domain/entities/recipe';
import { E2E_CONVIVES, E2E_RECIPES } from './e2e-fixtures';

export type E2eSeed = {
  convives: Convive[];
  recipes: Recipe[];
};

/**
 * État de départ demandé par l'URL : `?convives=2&recipes=0` charge les 2 premiers convives et
 * aucune recette. C'est un COMPTEUR et non une liste d'ids, parce que ce qu'un scénario a
 * besoin de choisir, c'est un cardinal — « une liste vide », « une seule ligne », « un foyer
 * complet ». Nommer les fixtures dans l'URL rendrait chaque scénario dépendant du contenu du
 * jeu de départ, pas seulement de sa taille.
 *
 * Paramètre absent → tout le jeu, pour qu'une visite nue montre une application peuplée.
 *
 * Une valeur qui n'est pas un entier positif est IGNORÉE et retombe sur le défaut, jamais
 * convertie : `Number('abc')` vaut NaN, `slice(0, NaN)` rend un tableau vide, et le scénario
 * verrait un état vide fabriqué par sa propre faute de frappe — le faux signal exact que ce
 * projet refuse partout ailleurs.
 */
export function readE2eSeed(search: string): E2eSeed {
  const params = new URLSearchParams(search);
  return {
    convives: [...E2E_CONVIVES].slice(0, countIn(params, 'convives', E2E_CONVIVES.length)),
    recipes: [...E2E_RECIPES].slice(0, countIn(params, 'recipes', E2E_RECIPES.length)),
  };
}

function countIn(params: URLSearchParams, name: string, fallback: number): number {
  const raw = params.get(name);
  if (raw === null || !/^\d+$/.test(raw)) return fallback;
  return Number(raw);
}
