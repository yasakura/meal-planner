import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { createCalendarDate, type CalendarDate } from '../../../domain/entities/calendar-date';
import { createMenu, type Menu } from '../../../domain/entities/menu';
import { createRepas } from '../../../domain/entities/repas';
import { createSlot } from '../../../domain/entities/slot';
import { type Recipe } from '../../../domain/entities/recipe';
import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { type BrowseMenus, type MenuNavigation } from '../../../domain/use-cases/browse-menus';
import { type GenerateMenu } from '../../../domain/use-cases/generate-menu';
import { type ListRecipes } from '../../../domain/use-cases/list-recipes';
import { type NextMonday } from '../../../domain/use-cases/next-monday';
import { type SaveMenu } from '../../../domain/use-cases/save-menu';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../../test/create-test-store';
import { deferred } from '../../test-utils/deferred';
import { generateMenu, saveMenu } from './menu-slice';
import { MENU_APRES_ENREGISTREMENT } from './menu-return';
import { MenuContainer } from './MenuContainer';

const LUNDI_24_AOUT = createCalendarDate({ year: 2026, month: 8, day: 24 });

function aMenu(): Menu {
  return createMenu({
    dateDebut: LUNDI_24_AOUT,
    repas: [
      createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] }),
      createRepas({ jour: 0, creneau: 'soir', slots: [createSlot({ recipeId: 'r2' })] }),
      createRepas({ jour: 1, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] }),
    ],
  });
}

function twoRecipes(): Recipe[] {
  return [
    RecipeBuilder.aRecipe().withId('r1').withTitle('Ratatouille').build(),
    RecipeBuilder.aRecipe().withId('r2').withTitle('Blanquette').build(),
  ];
}

type TestStore = ReturnType<typeof createTestStore>;

async function arriveeAchevee() {
  await act(async () => {});
}

function renderOn(store: TestStore) {
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <MenuContainer />
      </MemoryRouter>
    </Provider>,
  );
}

function renderApresEnregistrement(store: TestStore) {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[MENU_APRES_ENREGISTREMENT]}>
        <MenuContainer />
      </MemoryRouter>
    </Provider>,
  );
}

function renderWithStore(overrides: {
  generateMenu?: GenerateMenu;
  listRecipes?: ListRecipes;
  nextMonday?: NextMonday;
  saveMenu?: SaveMenu;
  browseMenus?: BrowseMenus;
}) {
  const store = createTestStore(overrides);
  return { store, ...renderOn(store) };
}

describe('MenuContainer — consultation des menus enregistrés', async () => {
  const LUNDI_31_AOUT = createCalendarDate({ year: 2026, month: 8, day: 31 });
  const LUNDI_7_SEPT = createCalendarDate({ year: 2026, month: 9, day: 7 });

  function menuDeLaSemaine(dateDebut: CalendarDate): Menu {
    return createMenu({
      dateDebut,
      repas: [
        createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] }),
        createRepas({ jour: 6, creneau: 'soir', slots: [createSlot({ recipeId: 'r2' })] }),
      ],
    });
  }

  const TROIS_SEMAINES = [
    menuDeLaSemaine(LUNDI_24_AOUT),
    menuDeLaSemaine(LUNDI_31_AOUT),
    menuDeLaSemaine(LUNDI_7_SEPT),
  ];

  function browsing(menus: Menu[], indexInitial: number | null): BrowseMenus {
    return async () => ({ menus, indexInitial });
  }

  function flecheGauche() {
    return screen.getByRole('button', { name: 'Menu précédent' });
  }

  function flecheDroite() {
    return screen.getByRole('button', { name: 'Menu suivant' });
  }

  it('à l’arrivée, l’état de chargement annonce un chargement, sans prétendre générer', () => {
    renderWithStore({ browseMenus: () => new Promise<MenuNavigation>(() => {}) });

    expect(screen.getByRole('status')).toHaveTextContent('Chargement…');
  });

  it('les flèches font défiler les menus enregistrés et se verrouillent à chaque borne', async () => {
    const user = userEvent.setup();
    renderWithStore({
      browseMenus: browsing(TROIS_SEMAINES, 1),
      listRecipes: async () => twoRecipes(),
    });
    expect(await screen.findByText('31 août – 6 sept.')).toBeInTheDocument();
    expect(flecheGauche()).toBeEnabled();
    expect(flecheDroite()).toBeEnabled();

    await user.click(flecheGauche());

    expect(screen.getByText('24 – 30 août')).toBeInTheDocument();
    expect(flecheGauche()).toBeDisabled();
    expect(flecheDroite()).toBeEnabled();

    await user.click(flecheDroite());
    await user.click(flecheDroite());

    expect(screen.getByText('7 – 13 sept.')).toBeInTheDocument();
    expect(flecheGauche()).toBeEnabled();
    expect(flecheDroite()).toBeDisabled();
  });

  it('le curseur déplacé revient au menu désigné après un remontage sur le MÊME store', async () => {
    const user = userEvent.setup();
    const { store, unmount } = renderWithStore({
      browseMenus: browsing(TROIS_SEMAINES, 1),
      listRecipes: async () => twoRecipes(),
    });
    expect(await screen.findByText('31 août – 6 sept.')).toBeInTheDocument();
    await user.click(flecheGauche());
    expect(screen.getByText('24 – 30 août')).toBeInTheDocument();

    unmount();
    renderOn(store);

    expect(await screen.findByText('31 août – 6 sept.')).toBeInTheDocument();
    expect(screen.queryByText('24 – 30 août')).not.toBeInTheDocument();
  });

  it('à l’arrivée, l’écran montre le chargement avant de montrer le menu consulté', async () => {
    const lente = deferred<MenuNavigation>();
    renderWithStore({
      browseMenus: () => lente.promise,
      listRecipes: async () => twoRecipes(),
    });

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /générer un menu/i })).not.toBeInTheDocument();

    await act(async () => lente.resolve({ menus: TROIS_SEMAINES, indexInitial: 1 }));

    expect(await screen.findByText('31 août – 6 sept.')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('une relecture des titres qui échoue au remontage laisse le menu consulté à l’écran, sur le MÊME store', async () => {
    let enPanne = false;
    const { store, unmount } = renderWithStore({
      browseMenus: browsing(TROIS_SEMAINES, 1),
      listRecipes: async () => {
        if (enPanne) throw RepositoryUnavailableError.create();
        return twoRecipes();
      },
    });
    expect(await screen.findByText('31 août – 6 sept.')).toBeInTheDocument();

    unmount();
    enPanne = true;
    renderOn(store);
    await arriveeAchevee();

    expect(screen.getByText('31 août – 6 sept.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ratatouille' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('les menus enregistrés illisibles : l’écran accuse les menus, et « Réessayer » les relit', async () => {
    const user = userEvent.setup();
    let enPanne = true;
    let generations = 0;
    renderWithStore({
      browseMenus: async () => {
        if (enPanne) throw new Error('Boom firestore');
        return { menus: TROIS_SEMAINES, indexInitial: 1 };
      },
      listRecipes: async () => twoRecipes(),
      generateMenu: async () => {
        generations += 1;
        return aMenu();
      },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible de charger tes menus enregistrés.',
    );
    expect(screen.queryByText('Impossible de générer le menu.')).not.toBeInTheDocument();

    enPanne = false;
    await user.click(screen.getByRole('button', { name: /réessayer/i }));

    expect(await screen.findByText('31 août – 6 sept.')).toBeInTheDocument();
    expect(generations).toBe(0);
  });

  it('aucun menu enregistré : l’écran le dit et invite à en générer un', async () => {
    renderWithStore({ browseMenus: browsing([], null), listRecipes: async () => twoRecipes() });

    expect(await screen.findByText('Aucun menu enregistré')).toBeInTheDocument();
    expect(screen.getByText('Génère ton premier menu pour le retrouver ici')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Créer un menu' })).toHaveAttribute(
      'href',
      '/menu/nouveau',
    );
  });

  it('le constat « Menu enregistré » ne survit pas à un retour ultérieur sur l’onglet, sur le MÊME store', async () => {
    const enregistre = menuDeLaSemaine(LUNDI_24_AOUT);
    const store = createTestStore({
      browseMenus: browsing([enregistre], 0),
      listRecipes: async () => twoRecipes(),
      generateMenu: async () => enregistre,
    });
    await store.dispatch(generateMenu(14));
    await store.dispatch(saveMenu());
    const premiere = renderApresEnregistrement(store);
    expect(await screen.findByText('Menu enregistré')).toBeInTheDocument();

    premiere.unmount();
    renderOn(store);

    expect(await screen.findByText('24 – 30 août')).toBeInTheDocument();
    expect(screen.queryByText('Menu enregistré')).not.toBeInTheDocument();
  });
});
