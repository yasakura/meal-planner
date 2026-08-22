import { useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { MENU_SANS_PROVENANCE, arriveeApresEnregistrement } from './menu-return';
import {
  nextMenuSelected,
  previousMenuSelected,
  savedMenusScreenOpened,
  savedMenusScreenOpenedAfterSave,
  savedMenusViewOf,
  selectSavedMenus,
} from './saved-menus-slice';
import { MenuScreen, type MenuScreenProps } from './MenuScreen';

export function MenuContainer() {
  const view = savedMenusViewOf(useAppSelector(selectSavedMenus));
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const apresEnregistrement = useRef(arriveeApresEnregistrement(searchParams));

  const recharger = useCallback(() => {
    void dispatch(
      apresEnregistrement.current ? savedMenusScreenOpenedAfterSave() : savedMenusScreenOpened(),
    );
  }, [dispatch]);

  useEffect(() => {
    recharger();
    if (apresEnregistrement.current) void navigate(MENU_SANS_PROVENANCE, { replace: true });
  }, [recharger, navigate]);

  let props: MenuScreenProps;
  if (view.status === 'consultation') {
    props = {
      ...view,
      onPrevious: () => dispatch(previousMenuSelected()),
      onNext: () => dispatch(nextMenuSelected()),
    };
  } else if (view.status === 'error') {
    props = { ...view, onRetry: recharger };
  } else {
    props = view;
  }

  return <MenuScreen {...props} />;
}
