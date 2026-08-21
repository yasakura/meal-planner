import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { StubAuthGateway } from '../domain/test-doubles/stub-auth-gateway';
import { Layout } from './Layout';
import { createTestStore } from './store/create-test-store';

function renderLayout() {
  const store = createTestStore({ authGateway: StubAuthGateway.withoutSession() });
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
    renderLayout();

    await user.click(screen.getByRole('button', { name: /compte/i }));

    expect(screen.getByText('Foyer')).toBeInTheDocument();
    expect(await screen.findByText('Personne dans le foyer pour le moment.')).toBeInTheDocument();
    expect(screen.getByText('Compte')).toBeInTheDocument();
    expect(screen.getByText(/Environnement : dev/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /se déconnecter/i })).toBeInTheDocument();
  });
});
