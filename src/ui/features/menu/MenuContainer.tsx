import { useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  generateMenu,
  menuConsultationOf,
  menuErrorMessage,
  menuRetried,
  menuSaveNoticeOf,
  menuScreenOpened,
  menuStartDateSelected,
  menuWindowSelected,
  newMenuRequested,
  nextMenuSelected,
  previousMenuSelected,
  saveMenu,
  selectIsSaveInFlight,
  selectMenu,
  selectStartDateFloorIso,
  selectStartDateIso,
} from './menu-slice';
import { menuDays } from './menu-days';
import { MENU_UNAVAILABLE_NOTICE } from './menu-notice';
import { MenuScreen, type MenuScreenProps } from './MenuScreen';

export function MenuContainer() {
  const menuState = useAppSelector(selectMenu);
  const { status, menu, recipes, selectedDays, startDateRefused } = menuState;
  const consultation = menuConsultationOf(menuState);
  const startDateIso = useAppSelector(selectStartDateIso);
  const startDateFloorIso = useAppSelector(selectStartDateFloorIso);
  const saveDisabled = useAppSelector(selectIsSaveInFlight);
  const dispatch = useAppDispatch();
  const selectWindow = (days: number) => dispatch(menuWindowSelected(days));
  const selectStartDate = (iso: string) => dispatch(menuStartDateSelected(iso));

  useEffect(() => {
    void dispatch(menuScreenOpened());
  }, [dispatch]);

  let props: MenuScreenProps;
  if (consultation !== null) {
    props = {
      status: 'consultation',
      ...consultation,
      onPrevious: () => dispatch(previousMenuSelected()),
      onNext: () => dispatch(nextMenuSelected()),
      onNewMenu: () => dispatch(newMenuRequested()),
    };
  } else if (status === 'loading') {
    props = { status: 'loading' };
  } else if (status === 'unavailable') {
    props = { status: 'unavailable', message: MENU_UNAVAILABLE_NOTICE };
  } else if (status === 'error') {
    props = {
      status: 'error',
      message: menuErrorMessage(menuState),
      onRetry: () => void dispatch(menuRetried()),
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
