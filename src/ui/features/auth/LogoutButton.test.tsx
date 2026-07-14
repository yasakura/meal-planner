import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { AccountBuilder } from '../../../domain/test-builders/account.builder';
import { StubAuthGateway } from '../../../domain/test-doubles/stub-auth-gateway';
import { createStore } from '../../store/store';
import { observeAuthState } from './auth-slice';
import { LogoutButton } from './LogoutButton';

function renderWithSession(account = AccountBuilder.anAccount().build()) {
  const gateway = StubAuthGateway.withSession(account);
  const store = createStore({ authGateway: gateway });
  store.dispatch(observeAuthState());
  const view = render(
    <Provider store={store}>
      <LogoutButton />
    </Provider>,
  );
  return { store, gateway, ...view };
}

describe('LogoutButton', () => {
  it('rend un bouton « Se déconnecter »', () => {
    renderWithSession();

    expect(screen.getByRole('button', { name: /se déconnecter/i })).toBeInTheDocument();
  });

  it('dispatche signOut au clic → le store repasse unauthenticated', async () => {
    const user = userEvent.setup();
    const { store, gateway } = renderWithSession();
    expect(store.getState().auth.status).toBe('authenticated');

    await user.click(screen.getByRole('button', { name: /se déconnecter/i }));

    await waitFor(() => {
      expect(store.getState().auth.status).toBe('unauthenticated');
    });
    expect(gateway.signOutCalled).toBe(true);
  });
});
