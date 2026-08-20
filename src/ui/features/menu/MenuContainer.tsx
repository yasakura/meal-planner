import { useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  generateMenu,
  menuSaveNoticeOf,
  menuScreenOpened,
  menuStartDateSelected,
  menuWindowSelected,
  NO_RECIPES,
  refreshMenuRecipes,
  saveMenu,
  selectIsSaveInFlight,
  selectMenu,
  selectStartDateFloorIso,
  selectStartDateIso,
} from './menu-slice';
import { menuDays } from './menu-days';
import { MENU_UNAVAILABLE_NOTICE } from './menu-notice';
import { MenuScreen, type MenuScreenProps } from './MenuScreen';

function errorMessage(error: string | null): string {
  return error === NO_RECIPES
    ? "Ajoute d'abord des recettes pour générer un menu."
    : 'Impossible de générer le menu.';
}

export function MenuContainer() {
  const menuState = useAppSelector(selectMenu);
  const { status, menu, recipes, error, selectedDays, startDateRefused } = menuState;
  // Le champ natif ne parle qu'en `AAAA-MM-JJ` : c'est le slice, muté, qui traduit — ce fichier
  // ne convertit rien.
  const startDateIso = useAppSelector(selectStartDateIso);
  const startDateFloorIso = useAppSelector(selectStartDateFloorIso);
  // Le verrou du bouton est une DÉCISION : elle vit dans le slice, qui est muté, et ce fichier
  // ne fait que la porter jusqu'à l'écran.
  const saveDisabled = useAppSelector(selectIsSaveInFlight);
  const dispatch = useAppDispatch();
  // La fenêtre choisie vient du store, pas d'un état local : le menu affiché y vit déjà, et un
  // `useState` repartait à sa valeur par défaut à chaque remontage (issue #28). La date de début
  // est une préférence de même nature, et suit le même chemin.
  const selectWindow = (days: number) => dispatch(menuWindowSelected(days));
  const selectStartDate = (iso: string) => dispatch(menuStartDateSelected(iso));

  // Arriver sur l'écran relit le catalogue, et relit l'horloge : le plancher proposé par le champ
  // est celui d'aujourd'hui, et le constat d'une visite précédente tombe. Le container demande
  // sans condition : ce sont les thunks, dans le slice muté, qui décident — pas ce fichier, que
  // la mutation ignore.
  useEffect(() => {
    dispatch(menuScreenOpened());
    void dispatch(refreshMenuRecipes());
  }, [dispatch]);

  let props: MenuScreenProps;
  if (status === 'loading') {
    props = { status: 'loading' };
  } else if (status === 'unavailable') {
    // La lecture qui a échoué est celle du catalogue, mais on n'est pas dans un catalogue : cet
    // écran-ci nomme ce qu'il n'a pas pu montrer, et c'est le menu.
    props = { status: 'unavailable', message: MENU_UNAVAILABLE_NOTICE };
  } else if (status === 'error') {
    props = {
      status: 'error',
      message: errorMessage(error),
      onRetry: () => dispatch(generateMenu(selectedDays)),
    };
  } else if (status === 'success' && menu !== null && recipes !== null) {
    props = {
      status: 'success',
      days: menuDays(menu, recipes),
      startDateIso,
      startDateFloorIso,
      startDateRefused,
      onStartDateChange: selectStartDate,
      selectedDays,
      onSelect: selectWindow,
      onRegenerate: () => dispatch(generateMenu(selectedDays)),
      // Sans argument : le menu à enregistrer est celui du store, et c'est le thunk qui l'y lit.
      onSave: () => void dispatch(saveMenu()),
      saveDisabled,
      saveNotice: menuSaveNoticeOf(menuState),
    };
  } else {
    props = {
      status: 'idle',
      startDateIso,
      startDateFloorIso,
      startDateRefused,
      onStartDateChange: selectStartDate,
      selectedDays,
      onSelect: selectWindow,
      onGenerate: () => dispatch(generateMenu(selectedDays)),
    };
  }

  return <MenuScreen {...props} />;
}
