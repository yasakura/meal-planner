import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { RecipeBuilder } from '../domain/test-builders/recipe.builder';
import { StubAuthGateway } from '../domain/test-doubles/stub-auth-gateway';
import { App } from './App';
import { type AppDependencies } from './store/store';
import { createTestStore } from './store/create-test-store';

function renderAppAt(path: string, overrides?: Partial<AppDependencies>) {
  const store = createTestStore({ authGateway: StubAuthGateway.withoutSession(), ...overrides });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </Provider>,
  );
}

function renderApp() {
  return renderAppAt('/catalogue');
}

describe('App', () => {
  it('rend le titre Meal Planner', () => {
    renderApp();
    expect(screen.getByText(/Meal Planner/)).toBeInTheDocument();
  });

  it('ne montre pas la sheet Compte au montage', () => {
    renderApp();

    expect(screen.queryByText('Compte')).not.toBeInTheDocument();
  });

  it('permet la déconnexion via la sheet ouverte par l’icône Compte', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: /compte/i }));

    expect(screen.getByRole('button', { name: /se déconnecter/i })).toBeInTheDocument();
  });

  it("affiche 'Environnement : dev' dans la sheet Compte (env dev)", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: /compte/i }));

    expect(screen.getByText(/Environnement : dev/)).toBeInTheDocument();
  });

  it("affiche 'Firebase : non configuré' dans la sheet Compte par défaut", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: /compte/i }));

    expect(screen.getByText(/Firebase : non configuré/)).toBeInTheDocument();
  });

  it('rend l’écran de création de recette sur /catalogue/nouvelle', () => {
    renderAppAt('/catalogue/nouvelle');
    expect(screen.getByText('Nouvelle recette')).toBeInTheDocument();
  });

  it('ne rend PAS le formulaire de création sous /catalogue (liste seule)', () => {
    renderApp();
    expect(screen.queryByText('Nouvelle recette')).not.toBeInTheDocument();
  });

  it('/catalogue/nouvelle rend le formulaire, pas le détail (précédence statique sur :id)', async () => {
    renderAppAt('/catalogue/nouvelle');

    expect(screen.getByText('Nouvelle recette')).toBeInTheDocument();
    expect(screen.queryByText(/introuvable/i)).not.toBeInTheDocument();
  });

  it('rend le formulaire de modification sur /catalogue/:id/modifier', async () => {
    const recipe = RecipeBuilder.aRecipe().withId('r-1').withTitle('Ratatouille').build();
    renderAppAt('/catalogue/r-1/modifier', { getRecipe: async () => recipe });

    expect(await screen.findByRole('heading', { name: 'Modifier la recette' })).toBeInTheDocument();
  });

  it('/catalogue/:id rend le détail, pas le formulaire de modification', async () => {
    const recipe = RecipeBuilder.aRecipe().withId('r-1').withTitle('Ratatouille').build();
    renderAppAt('/catalogue/r-1', { getRecipe: async () => recipe });

    expect(await screen.findByRole('heading', { name: 'Ratatouille' })).toBeInTheDocument();
    expect(screen.queryByText('Modifier la recette')).not.toBeInTheDocument();
  });

  it('/catalogue/:id rend le détail (route dynamique), pas le formulaire', async () => {
    renderAppAt('/catalogue/r-1');

    expect(await screen.findByRole('alert')).toHaveTextContent(/introuvable/i);
    expect(screen.queryByText('Nouvelle recette')).not.toBeInTheDocument();
  });

  it('rend le catalogue', () => {
    renderApp();
    expect(screen.getByRole('heading', { name: 'Recettes' })).toBeInTheDocument();
  });

  it('affiche le chrome partagé (marque + accès Compte) sur la route détail aussi', () => {
    renderAppAt('/catalogue/r-1');

    expect(screen.getByText('Meal Planner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /compte/i })).toBeInTheDocument();
  });

  it('redirige la racine / vers /catalogue', () => {
    renderAppAt('/');

    expect(screen.getByRole('heading', { name: 'Recettes' })).toBeInTheDocument();
  });

  it('rend l’écran Menu sur la route /menu', () => {
    renderAppAt('/menu');

    expect(screen.getByRole('button', { name: /générer un menu/i })).toBeInTheDocument();
  });

  it('affiche la navigation Recettes / Menu dans le chrome partagé', () => {
    renderApp();

    expect(screen.getByRole('link', { name: /recettes/i })).toHaveAttribute('href', '/catalogue');
    expect(screen.getByRole('link', { name: /menu/i })).toHaveAttribute('href', '/menu');
  });
});
