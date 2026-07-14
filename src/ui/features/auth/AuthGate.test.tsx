import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { AccountBuilder } from '../../../domain/test-builders/account.builder';
import { StubAuthGateway } from '../../../domain/test-doubles/stub-auth-gateway';
import { createStore } from '../../store/store';
import { AuthGate } from './AuthGate';

function renderGate(gateway: StubAuthGateway) {
  const store = createStore({ authGateway: gateway });
  const view = render(
    <Provider store={store}>
      <AuthGate>
        <div>CONTENU APP</div>
      </AuthGate>
    </Provider>,
  );
  return { store, gateway, ...view };
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

    // role="status" est unique au Splash (le login ne l'a pas) → discrimine vraiment,
    // contrairement au titre « Meal Planner » que login ET splash partagent.
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
});
