import { toIsoDate } from '../../../domain/entities/calendar-date';
import { type Menu } from '../../../domain/entities/menu';
import { type Recipe } from '../../../domain/entities/recipe';
import { listeDeCourses } from '../../../domain/use-cases/liste-de-courses';
import { type CatalogueState } from '../catalogue/catalogue-slice';
import { type ConvivesState } from '../convives/convives-slice';
import { quantiteAffichee } from '../quantites/quantite-affichee';
import { menuPeriodLabel } from './menu-period-label';
import { type SavedMenusState } from './saved-menus-slice';

const COURSES_UNAVAILABLE_NOTICE =
  'Aucune connexion — la liste de courses n’a pas pu être chargée.';

const COURSES_UNREADABLE_NOTICE = 'Impossible de charger la liste de courses.';

export type LigneDeCoursesAffichee = { name: string; quantity: string };

export type ListeDeCoursesView =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'unavailable'; message: string }
  | { status: 'notFound' }
  | { status: 'empty'; periodLabel: string }
  | { status: 'loaded'; periodLabel: string; lignes: LigneDeCoursesAffichee[] };

export type SourceDeCourses = 'menus' | 'catalogue' | 'foyer';

type SourceAttendue = {
  nom: SourceDeCourses;
  arrivee: boolean;
  failure: 'unreadable' | 'unavailable' | null;
};

function sourcesDeLaListe(
  savedMenus: SavedMenusState,
  catalogue: CatalogueState,
  convives: ConvivesState,
): SourceAttendue[] {
  return [
    { nom: 'menus', arrivee: savedMenus.menus !== null, failure: savedMenus.failure },
    { nom: 'catalogue', arrivee: catalogue.recipes !== null, failure: catalogue.failure },
    { nom: 'foyer', arrivee: convives.received, failure: convives.failure },
  ];
}

export function sourcesEnPanne(
  savedMenus: SavedMenusState,
  catalogue: CatalogueState,
  convives: ConvivesState,
): SourceDeCourses[] {
  return sourcesDeLaListe(savedMenus, catalogue, convives)
    .filter((source) => !source.arrivee && source.failure !== null)
    .map((source) => source.nom);
}

function constatDAttente(sources: SourceAttendue[]): ListeDeCoursesView | null {
  const manquantes = sources.filter((source) => !source.arrivee);
  if (manquantes.length === 0) return null;
  if (manquantes.some((source) => source.failure === 'unavailable')) {
    return { status: 'unavailable', message: COURSES_UNAVAILABLE_NOTICE };
  }
  if (manquantes.some((source) => source.failure === 'unreadable')) {
    return { status: 'error', message: COURSES_UNREADABLE_NOTICE };
  }
  return { status: 'loading' };
}

export function listeDeCoursesViewOf(
  savedMenus: SavedMenusState,
  catalogue: CatalogueState,
  convives: ConvivesState,
  dateDebut: string | undefined,
): ListeDeCoursesView {
  const attente = constatDAttente(sourcesDeLaListe(savedMenus, catalogue, convives));
  if (attente !== null) return attente;

  const menu = (savedMenus.menus as Menu[]).find(
    (candidat) => toIsoDate(candidat.dateDebut) === dateDebut,
  );
  if (menu === undefined) return { status: 'notFound' };

  const liste = listeDeCourses(menu, catalogue.recipes as Recipe[], convives.convives);
  const periodLabel = menuPeriodLabel(menu);
  if (liste.lignes.length === 0) return { status: 'empty', periodLabel };
  return {
    status: 'loaded',
    periodLabel,
    lignes: liste.lignes.map((ligne) => ({
      name: ligne.name,
      quantity: quantiteAffichee(ligne.quantity, ligne.unit),
    })),
  };
}
