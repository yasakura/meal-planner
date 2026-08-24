import { useEffect, type ReactNode } from 'react';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { DataSubscription } from '../../DataSubscription';
import { LoginContainer } from './LoginContainer';
import { Splash } from './Splash';
import { observeAuthState, selectAuth } from './auth-slice';

export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAppSelector(selectAuth);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const unsubscribe = dispatch(observeAuthState());
    return unsubscribe;
  }, [dispatch]);

  if (status === 'initializing') {
    return <Splash />;
  }

  if (status === 'authenticated') {
    return <DataSubscription>{children}</DataSubscription>;
  }

  return <LoginContainer />;
}
