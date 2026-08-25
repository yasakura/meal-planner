import { useEffect, type ReactNode } from 'react';

import { useAppDispatch, useAppSelector } from './store/hooks';
import { observeRecipes, selectCatalogueAttempt } from './features/catalogue/catalogue-slice';
import { observeConvives, selectConvivesAttempt } from './features/convives/convives-slice';
import { observeMenus, selectSavedMenusAttempt } from './features/menu/saved-menus-slice';

export function DataSubscription({ children }: { children: ReactNode }) {
  const catalogueAttempt = useAppSelector(selectCatalogueAttempt);
  const convivesAttempt = useAppSelector(selectConvivesAttempt);
  const savedMenusAttempt = useAppSelector(selectSavedMenusAttempt);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const unsubscribe = dispatch(observeRecipes());
    return unsubscribe;
  }, [dispatch, catalogueAttempt]);

  useEffect(() => {
    const unsubscribe = dispatch(observeConvives());
    return unsubscribe;
  }, [dispatch, convivesAttempt]);

  useEffect(() => {
    const unsubscribe = dispatch(observeMenus());
    return unsubscribe;
  }, [dispatch, savedMenusAttempt]);

  return <>{children}</>;
}
