import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { StubAuthGateway } from '../domain/test-doubles/stub-auth-gateway';
import { App } from './App';
import { createStore } from './store/store';

// App câble désormais LogoutButton (useAppDispatch) → montage sous <Provider> requis.
function renderApp() {
  const store = createStore({ authGateway: StubAuthGateway.withoutSession() });
  return render(
    <Provider store={store}>
      <App />
    </Provider>,
  );
}

describe('App', () => {
  it('rend le titre Meal Planner', () => {
    renderApp();
    expect(screen.getByText(/Meal Planner/)).toBeInTheDocument();
  });

  it('rend le bouton de déconnexion', () => {
    renderApp();

    expect(screen.getByRole('button', { name: /se déconnecter/i })).toBeInTheDocument();
  });

  it("affiche 'env : dev' par défaut dans le badge d'environnement", () => {
    renderApp();
    expect(screen.getByText(/env : dev/)).toBeInTheDocument();
  });

  it("affiche 'Firebase : non configuré' par défaut dans le badge d'environnement", () => {
    renderApp();
    expect(screen.getByText(/Firebase : non configuré/)).toBeInTheDocument();
  });
});
