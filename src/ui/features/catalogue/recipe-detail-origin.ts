export type BackLink = { href: string; label: string };

const DEPUIS = 'depuis';
const POUR = 'pour';
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
  readonly convives: number | null;
  pour(convives: number): Origin;
  sansEffectif(): Origin;
};

function effectifRetenu(convives: number): number | null {
  return Number.isSafeInteger(convives) && convives >= 1 ? convives : null;
}

function queryOf(depuis: string | null, convives: number | null): string {
  const params = new URLSearchParams();
  if (depuis !== null) params.set(DEPUIS, depuis);
  if (convives !== null) params.set(POUR, String(convives));
  const query = params.toString();
  return query === '' ? '' : `?${query}`;
}

function origin(depuis: string | null, convives: number | null, backLink: BackLink): Origin {
  const query = queryOf(depuis, convives);
  const recipeHref = (recipeId: string) => `/catalogue/${recipeId}${query}`;
  return {
    recipeHref,
    recipeEditHref: (recipeId) => `/catalogue/${recipeId}/modifier${query}`,
    backLink,
    backToRecipe: (recipeId) => ({ href: recipeHref(recipeId), label: RETOUR_RECETTE }),
    convives,
    pour: (combien) => origin(depuis, effectifRetenu(combien), backLink),
    sansEffectif: () => origin(depuis, null, backLink),
  };
}

export const FROM_MENU: Origin = origin(MENU, null, RETOUR_MENU);

export const FROM_MENU_DRAFT: Origin = origin(MENU_BROUILLON, null, RETOUR_BROUILLON);

export const FROM_CATALOGUE: Origin = origin(null, null, RETOUR_CATALOGUE);

function provenanceOf(depuis: string | null): Origin {
  if (depuis === MENU) return FROM_MENU;
  if (depuis === MENU_BROUILLON) return FROM_MENU_DRAFT;
  return FROM_CATALOGUE;
}

export function originOf(params: URLSearchParams): Origin {
  return provenanceOf(params.get(DEPUIS)).pour(Number(params.get(POUR)));
}
