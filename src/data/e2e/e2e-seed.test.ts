import { describe, it, expect } from 'vitest';

import { E2E_CONVIVES, E2E_RECIPES } from './e2e-fixtures';
import { readE2eSeed } from './e2e-seed';

const noms = (search: string) => readE2eSeed(search).convives.map((convive) => convive.name);
const titres = (search: string) => readE2eSeed(search).recipes.map((recipe) => recipe.title);

describe('readE2eSeed', () => {
  it('charge tout le jeu de fixtures quand l’URL ne demande rien', () => {
    expect(readE2eSeed('')).toEqual({ convives: [...E2E_CONVIVES], recipes: [...E2E_RECIPES] });
  });

  it('charge les N premières fixtures demandées par l’URL', () => {
    expect(noms('?convives=2&recipes=1')).toEqual(['Alice', 'Bruno']);
    expect(titres('?convives=2&recipes=1')).toEqual(['Curry de pois chiches']);
  });

  it('charge un foyer et un catalogue vides à 0 : l’état vide se pilote par l’URL', () => {
    expect(noms('?convives=0&recipes=0')).toEqual([]);
    expect(titres('?convives=0&recipes=0')).toEqual([]);
  });

  it('plafonne à ce qui existe quand l’URL en demande davantage', () => {
    expect(noms('?convives=99')).toEqual([...E2E_CONVIVES].map((convive) => convive.name));
  });

  it.each(['abc', '-1', '1.5', ''])(
    'ignore la valeur « %s », qui n’est pas un entier positif, et recharge tout',
    (valeur) => {
      // Surtout pas un `Number()` qui donnerait NaN puis un foyer vide : un état vide
      // inventé par une faute de frappe est exactement le faux signal qu'on refuse.
      expect(noms(`?convives=${valeur}`)).toEqual([...E2E_CONVIVES].map((c) => c.name));
    },
  );
});
