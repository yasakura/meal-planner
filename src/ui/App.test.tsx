import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { StubAuthGateway } from '../domain/test-doubles/stub-auth-gateway';
import { App } from './App';
import { createTestStore } from './store/create-test-store';

// App rend désormais <Routes> (routing) → montage sous <Router> requis en plus du <Provider>.
// On monte sur /catalogue : cette route affiche le Layout partagé (TopBar marque + icône Compte,
// tab bar basse, sheet Compte) et son contenu (catalogue + création).
//
// RUPTURE VOLONTAIRE (refonte du chrome, validée) : la déconnexion et l'info env ne sont plus
// dans un bandeau texte toujours visible, mais derrière l'icône Compte de la TopBar, dans une
// sheet fermée par défaut. Les assertions correspondantes ont été reciblées sur ce parcours
// (ouvrir la sheet puis vérifier). Intention préservée, pas affaiblie.
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

  it('affiche le chrome partagé (marque + accès Compte) sur la route détail aussi', () => {
    renderAppAt('/catalogue/r-1');

    expect(screen.getByText('Meal Planner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /compte/i })).toBeInTheDocument();
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
