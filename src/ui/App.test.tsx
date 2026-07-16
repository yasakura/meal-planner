import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { StubAuthGateway } from '../domain/test-doubles/stub-auth-gateway';
import { App } from './App';
import { createTestStore } from './store/create-test-store';

// App rend désormais <Routes> (routing) → montage sous <Router> requis en plus du <Provider>.
// On monte sur /catalogue : cette route affiche le Layout partagé (en-tête env + logout)
// et son contenu (catalogue + création). Assertions métier inchangées.
function renderAppAt(path: string) {
  const store = createTestStore({ authGateway: StubAuthGateway.withoutSession() });
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

  it('rend l’écran de création de recette', () => {
    renderApp();
    expect(screen.getByText('Nouvelle recette')).toBeInTheDocument();
  });

  it('rend le catalogue', () => {
    renderApp();
    // Cible le <h1> de la page : depuis l'ajout de la nav, un <Link> "Catalogue"
    // partage ce texte → on vise explicitement le titre de page (rupture volontaire).
    expect(screen.getByRole('heading', { name: 'Catalogue' })).toBeInTheDocument();
  });

  it('affiche le chrome partagé (en-tête env + logout) sur la route détail aussi', () => {
    renderAppAt('/catalogue/r-1');

    expect(screen.getByText(/Meal Planner/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /se déconnecter/i })).toBeInTheDocument();
  });

  it('redirige la racine / vers /catalogue', () => {
    renderAppAt('/');

    // Cf. « rend le catalogue » : on vise le titre de page, pas le lien de nav.
    expect(screen.getByRole('heading', { name: 'Catalogue' })).toBeInTheDocument();
  });

  it('rend l’écran Menu sur la route /menu', () => {
    renderAppAt('/menu');

    expect(screen.getByRole('button', { name: /générer un menu/i })).toBeInTheDocument();
  });

  it('affiche la navigation Catalogue / Menu dans le chrome partagé', () => {
    renderApp();

    expect(screen.getByRole('link', { name: /catalogue/i })).toHaveAttribute('href', '/catalogue');
    expect(screen.getByRole('link', { name: /menu/i })).toHaveAttribute('href', '/menu');
  });
});
