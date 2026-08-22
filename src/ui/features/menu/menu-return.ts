const ENREGISTRE = 'enregistre';

export const MENU_SANS_PROVENANCE = '/menu';

export const MENU_APRES_ENREGISTREMENT = `${MENU_SANS_PROVENANCE}?${ENREGISTRE}`;

export function arriveeApresEnregistrement(params: URLSearchParams): boolean {
  return params.has(ENREGISTRE);
}
