export type BackLink = { href: string; label: string };

const DEPUIS = 'depuis';
const MENU = 'menu';
const MENU_BROUILLON = 'menu-nouveau';

const RETOUR_CATALOGUE: BackLink = { href: '/catalogue', label: '← Recettes' };

const RETOUR_MENU: BackLink = { href: '/menu', label: '← Menu' };

const RETOUR_BROUILLON: BackLink = { href: '/menu/nouveau', label: '← Menu' };

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

export const FROM_MENU_DRAFT: Origin = origin(`?${DEPUIS}=${MENU_BROUILLON}`, RETOUR_BROUILLON);

const FROM_CATALOGUE: Origin = origin('', RETOUR_CATALOGUE);

export function originOf(params: URLSearchParams): Origin {
  const depuis = params.get(DEPUIS);
  if (depuis === MENU) return FROM_MENU;
  if (depuis === MENU_BROUILLON) return FROM_MENU_DRAFT;
  return FROM_CATALOGUE;
}
