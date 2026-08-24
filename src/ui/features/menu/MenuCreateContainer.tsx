import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  generateMenu,
  menuCreateScreenOpened,
  menuCreationViewOf,
  menuRetried,
  menuSaveHonored,
  menuStartDateSelected,
  menuWindowSelected,
  saveMenu,
  selectMenu,
  selectStartDateFloorIso,
  selectStartDateIso,
} from './menu-slice';
import { MENU_APRES_ENREGISTREMENT } from './menu-return';
import { MenuCreateScreen, type MenuCreateBodyProps } from './MenuCreateScreen';

export function MenuCreateContainer() {
  const menuState = useAppSelector(selectMenu);
  const view = menuCreationViewOf(menuState);
  const startDateIso = useAppSelector(selectStartDateIso);
  const startDateFloorIso = useAppSelector(selectStartDateFloorIso);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    void dispatch(menuCreateScreenOpened());
  }, [dispatch]);

  const monte = useRef(true);
  useEffect(() => {
    monte.current = true;
    return () => {
      monte.current = false;
    };
  }, []);

  const handleSave = () => {
    void dispatch(saveMenu()).then((issue) => {
      if (menuSaveHonored(issue) && monte.current) void navigate(MENU_APRES_ENREGISTREMENT);
    });
  };

  let body: MenuCreateBodyProps;
  if (view.status === 'draft') {
    body = {
      ...view,
      onRegenerate: () => dispatch(generateMenu(menuState.selectedDays)),
      onSave: handleSave,
    };
  } else if (view.status === 'error' || view.status === 'unavailable') {
    body = { ...view, onRetry: () => void dispatch(menuRetried()) };
  } else if (view.status === 'form') {
    body = { ...view, onGenerate: () => dispatch(generateMenu(menuState.selectedDays)) };
  } else {
    body = view;
  }

  return (
    <MenuCreateScreen
      startDateIso={startDateIso}
      startDateFloorIso={startDateFloorIso}
      startDateRefused={menuState.startDateRefused}
      onStartDateChange={(iso: string) => dispatch(menuStartDateSelected(iso))}
      selectedDays={menuState.selectedDays}
      onSelect={(days: number) => dispatch(menuWindowSelected(days))}
      body={body}
    />
  );
}
