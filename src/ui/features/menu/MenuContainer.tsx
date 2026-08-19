import { useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  generateMenu,
  menuStartDateSelected,
  menuWindowSelected,
  NO_RECIPES,
  refreshMenuRecipes,
  selectMenu,
  selectStartDateIso,
} from './menu-slice';
import { menuDays } from './menu-days';
import { MenuScreen, type MenuScreenProps } from './MenuScreen';

function errorMessage(error: string | null): string {
  return error === NO_RECIPES
    ? "Ajoute d'abord des recettes pour générer un menu."
    : 'Impossible de générer le menu.';
}

export function MenuContainer() {
  const { status, menu, recipes, error, selectedDays } = useAppSelector(selectMenu);
  // Le champ natif ne parle qu'en `AAAA-MM-JJ` : c'est le slice, muté, qui traduit — ce fichier
  // ne convertit rien.
  const startDateIso = useAppSelector(selectStartDateIso);
  const dispatch = useAppDispatch();
  // La fenêtre choisie vient du store, pas d'un état local : le menu affiché y vit déjà, et un
  // `useState` repartait à sa valeur par défaut à chaque remontage (issue #28). La date de début
  // est une préférence de même nature, et suit le même chemin.
  const selectWindow = (days: number) => dispatch(menuWindowSelected(days));
  const selectStartDate = (iso: string) => dispatch(menuStartDateSelected(iso));

  // Arriver sur l'écran relit le catalogue. Le container demande sans condition : c'est le thunk,
  // dans le slice muté, qui décide s'il y a lieu de lire — pas ce fichier, que la mutation ignore.
  useEffect(() => {
    void dispatch(refreshMenuRecipes());
  }, [dispatch]);

  let props: MenuScreenProps;
  if (status === 'loading') {
    props = { status: 'loading' };
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
      onStartDateChange: selectStartDate,
      selectedDays,
      onSelect: selectWindow,
      onRegenerate: () => dispatch(generateMenu(selectedDays)),
    };
  } else {
    props = {
      status: 'idle',
      startDateIso,
      onStartDateChange: selectStartDate,
      selectedDays,
      onSelect: selectWindow,
      onGenerate: () => dispatch(generateMenu(selectedDays)),
    };
  }

  return <MenuScreen {...props} />;
}
