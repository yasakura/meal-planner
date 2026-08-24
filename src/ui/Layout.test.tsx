import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { RecipeBuilder } from '../domain/test-builders/recipe.builder';
import { StubAuthGateway } from '../domain/test-doubles/stub-auth-gateway';
import { Layout } from './Layout';
import { createTestStore } from '../test/create-test-store';
import { recipesObservationFailed, recipesObserved } from './features/catalogue/catalogue-slice';
import { convivesObserved } from './features/convives/convives-slice';

const LIEN_PERDU = 'Lien perdu — l’écran ne se met plus à jour.';

function renderLayout(store = createTestStore({ authGateway: StubAuthGateway.withoutSession() })) {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/catalogue']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/catalogue" element={<span>contenu de route</span>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('Layout', () => {
  it('compose le chrome : marque, accès Compte, tab bar et contenu de route', () => {
    renderLayout();

    expect(screen.getByText('Meal Planner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /compte/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /recettes/i })).toHaveAttribute('href', '/catalogue');
    expect(screen.getByRole('link', { name: /menu/i })).toHaveAttribute('href', '/menu');
    expect(screen.getByText('contenu de route')).toBeInTheDocument();
  });

  it('câble l’icône Compte à l’ouverture de la sheet Compte', async () => {
    const user = userEvent.setup();
    renderLayout();
    expect(screen.queryByText('Compte')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /compte/i }));

    expect(screen.getByText('Compte')).toBeInTheDocument();
  });

  it('monte la section Foyer dans la sheet, à côté de l’info dev et de la déconnexion', async () => {
    const user = userEvent.setup();
    const store = createTestStore({ authGateway: StubAuthGateway.withoutSession() });
    store.dispatch(convivesObserved([]));
    renderLayout(store);

    await user.click(screen.getByRole('button', { name: /compte/i }));

    expect(screen.getByText('Foyer')).toBeInTheDocument();
    expect(await screen.findByText('Personne dans le foyer pour le moment.')).toBeInTheDocument();
    expect(screen.getByText('Compte')).toBeInTheDocument();
    expect(screen.getByText(/Environnement : dev/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /se déconnecter/i })).toBeInTheDocument();
  });

  it('pose le bandeau de lien perdu en tête de contenu, sous la barre du haut, et rien tant que le lien tient', () => {
    const store = createTestStore({ authGateway: StubAuthGateway.withoutSession() });
    store.dispatch(recipesObserved([RecipeBuilder.aRecipe().withId('r-1').build()]));
    renderLayout(store);
    expect(screen.getByRole('main').previousElementSibling).toBe(screen.getByRole('banner'));

    act(() => {
      store.dispatch(recipesObservationFailed({ unavailable: true }));
    });

    expect(screen.getByRole('main').previousElementSibling).toHaveTextContent(LIEN_PERDU);
  });
});
