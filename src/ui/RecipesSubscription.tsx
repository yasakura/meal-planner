import { useEffect, type ReactNode } from 'react';

import { useAppDispatch, useAppSelector } from './store/hooks';
import { observeRecipes, selectCatalogueAttempt } from './features/catalogue/catalogue-slice';

export function RecipesSubscription({ children }: { children: ReactNode }) {
  const attempt = useAppSelector(selectCatalogueAttempt);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const unsubscribe = dispatch(observeRecipes());
    return unsubscribe;
  }, [dispatch, attempt]);

  return <>{children}</>;
}
