import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { AccountBuilder } from '../../../domain/test-builders/account.builder';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { StubAuthGateway } from '../../../domain/test-doubles/stub-auth-gateway';
import { createTestStore } from '../../../test/create-test-store';
import { RecipeChannel } from '../../test-utils/recipe-channel';
import { signOut } from './auth-slice';
import { AuthGate } from './AuthGate';

function renderGate(gateway: StubAuthGateway, channel = RecipeChannel.silent()) {
  const store = createTestStore({ authGateway: gateway, observeRecipes: channel.observeRecipes });
  const view = render(
    <Provider store={store}>
      <AuthGate>
        <div>CONTENU APP</div>
      </AuthGate>
    </Provider>,
  );
  return { store, gateway, channel, ...view };
}

describe('AuthGate', () => {
  it('rend les children quand la session est authentifiée', () => {
    renderGate(StubAuthGateway.withSession(AccountBuilder.anAccount().build()));

    expect(screen.getByText('CONTENU APP')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /se connecter/i })).not.toBeInTheDocument();
  });

  it('rend l’écran de login quand aucune session', () => {
    renderGate(StubAuthGateway.withoutSession());

    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();
    expect(screen.queryByText('CONTENU APP')).not.toBeInTheDocument();
  });

  it('rend le Splash tant que la session n’est pas déterminée (initializing)', () => {
    renderGate(StubAuthGateway.withPendingSession());

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('CONTENU APP')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /se connecter/i })).not.toBeInTheDocument();
  });

  it('s’abonne à la session au montage et se désabonne à l’unmount (pas de fuite)', () => {
    const { gateway, unmount } = renderGate(
      StubAuthGateway.withSession(AccountBuilder.anAccount().build()),
    );

    expect(gateway.unsubscribed).toBe(false);

    unmount();

    expect(gateway.unsubscribed).toBe(true);
  });

  it('l’abonnement aux recettes n’est ouvert qu’une fois la session authentifiée', () => {
    const authentifie = renderGate(StubAuthGateway.withSession(AccountBuilder.anAccount().build()));
    expect(authentifie.channel.live).toBe(1);
    authentifie.unmount();

    const sansSession = renderGate(StubAuthGateway.withoutSession());

    expect(sansSession.channel.live).toBe(0);
  });

  it('la déconnexion referme l’abonnement aux recettes', async () => {
    const { store, channel } = renderGate(
      StubAuthGateway.withSession(AccountBuilder.anAccount().build()),
    );
    act(() => {
      channel.emit([RecipeBuilder.aRecipe().withId('r-1').withTitle('Ratatouille').build()]);
    });
    expect(channel.live).toBe(1);

    await act(async () => {
      await store.dispatch(signOut());
    });

    expect(channel.live).toBe(0);
  });
});
