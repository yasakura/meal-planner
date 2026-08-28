import { useParams } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectCatalogue } from '../catalogue/catalogue-slice';
import { selectConvives } from '../convives/convives-slice';
import { coursesRelancees } from './liste-de-courses-relance';
import { retourAuMenuDeLaSemaine } from './menu-return';
import { dateDebutDeLaRoute } from './liste-de-courses-route';
import { listeDeCoursesViewOf } from './liste-de-courses-view';
import { selectSavedMenus } from './saved-menus-slice';
import { ListeDeCoursesScreen } from './ListeDeCoursesScreen';

export function ListeDeCoursesContainer() {
  const dispatch = useAppDispatch();
  const dateDebut = dateDebutDeLaRoute(useParams());
  const view = listeDeCoursesViewOf(
    useAppSelector(selectSavedMenus),
    useAppSelector(selectCatalogue),
    useAppSelector(selectConvives),
    dateDebut,
  );

  return (
    <ListeDeCoursesScreen
      {...view}
      back={retourAuMenuDeLaSemaine(dateDebut)}
      onRetry={() => dispatch(coursesRelancees())}
    />
  );
}
