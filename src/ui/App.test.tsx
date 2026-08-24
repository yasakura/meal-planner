import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { createCalendarDate } from '../domain/entities/calendar-date';
import { createMenu, type Menu } from '../domain/entities/menu';
import { createRepas } from '../domain/entities/repas';
import { createSlot } from '../domain/entities/slot';
import { RecipeBuilder } from '../domain/test-builders/recipe.builder';
import { StubAuthGateway } from '../domain/test-doubles/stub-auth-gateway';
import { App } from './App';
import { RecipesSubscription } from './RecipesSubscription';
import { generateMenu, saveMenu } from './features/menu/menu-slice';
import { MENU_APRES_ENREGISTREMENT } from './features/menu/menu-return';
import { type AppDependencies } from './store/store';
import { createTestStore } from '../test/create-test-store';
import { emitting } from './test-utils/recipe-channel';

function renderAppAt(path: string, overrides?: Partial<AppDependencies>) {
  const store = createTestStore({ authGateway: StubAuthGateway.withoutSession(), ...overrides });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <RecipesSubscription>
          <App />
        </RecipesSubscription>
      </MemoryRouter>
    </Provider>,
  );
}

function AdresseCourante() {
  const location = useLocation();
  return <p data-testid="adresse">{`${location.pathname}${location.search}`}</p>;
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
    renderAppAt('/catalogue/r-1/modifier', { observeRecipes: emitting([recipe]) });

    expect(await screen.findByRole('heading', { name: 'Modifier la recette' })).toBeInTheDocument();
  });

  it('/catalogue/:id rend le détail, pas le formulaire de modification', async () => {
    const recipe = RecipeBuilder.aRecipe().withId('r-1').withTitle('Ratatouille').build();
    renderAppAt('/catalogue/r-1', { observeRecipes: emitting([recipe]) });

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

  it('rend l’écran Menu sur la route /menu', async () => {
    renderAppAt('/menu');

    expect(await screen.findByRole('heading', { level: 1, name: 'Menu' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Créer un menu' })).toBeInTheDocument();
  });

  it('affiche la navigation Recettes / Menu dans le chrome partagé', () => {
    renderApp();

    expect(screen.getByRole('link', { name: /recettes/i })).toHaveAttribute('href', '/catalogue');
    expect(screen.getByRole('link', { name: /menu/i })).toHaveAttribute('href', '/menu');
  });

  const LUNDI_24_AOUT = createCalendarDate({ year: 2026, month: 8, day: 24 });

  function menuDeLaSemaine(): Menu {
    return createMenu({
      dateDebut: LUNDI_24_AOUT,
      repas: [
        createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] }),
        createRepas({ jour: 6, creneau: 'soir', slots: [createSlot({ recipeId: 'r1' })] }),
      ],
    });
  }

  function avecDeQuoiGenerer() {
    return {
      generateMenu: async () => menuDeLaSemaine(),
      listRecipes: async () => [
        RecipeBuilder.aRecipe().withId('r1').withTitle('Ratatouille').build(),
      ],
    };
  }

  it('rend l’écran de génération sur la route /menu/nouveau', async () => {
    renderAppAt('/menu/nouveau');

    expect(await screen.findByRole('heading', { name: 'Nouveau menu' })).toBeInTheDocument();
  });

  it('rend le sélecteur de recette sur /menu/nouveau/choisir/:repasIndex/:slotIndex, et non l’écran de génération', async () => {
    renderAppAt('/menu/nouveau/choisir/0/0');

    expect(await screen.findByRole('heading', { name: 'Choisir une recette' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /générer un menu/i })).toBeNull();
  });

  it('le « + » de l’onglet Menu mène à la génération, que la consultation n’offre pas', async () => {
    const user = userEvent.setup();
    renderAppAt('/menu', avecDeQuoiGenerer());

    expect(await screen.findByText('Aucun menu enregistré')).toBeInTheDocument();
    expect(screen.queryByLabelText('Début du menu')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /générer un menu/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Créer un menu' }));

    expect(screen.getByLabelText('Début du menu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /générer un menu/i })).toBeInTheDocument();
  });

  it('l’onglet Menu ne ramène jamais au brouillon, que le « + » retrouve intact', async () => {
    const user = userEvent.setup();
    renderAppAt('/menu/nouveau', avecDeQuoiGenerer());

    await user.click(await screen.findByRole('button', { name: /générer un menu/i }));
    expect(await screen.findByRole('button', { name: /régénérer/i })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Menu' }));

    expect(await screen.findByText('Aucun menu enregistré')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /régénérer/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Créer un menu' }));

    expect(await screen.findByRole('button', { name: /régénérer/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'lundi 24 août' })).toBeInTheDocument();
  });

  it('un menu enregistré ramène à la consultation, positionnée sur lui', async () => {
    const user = userEvent.setup();
    renderAppAt('/menu/nouveau', avecDeQuoiGenerer());

    await user.click(await screen.findByRole('button', { name: /générer un menu/i }));
    await user.click(await screen.findByRole('button', { name: /enregistrer/i }));

    expect(await screen.findByText('24 – 30 août')).toBeInTheDocument();
    expect(screen.getByText('Menu enregistré')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /enregistrer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /régénérer/i })).not.toBeInTheDocument();
  });

  const LUNDI_31_AOUT = createCalendarDate({ year: 2026, month: 8, day: 31 });

  function menuDatedOn(dateDebut: ReturnType<typeof createCalendarDate>): Menu {
    return createMenu({
      dateDebut,
      repas: [
        createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] }),
        createRepas({ jour: 6, creneau: 'soir', slots: [createSlot({ recipeId: 'r1' })] }),
      ],
    });
  }

  it('le menu consulté est en lecture seule ; le « + » ramène le formulaire et ses boutons', async () => {
    const user = userEvent.setup();
    renderAppAt('/menu', {
      ...avecDeQuoiGenerer(),
      browseMenus: async () => ({ menus: [menuDeLaSemaine()], indexInitial: 0 }),
    });

    expect(await screen.findByText('24 – 30 août')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'lundi 24 août' })).toBeInTheDocument();
    const lignes = screen.getAllByRole('link', { name: 'Ratatouille' });
    expect(lignes).toHaveLength(2);
    for (const ligne of lignes) {
      expect(ligne).toHaveAttribute('href', '/catalogue/r1?depuis=menu');
    }
    expect(screen.queryByRole('button', { name: /régénérer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /enregistrer/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Début du menu')).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Créer un menu' }));

    expect(screen.getByLabelText('Début du menu')).toBeInTheDocument();
    expect(screen.queryByText('24 – 30 août')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(await screen.findByRole('button', { name: /régénérer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeInTheDocument();
  });

  it('le constat d’enregistrement ne suit pas le menu voisin', async () => {
    const user = userEvent.setup();
    renderAppAt('/menu/nouveau', {
      listRecipes: async () => [
        RecipeBuilder.aRecipe().withId('r1').withTitle('Ratatouille').build(),
      ],
      generateMenu: async () => menuDatedOn(LUNDI_31_AOUT),
      browseMenus: async () => ({
        menus: [menuDeLaSemaine(), menuDatedOn(LUNDI_31_AOUT)],
        indexInitial: 0,
      }),
      saveMenu: async () => {},
    });

    await user.click(await screen.findByRole('button', { name: /générer un menu/i }));
    await user.click(await screen.findByRole('button', { name: /enregistrer/i }));
    expect(await screen.findByText('31 août – 6 sept.')).toBeInTheDocument();
    expect(screen.getByText('Menu enregistré')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Menu précédent' }));

    expect(screen.getByText('24 – 30 août')).toBeInTheDocument();
    expect(screen.queryByText('Menu enregistré')).not.toBeInTheDocument();
  });

  it('sous StrictMode, l’arrivée après un enregistrement pose le constat et nettoie l’adresse', async () => {
    const store = createTestStore({
      browseMenus: async () => ({ menus: [menuDeLaSemaine()], indexInitial: 0 }),
      listRecipes: async () => [
        RecipeBuilder.aRecipe().withId('r1').withTitle('Ratatouille').build(),
      ],
      generateMenu: async () => menuDeLaSemaine(),
      saveMenu: async () => {},
    });
    await store.dispatch(generateMenu(14));
    await store.dispatch(saveMenu());

    render(
      <StrictMode>
        <Provider store={store}>
          <MemoryRouter initialEntries={[MENU_APRES_ENREGISTREMENT]}>
            <App />
            <AdresseCourante />
          </MemoryRouter>
        </Provider>
      </StrictMode>,
    );

    expect(await screen.findByText('Menu enregistré')).toBeInTheDocument();
    expect(screen.getByTestId('adresse')).toHaveTextContent(/^\/menu$/);
  });
});
