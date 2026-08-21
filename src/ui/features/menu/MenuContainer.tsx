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
  const startDateIso = useAppSelector(selectStartDateIso);
  const startDateFloorIso = useAppSelector(selectStartDateFloorIso);
  const saveDisabled = useAppSelector(selectIsSaveInFlight);
  const dispatch = useAppDispatch();
  const selectWindow = (days: number) => dispatch(menuWindowSelected(days));
  const selectStartDate = (iso: string) => dispatch(menuStartDateSelected(iso));

  useEffect(() => {
    dispatch(menuScreenOpened());
    void dispatch(refreshMenuRecipes());
  }, [dispatch]);

  let props: MenuScreenProps;
  if (status === 'loading') {
    props = { status: 'loading' };
  } else if (status === 'unavailable') {
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
