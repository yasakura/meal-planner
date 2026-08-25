import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { catalogueRetried, selectCatalogue } from '../catalogue/catalogue-slice';
import { MENU_SANS_PROVENANCE, arriveeApresEnregistrement } from './menu-return';
import {
  nextMenuSelected,
  previousMenuSelected,
  savedMenusOpened,
  savedMenusRetried,
  savedMenusViewOf,
  selectSavedMenus,
  type SavedMenusSource,
} from './saved-menus-slice';
import { MenuScreen, type MenuScreenProps } from './MenuScreen';

export function MenuContainer() {
  const view = savedMenusViewOf(useAppSelector(selectSavedMenus), useAppSelector(selectCatalogue));
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const apresEnregistrement = useRef(arriveeApresEnregistrement(searchParams));

  useEffect(() => {
    dispatch(savedMenusOpened({ fromSave: apresEnregistrement.current }));
    if (apresEnregistrement.current) void navigate(MENU_SANS_PROVENANCE, { replace: true });
  }, [dispatch, navigate]);

  const relancer = (source: SavedMenusSource) => () => {
    dispatch(source === 'menus' ? savedMenusRetried() : catalogueRetried());
  };

  let props: MenuScreenProps;
  if (view.status === 'consultation') {
    props = {
      ...view,
      onPrevious: () => dispatch(previousMenuSelected()),
      onNext: () => dispatch(nextMenuSelected()),
    };
  } else if (view.status === 'error') {
    props = { status: 'error', message: view.message, onRetry: relancer(view.source) };
  } else if (view.status === 'unavailable') {
    props = { status: 'unavailable', message: view.message, onRetry: relancer(view.source) };
  } else {
    props = view;
  }

  return <MenuScreen {...props} />;
}
