import { useEffect, type ReactNode } from 'react';

import { useAppDispatch, useAppSelector } from './store/hooks';
import { observeRecipes, selectCatalogueAttempt } from './features/catalogue/catalogue-slice';
import { observeConvives, selectConvivesAttempt } from './features/convives/convives-slice';

export function DataSubscription({ children }: { children: ReactNode }) {
  const catalogueAttempt = useAppSelector(selectCatalogueAttempt);
  const convivesAttempt = useAppSelector(selectConvivesAttempt);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const unsubscribe = dispatch(observeRecipes());
    return unsubscribe;
  }, [dispatch, catalogueAttempt]);

  useEffect(() => {
    const unsubscribe = dispatch(observeConvives());
    return unsubscribe;
  }, [dispatch, convivesAttempt]);

  return <>{children}</>;
}
