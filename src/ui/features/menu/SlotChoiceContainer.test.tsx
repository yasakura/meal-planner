import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { createCalendarDate } from '../../../domain/entities/calendar-date';
import { createMenu, type Menu } from '../../../domain/entities/menu';
import { createRepas } from '../../../domain/entities/repas';
import { createSlot } from '../../../domain/entities/slot';
import { type Recipe } from '../../../domain/entities/recipe';
import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { type ListRecipes } from '../../../domain/use-cases/list-recipes';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../../test/create-test-store';
import { deferred } from '../../test-utils/deferred';
import { MenuCreateContainer } from './MenuCreateContainer';
import { generateMenu } from './menu-slice';
import { SLOT_CHOICE_ROUTE } from './slot-choice-route';
import { SlotChoiceContainer } from './SlotChoiceContainer';

const LUNDI_24_AOUT = createCalendarDate({ year: 2026, month: 8, day: 24 });

const PREMIER_MIDI = '/menu/nouveau/choisir/0/0';

const PREMIER_SOIR = '/menu/nouveau/choisir/1/0';

const DEJA_AU_MENU = 'Déjà dans ce menu';

function troisRecettes(): Recipe[] {
  return [
    RecipeBuilder.aRecipe().withId('r1').withTitle('Ratatouille').build(),
    RecipeBuilder.aRecipe().withId('r2').withTitle('Blanquette').build(),
    RecipeBuilder.aRecipe().withId('r3').withTitle('Curry de pois chiches').build(),
  ];
}

function unBrouillon(): Menu {
  return createMenu({
    dateDebut: LUNDI_24_AOUT,
    repas: [
      createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] }),
      createRepas({ jour: 0, creneau: 'soir', slots: [createSlot({ recipeId: 'r2' })] }),
      createRepas({ jour: 1, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] }),
    ],
  });
}

type TestStore = ReturnType<typeof createTestStore>;

async function arriveeAchevee() {
  await act(async () => {});
}

function renderAt(store: TestStore, entree: string) {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[entree]}>
        <Routes>
          <Route path="/menu/nouveau" element={<MenuCreateContainer />} />
          <Route path={SLOT_CHOICE_ROUTE} element={<SlotChoiceContainer />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

function catalogueApresGeneration(suite: () => Promise<Recipe[]>): ListRecipes {
  let premiere = true;
  return async () => {
    if (premiere) {
      premiere = false;
      return troisRecettes();
    }
    return suite();
  };
}

async function storeAvecBrouillon(listRecipes?: ListRecipes): Promise<TestStore> {
  const store = createTestStore({
    generateMenu: async () => unBrouillon(),
    listRecipes: listRecipes ?? (async () => troisRecettes()),
  });
  await store.dispatch(generateMenu(7));
  return store;
}

function boutonsDeRecette() {
  return screen.queryAllByRole('button', { name: /ratatouille|blanquette|curry de pois chiches/i });
}

function titresDuBrouillon() {
  return screen
    .getAllByRole('link', { name: /ratatouille|blanquette|curry de pois chiches/i })
    .map((lien) => lien.textContent);
}

describe('SlotChoiceContainer', () => {
  it('annonce le créneau visé et propose toutes les recettes du catalogue', async () => {
    const store = await storeAvecBrouillon();
    renderAt(store, PREMIER_SOIR);
    await arriveeAchevee();

    expect(screen.getByRole('heading', { name: 'Choisir une recette' })).toBeInTheDocument();
    expect(screen.getByText('lundi 24 août, Soir')).toBeInTheDocument();
    expect(boutonsDeRecette()).toHaveLength(3);
  });

  it('signale la recette déjà au menu, et laisse nue celle qui n’y est pas', async () => {
    const store = await storeAvecBrouillon();
    renderAt(store, PREMIER_MIDI);
    await arriveeAchevee();

    const dejaServie = screen.getByRole('button', { name: /blanquette/i });
    const jamaisServie = screen.getByRole('button', { name: /curry de pois chiches/i });

    expect(within(dejaServie).getByText(DEJA_AU_MENU, { exact: true })).toBeInTheDocument();
    expect(within(jamaisServie).queryByText(DEJA_AU_MENU, { exact: true })).toBeNull();
  });

  it('une recette déjà au menu reste choisissable', async () => {
    const user = userEvent.setup();
    const store = await storeAvecBrouillon();
    renderAt(store, PREMIER_SOIR);
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /ratatouille/i }));

    expect(await screen.findByRole('button', { name: /régénérer/i })).toBeInTheDocument();
    expect(titresDuBrouillon()).toEqual(['Ratatouille', 'Ratatouille', 'Ratatouille']);
  });

  it('choisir une recette la porte au créneau visé, et ramène au brouillon', async () => {
    const user = userEvent.setup();
    const store = await storeAvecBrouillon();
    renderAt(store, PREMIER_SOIR);
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /curry de pois chiches/i }));

    expect(await screen.findByRole('button', { name: /régénérer/i })).toBeInTheDocument();
    expect(titresDuBrouillon()).toEqual(['Ratatouille', 'Curry de pois chiches', 'Ratatouille']);
  });

  it('revenir par « ← Menu » laisse le brouillon tel qu’il était', async () => {
    const user = userEvent.setup();
    const store = await storeAvecBrouillon();
    renderAt(store, PREMIER_SOIR);
    await arriveeAchevee();

    await user.click(screen.getByRole('link', { name: '← Menu' }));

    expect(await screen.findByRole('button', { name: /régénérer/i })).toBeInTheDocument();
    expect(titresDuBrouillon()).toEqual(['Ratatouille', 'Blanquette', 'Ratatouille']);
  });

  it('le retour du sélecteur mène au brouillon, pas aux menus enregistrés', async () => {
    const store = await storeAvecBrouillon();
    renderAt(store, PREMIER_MIDI);
    await arriveeAchevee();

    expect(screen.getByRole('link', { name: '← Menu' })).toHaveAttribute('href', '/menu/nouveau');
  });

  it('une adresse qui ne désigne aucun créneau ne propose rien, là où la précédente proposait le catalogue', async () => {
    const store = await storeAvecBrouillon();
    const { unmount } = renderAt(store, PREMIER_MIDI);
    await arriveeAchevee();
    expect(boutonsDeRecette()).toHaveLength(3);

    unmount();
    renderAt(store, '/menu/nouveau/choisir/9/0');
    await arriveeAchevee();

    expect(
      screen.getByText('Ce créneau est introuvable dans le menu.', { exact: true }),
    ).toBeInTheDocument();
    expect(boutonsDeRecette()).toHaveLength(0);
  });

  it('sans brouillon en cours, le créneau est introuvable et le retour reste offert', async () => {
    const store = createTestStore({ listRecipes: async () => troisRecettes() });
    renderAt(store, PREMIER_MIDI);
    await arriveeAchevee();

    expect(
      screen.getByText('Ce créneau est introuvable dans le menu.', { exact: true }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Menu' })).toHaveAttribute('href', '/menu/nouveau');
  });

  it('montre un chargement tant que le catalogue se lit', async () => {
    const enVol = deferred<Recipe[]>();
    const store = await storeAvecBrouillon(catalogueApresGeneration(() => enVol.promise));
    renderAt(store, PREMIER_MIDI);
    await arriveeAchevee();

    expect(screen.getByRole('status')).toHaveTextContent('Chargement…');
    expect(boutonsDeRecette()).toHaveLength(0);

    await act(async () => enVol.resolve(troisRecettes()));

    expect(boutonsDeRecette()).toHaveLength(3);
  });

  it('un catalogue illisible porte son constat, et « Réessayer » ramène les recettes', async () => {
    const user = userEvent.setup();
    let enPanne = true;
    const store = await storeAvecBrouillon(
      catalogueApresGeneration(async () => {
        if (enPanne) throw new Error('Boom firestore');
        return troisRecettes();
      }),
    );
    renderAt(store, PREMIER_MIDI);
    await arriveeAchevee();

    expect(screen.getByRole('alert')).toHaveTextContent('Impossible de charger le catalogue.');

    enPanne = false;
    await user.click(screen.getByRole('button', { name: /réessayer/i }));

    expect(await screen.findByRole('button', { name: /curry de pois chiches/i })).toBeVisible();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('hors ligne, le sélecteur porte le constat hors ligne', async () => {
    const store = await storeAvecBrouillon(
      catalogueApresGeneration(() => Promise.reject(RepositoryUnavailableError.create())),
    );
    renderAt(store, PREMIER_MIDI);
    await arriveeAchevee();

    expect(screen.getByRole('status')).toHaveTextContent(
      'Aucune connexion — le catalogue n’a pas pu être chargé.',
    );
    expect(boutonsDeRecette()).toHaveLength(0);
  });

  it('un catalogue vide n’offre rien à choisir et le dit', async () => {
    const store = await storeAvecBrouillon(catalogueApresGeneration(async () => []));
    renderAt(store, PREMIER_MIDI);
    await arriveeAchevee();

    expect(screen.getByText('Aucune recette')).toBeInTheDocument();
    expect(boutonsDeRecette()).toHaveLength(0);
  });
});
