import { type Convive } from '../../domain/entities/convive';
import { type Recipe } from '../../domain/entities/recipe';
import { E2E_CONVIVES, E2E_RECIPES } from './e2e-fixtures';

export type E2eSeed = {
  convives: Convive[];
  recipes: Recipe[];
};

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
