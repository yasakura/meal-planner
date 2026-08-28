import { FROM_MENU, type BackLink } from '../catalogue/recipe-detail-origin';

const ENREGISTRE = 'enregistre';

const SEMAINE = 'semaine';

export const MENU_SANS_PROVENANCE = '/menu';

export const MENU_APRES_ENREGISTREMENT = `${MENU_SANS_PROVENANCE}?${ENREGISTRE}`;

export function arriveeApresEnregistrement(params: URLSearchParams): boolean {
  return params.has(ENREGISTRE);
}

export function menuDeLaSemaine(dateDebut: string): string {
  return `${MENU_SANS_PROVENANCE}?${new URLSearchParams({ [SEMAINE]: dateDebut }).toString()}`;
}

export function semaineConsultee(params: URLSearchParams): string | null {
  return params.get(SEMAINE);
}

export function retourAuMenuDeLaSemaine(dateDebut: string | undefined): BackLink {
  if (dateDebut === undefined) return FROM_MENU.backLink;
  return { href: menuDeLaSemaine(dateDebut), label: FROM_MENU.backLink.label };
}
