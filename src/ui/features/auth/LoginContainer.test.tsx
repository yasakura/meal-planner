import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { AccountBuilder } from '../../../domain/test-builders/account.builder';
import { StubAuthGateway } from '../../../domain/test-doubles/stub-auth-gateway';
import { createTestStore } from '../../store/create-test-store';
import { LoginContainer } from './LoginContainer';

function renderWithStore(
  gateway = StubAuthGateway.resolvingWith(AccountBuilder.anAccount().build()),
) {
  const store = createTestStore({ authGateway: gateway });
  const view = render(
    <Provider store={store}>
      <LoginContainer />
    </Provider>,
  );
  return { store, gateway, ...view };
}

describe('LoginContainer', () => {
  it('rend un champ email, un champ mot de passe et un bouton « Se connecter »', () => {
    renderWithStore();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();
  });

  it('désactive le bouton à l’ouverture, champs vides', () => {
    renderWithStore();

    expect(screen.getByRole('button', { name: /se connecter/i })).toBeDisabled();
  });

  it('active le bouton une fois email et mot de passe saisis', async () => {
    const user = userEvent.setup();
    renderWithStore();

    await user.type(screen.getByLabelText(/email/i), 'aurelie@foyer.test');
    await user.type(screen.getByLabelText(/mot de passe/i), 'secret');

    expect(screen.getByRole('button', { name: /se connecter/i })).toBeEnabled();
  });

  it('authentifie et transmet les identifiants au gateway lors d’un submit réussi', async () => {
    const user = userEvent.setup();
    const account = AccountBuilder.anAccount().build();
    const { store, gateway } = renderWithStore(StubAuthGateway.resolvingWith(account));

    await user.type(screen.getByLabelText(/email/i), 'aurelie@foyer.test');
    await user.type(screen.getByLabelText(/mot de passe/i), 'secret');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));

    await waitFor(() => {
      expect(store.getState().auth.status).toBe('authenticated');
    });
    expect(gateway.lastEmail).toBe('aurelie@foyer.test');
    expect(gateway.lastPassword).toBe('secret');
  });

  it('soumet le formulaire quand on presse Entrée dans le champ mot de passe', async () => {
    const user = userEvent.setup();
    const account = AccountBuilder.anAccount().build();
    const { store, gateway } = renderWithStore(StubAuthGateway.resolvingWith(account));

    await user.type(screen.getByLabelText(/email/i), 'aurelie@foyer.test');
    await user.type(screen.getByLabelText(/mot de passe/i), 'secret{Enter}');

    await waitFor(() => {
      expect(store.getState().auth.status).toBe('authenticated');
    });
    expect(gateway.lastEmail).toBe('aurelie@foyer.test');
    expect(gateway.lastPassword).toBe('secret');
  });

  it('affiche un message générique et masque le message technique en cas d’échec', async () => {
    const user = userEvent.setup();
    renderWithStore(StubAuthGateway.rejectingWith('Firebase: Error (auth/wrong-password)'));

    await user.type(screen.getByLabelText(/email/i), 'aurelie@foyer.test');
    await user.type(screen.getByLabelText(/mot de passe/i), 'mauvais');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));

    expect(await screen.findByText('Email ou mot de passe incorrect.')).toBeInTheDocument();
    expect(screen.queryByText(/Firebase/i)).not.toBeInTheDocument();
  });

  it('expose name/autocomplete sur les champs pour le remplissage automatique', () => {
    renderWithStore();

    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toHaveAttribute('name', 'email');
    expect(emailInput).toHaveAttribute('autocomplete', 'email');

    const passwordInput = screen.getByLabelText(/mot de passe/i);
    expect(passwordInput).toHaveAttribute('name', 'password');
    expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
  });

  it('annonce le message d’erreur via role="alert" en cas d’échec', async () => {
    const user = userEvent.setup();
    renderWithStore(StubAuthGateway.rejectingWith('Firebase: Error (auth/wrong-password)'));

    await user.type(screen.getByLabelText(/email/i), 'aurelie@foyer.test');
    await user.type(screen.getByLabelText(/mot de passe/i), 'mauvais');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email ou mot de passe incorrect.');
  });

  it('désactive le bouton et affiche « Connexion… » pendant que le signIn est en vol', async () => {
    const user = userEvent.setup();
    renderWithStore(StubAuthGateway.pending());

    await user.type(screen.getByLabelText(/email/i), 'aurelie@foyer.test');
    await user.type(screen.getByLabelText(/mot de passe/i), 'secret');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));

    const button = await screen.findByRole('button', { name: /connexion/i });
    expect(button).toBeDisabled();
  });
});
