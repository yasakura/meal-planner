import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { catalogueRetried, selectCatalogue } from '../catalogue/catalogue-slice';
import { selectConvives } from '../convives/convives-slice';
import { MENU_SANS_PROVENANCE, arriveeApresEnregistrement } from './menu-return';
import {
  nextMenuSelected,
  previousMenuSelected,
  savedMenusOpened,
  savedMenusRetried,
  savedMenusViewOf,
  selectSavedMenus,
} from './saved-menus-slice';
import { MenuScreen, type MenuScreenProps } from './MenuScreen';

export function MenuContainer() {
  const view = savedMenusViewOf(
    useAppSelector(selectSavedMenus),
    useAppSelector(selectCatalogue),
    useAppSelector(selectConvives).convives,
  );
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const apresEnregistrement = useRef(arriveeApresEnregistrement(searchParams));

  useEffect(() => {
    dispatch(savedMenusOpened({ fromSave: apresEnregistrement.current }));
    if (apresEnregistrement.current) void navigate(MENU_SANS_PROVENANCE, { replace: true });
  }, [dispatch, navigate]);

  const relancerLesMenus = () => dispatch(savedMenusRetried());

  let props: MenuScreenProps;
  if (view.status === 'consultation') {
    props = {
      ...view,
      onPrevious: () => dispatch(previousMenuSelected()),
      onNext: () => dispatch(nextMenuSelected()),
      onRetryTitles: () => dispatch(catalogueRetried()),
    };
  } else if (view.status === 'error') {
    props = { status: 'error', message: view.message, onRetry: relancerLesMenus };
  } else if (view.status === 'unavailable') {
    props = { status: 'unavailable', message: view.message, onRetry: relancerLesMenus };
  } else {
    props = view;
  }

  return <MenuScreen {...props} />;
}
