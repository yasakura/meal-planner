import { describe, it, expect } from 'vitest';

import { AccountBuilder } from '../../../domain/test-builders/account.builder';
import { StubAuthGateway } from '../../../domain/test-doubles/stub-auth-gateway';
import { createStore } from '../../store/store';
import {
  authReducer,
  authStateChanged,
  observeAuthState,
  signIn,
  signOut,
  selectAuth,
  type AuthState,
} from './auth-slice';

describe('auth slice', () => {
  it('un store neuf est initializing, sans compte ni erreur', () => {
    const store = createStore({
      authGateway: StubAuthGateway.resolvingWith(AccountBuilder.anAccount().build()),
    });

    expect(selectAuth(store.getState())).toEqual({
      account: null,
      status: 'initializing',
      error: null,
    });
  });

  it('signIn réussi passe le store en authenticated avec le compte du gateway', async () => {
    const account = AccountBuilder.anAccount().withEmail('aurelie@foyer.test').build();
    const store = createStore({ authGateway: StubAuthGateway.resolvingWith(account) });

    await store.dispatch(signIn({ email: 'aurelie@foyer.test', password: 'secret' }));

    expect(selectAuth(store.getState())).toEqual({
      account,
      status: 'authenticated',
      error: null,
    });
  });

  it('signIn pending met le status à loading et efface l’erreur', () => {
    const stateAfterError: ReturnType<typeof authReducer> = {
      account: null,
      status: 'error',
      error: 'Identifiants invalides',
    };

    const next = authReducer(
      stateAfterError,
      signIn.pending('req-1', { email: 'a@b.test', password: 'x' }),
    );

    expect(next.status).toBe('loading');
    expect(next.error).toBeNull();
  });

  it('signIn en échec passe en error avec le message du gateway, sans compte', async () => {
    const store = createStore({
      authGateway: StubAuthGateway.rejectingWith('Identifiants invalides'),
    });

    await store.dispatch(signIn({ email: 'aurelie@foyer.test', password: 'wrong' }));

    expect(selectAuth(store.getState())).toEqual({
      account: null,
      status: 'error',
      error: 'Identifiants invalides',
    });
  });

  // [guard] câblage extra.authGateway — vert à l'écriture (thunk déjà branché), verrouille la non-régression du wiring DI
  it('le thunk forwarde email et password au authGateway injecté via extra', async () => {
    const gateway = StubAuthGateway.resolvingWith(AccountBuilder.anAccount().build());
    const store = createStore({ authGateway: gateway });

    await store.dispatch(signIn({ email: 'aurelie@foyer.test', password: 'secret-42' }));

    expect(gateway.lastEmail).toBe('aurelie@foyer.test');
    expect(gateway.lastPassword).toBe('secret-42');
  });

  // [guard] Nettoyage depuis un état SALE (ui hors périmètre mutation → seul filet).
  // Les tests de flux partent d'un état déjà propre : ils n'exercent jamais `account = null`
  // (rejected) ni `error = null` (fulfilled). Ces deux guards verrouillent ces lignes.
  it('signIn échoué depuis un état authentifié remet account à null', () => {
    const account = AccountBuilder.anAccount().build();
    const authenticated: AuthState = { account, status: 'authenticated', error: null };

    const next = authReducer(
      authenticated,
      signIn.rejected(new Error('Session expirée'), 'req-1', { email: 'a@b.test', password: 'x' }),
    );

    expect(next.account).toBeNull();
    expect(next.status).toBe('error');
    expect(next.error).toBe('Session expirée');
  });

  it('signIn réussi depuis un état en erreur efface l’erreur', () => {
    const account = AccountBuilder.anAccount().build();
    const errored: AuthState = { account: null, status: 'error', error: 'Identifiants invalides' };

    const next = authReducer(
      errored,
      signIn.fulfilled(account, 'req-1', { email: 'a@b.test', password: 'x' }),
    );

    expect(next.error).toBeNull();
    expect(next.status).toBe('authenticated');
    expect(next.account).toEqual(account);
  });

  it('authStateChanged avec un compte passe le store en authenticated', () => {
    const account = AccountBuilder.anAccount().build();
    const initializing: AuthState = { account: null, status: 'initializing', error: null };

    const next = authReducer(initializing, authStateChanged(account));

    expect(next).toEqual({ account, status: 'authenticated', error: null });
  });

  it('authStateChanged sans compte passe le store en unauthenticated', () => {
    const account = AccountBuilder.anAccount().build();
    const authenticated: AuthState = { account, status: 'authenticated', error: null };

    const next = authReducer(authenticated, authStateChanged(null));

    expect(next).toEqual({ account: null, status: 'unauthenticated', error: null });
  });

  it('observeAuthState avec session existante passe le store en authenticated', () => {
    const account = AccountBuilder.anAccount().withEmail('aurelie@foyer.test').build();
    const store = createStore({ authGateway: StubAuthGateway.withSession(account) });

    store.dispatch(observeAuthState());

    expect(selectAuth(store.getState())).toEqual({
      account,
      status: 'authenticated',
      error: null,
    });
  });

  it('observeAuthState sans session passe le store en unauthenticated', () => {
    const store = createStore({ authGateway: StubAuthGateway.withoutSession() });

    store.dispatch(observeAuthState());

    expect(selectAuth(store.getState())).toEqual({
      account: null,
      status: 'unauthenticated',
      error: null,
    });
  });

  it("observeAuthState propage l'unsubscribe de la gateway au caller du thunk", () => {
    const gateway = StubAuthGateway.withoutSession();
    const store = createStore({ authGateway: gateway });

    const unsubscribe = store.dispatch(observeAuthState());
    expect(gateway.unsubscribed).toBe(false);

    unsubscribe();

    expect(gateway.unsubscribed).toBe(true);
  });

  it('signOut rappelle le listener de session avec null → le store repasse unauthenticated', async () => {
    const account = AccountBuilder.anAccount().withEmail('aurelie@foyer.test').build();
    const gateway = StubAuthGateway.withSession(account);
    const store = createStore({ authGateway: gateway });

    store.dispatch(observeAuthState());
    expect(selectAuth(store.getState()).status).toBe('authenticated');

    await store.dispatch(signOut());

    expect(gateway.signOutCalled).toBe(true);
    expect(selectAuth(store.getState())).toEqual({
      account: null,
      status: 'unauthenticated',
      error: null,
    });
  });

  it('signOut échoué ne rejette pas au caller et ne déconnecte pas (statut reste authenticated)', async () => {
    const account = AccountBuilder.anAccount().withEmail('aurelie@foyer.test').build();
    const gateway = StubAuthGateway.withSession(account).failingSignOut('offline');
    const store = createStore({ authGateway: gateway });

    store.dispatch(observeAuthState());
    expect(selectAuth(store.getState()).status).toBe('authenticated');

    await expect(store.dispatch(signOut())).resolves.toBeUndefined();

    expect(gateway.signOutCalled).toBe(true);
    expect(selectAuth(store.getState())).toEqual({
      account,
      status: 'authenticated',
      error: null,
    });
  });

  // [guard] loading observé sur le FLUX RÉEL (dispatch via store, pas le reducer isolé).
  it('pendant un signIn en vol, le status passe à loading', () => {
    const store = createStore({
      authGateway: StubAuthGateway.resolvingWith(AccountBuilder.anAccount().build()),
    });

    void store.dispatch(signIn({ email: 'a@b.test', password: 'x' }));

    expect(selectAuth(store.getState()).status).toBe('loading');
  });
});
