export type BackLink = { href: string; label: string };

const DEPUIS = 'depuis';
const MENU = 'menu';

const RETOUR_CATALOGUE: BackLink = { href: '/catalogue', label: '← Recettes' };

const RETOUR_MENU: BackLink = { href: '/menu', label: '← Menu' };

const RETOUR_RECETTE = '← Recette';

export type Origin = {
  recipeHref(recipeId: string): string;
  recipeEditHref(recipeId: string): string;
  readonly backLink: BackLink;
  backToRecipe(recipeId: string): BackLink;
};

function origin(query: string, backLink: BackLink): Origin {
  const recipeHref = (recipeId: string) => `/catalogue/${recipeId}${query}`;
  return {
    recipeHref,
    recipeEditHref: (recipeId) => `/catalogue/${recipeId}/modifier${query}`,
    backLink,
    backToRecipe: (recipeId) => ({ href: recipeHref(recipeId), label: RETOUR_RECETTE }),
  };
}

export const FROM_MENU: Origin = origin(`?${DEPUIS}=${MENU}`, RETOUR_MENU);

const FROM_CATALOGUE: Origin = origin('', RETOUR_CATALOGUE);

export function originOf(params: URLSearchParams): Origin {
  return params.get(DEPUIS) === MENU ? FROM_MENU : FROM_CATALOGUE;
}
