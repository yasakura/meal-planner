import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { createCalendarDate, type CalendarDate } from '../../../domain/entities/calendar-date';
import { type Convive } from '../../../domain/entities/convive';
import { type Unit } from '../../../domain/entities/ingredient';
import { createMenu, type Menu } from '../../../domain/entities/menu';
import { createRepas } from '../../../domain/entities/repas';
import { createSlot } from '../../../domain/entities/slot';
import { type Recipe } from '../../../domain/entities/recipe';
import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { ConviveBuilder } from '../../../domain/test-builders/convive.builder';
import { IngredientBuilder } from '../../../domain/test-builders/ingredient.builder';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../../test/create-test-store';
import { DataSubscription } from '../../DataSubscription';
import { ConviveChannel } from '../../test-utils/convive-channel';
import { MenuChannel } from '../../test-utils/menu-channel';
import { RecipeChannel } from '../../test-utils/recipe-channel';
import { LISTE_DE_COURSES_ROUTE } from './liste-de-courses-route';
import { ListeDeCoursesContainer } from './ListeDeCoursesContainer';

const LUNDI_24_AOUT = createCalendarDate({ year: 2026, month: 8, day: 24 });
const LUNDI_31_AOUT = createCalendarDate({ year: 2026, month: 8, day: 31 });

const ADRESSE_DU_24 = '/menu/2026-08-24/courses';
const ADRESSE_DU_31 = '/menu/2026-08-31/courses';

type CreneauSpec = { recipeIds: string[]; presents?: readonly string[] | null; invites?: number };

function menuDe(dateDebut: CalendarDate, creneaux: CreneauSpec[]): Menu {
  return createMenu({
    dateDebut,
    repas: creneaux.map((spec, jour) =>
      createRepas({
        jour,
        creneau: 'midi',
        slots: spec.recipeIds.map((recipeId) => createSlot({ recipeId })),
        ...(spec.presents !== undefined ? { presents: spec.presents } : {}),
        ...(spec.invites !== undefined ? { invites: spec.invites } : {}),
      }),
    ),
  });
}

const ingredient = (name: string, quantity: number, unit: Unit) =>
  IngredientBuilder.anIngredient().withName(name).withQuantity(quantity).withUnit(unit).build();

const recette = (id: string, ingredients: ReturnType<typeof ingredient>[]): Recipe =>
  RecipeBuilder.aRecipe().withId(id).withConvivesReference(4).withIngredients(ingredients).build();

const FOYER: Convive[] = [
  ConviveBuilder.aConvive().withId('c-lionel').withName('Lionel').build(),
  ConviveBuilder.aConvive().withId('c-aurelie').withName('Aurélie').build(),
  ConviveBuilder.aConvive().withId('c-rory').withName('Rory').build(),
  ConviveBuilder.aConvive().withId('c-nina').withName('Nina').build(),
];

const CATALOGUE: Recipe[] = [
  recette('r-gratin', [ingredient('Pommes de terre', 840, 'g'), ingredient('Ail', 3, 'piece')]),
  recette('r-salade', [ingredient('Pommes de terre', 500, 'g')]),
];

const MENU_DU_24 = menuDe(LUNDI_24_AOUT, [
  { recipeIds: ['r-gratin'] },
  { recipeIds: ['r-salade'] },
]);

const MENU_DU_31 = menuDe(LUNDI_31_AOUT, [
  { recipeIds: ['r-salade'] },
  { recipeIds: ['r-salade'] },
]);

type Canaux = {
  menus?: MenuChannel;
  recettes?: RecipeChannel;
  foyer?: ConviveChannel;
};

function storeAbonneA(canaux: Canaux = {}) {
  const menus = canaux.menus ?? MenuChannel.seededWith({ menus: [MENU_DU_24], indexInitial: 0 });
  const recettes = canaux.recettes ?? RecipeChannel.seededWith(CATALOGUE);
  const foyer = canaux.foyer ?? ConviveChannel.seededWith(FOYER);
  return createTestStore({
    observeMenus: menus.observeMenus,
    observeRecipes: recettes.observeRecipes,
    observeConvives: foyer.observeConvives,
  });
}

function renderAt(adresse: string, store: ReturnType<typeof storeAbonneA>) {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[adresse]}>
        <DataSubscription>
          <Routes>
            <Route path={LISTE_DE_COURSES_ROUTE} element={<ListeDeCoursesContainer />} />
          </Routes>
        </DataSubscription>
      </MemoryRouter>
    </Provider>,
  );
}

describe('ListeDeCoursesContainer', () => {
  it('la liste du menu de l’adresse montre ses lignes agrégées, quantités en français, sous la période', () => {
    renderAt(ADRESSE_DU_24, storeAbonneA());

    expect(screen.getByRole('heading', { name: 'Liste de courses' })).toBeInTheDocument();
    expect(screen.getByText('24 – 25 août')).toBeInTheDocument();
    expect(screen.getByText('Ail')).toBeInTheDocument();
    expect(screen.getByText('3 pièces')).toBeInTheDocument();
    expect(screen.getByText('Pommes de terre')).toBeInTheDocument();
    expect(screen.getByText('1,34 kg')).toBeInTheDocument();
  });

  it('l’adresse seule décrit l’écran : rechargée sur un autre menu enregistré, elle rend la liste de CE menu', () => {
    const canaux = {
      menus: MenuChannel.seededWith({ menus: [MENU_DU_24, MENU_DU_31], indexInitial: 0 }),
    };

    renderAt(ADRESSE_DU_31, storeAbonneA(canaux));

    expect(screen.getByText('31 août – 1er sept.')).toBeInTheDocument();
    expect(screen.getByText('1 kg')).toBeInTheDocument();
    expect(screen.queryByText('1,34 kg')).not.toBeInTheDocument();
  });

  it('le lien de retour ramène au menu SUR la semaine dont on consulte la liste, et non sur le menu tout court', () => {
    renderAt(ADRESSE_DU_24, storeAbonneA());

    expect(screen.getByRole('link', { name: '← Menu' })).toHaveAttribute(
      'href',
      '/menu?semaine=2026-08-24',
    );
  });

  it('tant que le foyer n’est pas arrivé, l’écran annonce un chargement et ne montre aucune ligne', () => {
    renderAt(ADRESSE_DU_24, storeAbonneA({ foyer: ConviveChannel.silent() }));

    expect(screen.getByRole('status')).toHaveTextContent('Chargement…');
    expect(screen.queryByText('1,34 kg')).not.toBeInTheDocument();
    expect(screen.queryByText('Rien à acheter')).not.toBeInTheDocument();
  });

  it('quand le foyer arrive, le chargement laisse place à la liste sans laisser de trace', () => {
    const foyer = ConviveChannel.silent();
    renderAt(ADRESSE_DU_24, storeAbonneA({ foyer }));

    act(() => {
      foyer.emit(FOYER);
    });

    expect(screen.queryByText('Chargement…')).not.toBeInTheDocument();
    expect(screen.getByText('1,34 kg')).toBeInTheDocument();
  });

  it('un dépôt injoignable est avoué, et le retour des données efface le constat sans laisser de liste périmée', () => {
    const foyer = ConviveChannel.refusingWith(RepositoryUnavailableError.create());
    renderAt(ADRESSE_DU_24, storeAbonneA({ foyer }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Aucune connexion — la liste de courses n’a pas pu être chargée.',
    );

    act(() => {
      foyer.emit(FOYER);
    });

    expect(
      screen.queryByText('Aucune connexion — la liste de courses n’a pas pu être chargée.'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('1,34 kg')).toBeInTheDocument();
  });

  it('une lecture en panne est avouée sans message technique', () => {
    renderAt(
      ADRESSE_DU_24,
      storeAbonneA({ recettes: RecipeChannel.refusingWith(new Error('permission-denied')) }),
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Impossible de charger la liste de courses.',
    );
    expect(screen.queryByText(/permission-denied/)).not.toBeInTheDocument();
  });

  it('une période qu’aucun menu enregistré ne couvre annonce le menu introuvable, sans écran muet', () => {
    renderAt(ADRESSE_DU_31, storeAbonneA());

    expect(screen.getByRole('alert')).toHaveTextContent('Menu introuvable');
    expect(screen.queryByText('1,34 kg')).not.toBeInTheDocument();
  });

  it('un menu que personne ne mange annonce qu’il n’y a rien à acheter, et non un chargement', () => {
    const deserte = menuDe(LUNDI_24_AOUT, [
      { recipeIds: ['r-gratin'], presents: [], invites: 0 },
      { recipeIds: ['r-salade'], presents: [], invites: 0 },
    ]);

    renderAt(
      ADRESSE_DU_24,
      storeAbonneA({ menus: MenuChannel.seededWith({ menus: [deserte], indexInitial: 0 }) }),
    );

    expect(screen.getByText('Rien à acheter')).toBeInTheDocument();
    expect(screen.queryByText('Chargement…')).not.toBeInTheDocument();
  });

  it('un créneau dont la recette est absente du catalogue ne retire pas de l’écran les lignes comptées', () => {
    const troue = menuDe(LUNDI_24_AOUT, [
      { recipeIds: ['r-gratin', 'r-disparue'] },
      { recipeIds: ['r-salade'] },
    ]);

    renderAt(
      ADRESSE_DU_24,
      storeAbonneA({ menus: MenuChannel.seededWith({ menus: [troue], indexInitial: 0 }) }),
    );

    expect(screen.getByText('Ail')).toBeInTheDocument();
    expect(screen.getByText('3 pièces')).toBeInTheDocument();
    expect(screen.getByText('1,34 kg')).toBeInTheDocument();
  });

  it('hors ligne, l’écran de courses n’est pas une impasse : « Réessayer » rouvre le canal du foyer, laisse les deux autres tranquilles, et n’en garde aucune trace', async () => {
    const user = userEvent.setup();
    const menus = MenuChannel.seededWith({ menus: [MENU_DU_24], indexInitial: 0 });
    const recettes = RecipeChannel.seededWith(CATALOGUE);
    const foyer = ConviveChannel.refusingWith(RepositoryUnavailableError.create());
    renderAt(ADRESSE_DU_24, storeAbonneA({ menus, recettes, foyer }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Aucune connexion — la liste de courses n’a pas pu être chargée.',
    );

    foyer.willEmit(FOYER);
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(screen.getByText('1,34 kg')).toBeInTheDocument();
    expect(
      screen.queryByText('Aucune connexion — la liste de courses n’a pas pu être chargée.'),
    ).not.toBeInTheDocument();
    expect(foyer.subscriptions).toBe(2);
    expect(foyer.live).toBe(1);
    expect(menus.subscriptions).toBe(1);
    expect(recettes.subscriptions).toBe(1);
  });

  it('un catalogue illisible : « Réessayer » rouvre SON canal, et laisse les menus et le foyer tranquilles', async () => {
    const user = userEvent.setup();
    const menus = MenuChannel.seededWith({ menus: [MENU_DU_24], indexInitial: 0 });
    const recettes = RecipeChannel.refusingWith(new Error('permission-denied'));
    const foyer = ConviveChannel.seededWith(FOYER);
    renderAt(ADRESSE_DU_24, storeAbonneA({ menus, recettes, foyer }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Impossible de charger la liste de courses.',
    );

    recettes.willEmit(CATALOGUE);
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(screen.getByText('1,34 kg')).toBeInTheDocument();
    expect(
      screen.queryByText('Impossible de charger la liste de courses.'),
    ).not.toBeInTheDocument();
    expect(recettes.subscriptions).toBe(2);
    expect(recettes.live).toBe(1);
    expect(menus.subscriptions).toBe(1);
    expect(foyer.subscriptions).toBe(1);
  });

  it('des menus enregistrés injoignables : « Réessayer » rouvre LEUR canal, et laisse le catalogue et le foyer tranquilles', async () => {
    const user = userEvent.setup();
    const menus = MenuChannel.refusingWith(RepositoryUnavailableError.create());
    const recettes = RecipeChannel.seededWith(CATALOGUE);
    const foyer = ConviveChannel.seededWith(FOYER);
    renderAt(ADRESSE_DU_24, storeAbonneA({ menus, recettes, foyer }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Aucune connexion — la liste de courses n’a pas pu être chargée.',
    );

    menus.willEmit({ menus: [MENU_DU_24], indexInitial: 0 });
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(screen.getByText('1,34 kg')).toBeInTheDocument();
    expect(
      screen.queryByText('Aucune connexion — la liste de courses n’a pas pu être chargée.'),
    ).not.toBeInTheDocument();
    expect(menus.subscriptions).toBe(2);
    expect(menus.live).toBe(1);
    expect(recettes.subscriptions).toBe(1);
    expect(foyer.subscriptions).toBe(1);
  });

  it('les états qui ne sont pas une panne n’offrent aucune relance : ni la liste, ni le menu introuvable', () => {
    const { unmount } = renderAt(ADRESSE_DU_24, storeAbonneA());

    expect(screen.getByText('1,34 kg')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Réessayer' })).not.toBeInTheDocument();

    unmount();
    renderAt(ADRESSE_DU_31, storeAbonneA());

    expect(screen.getByRole('alert')).toHaveTextContent('Menu introuvable');
    expect(screen.queryByRole('button', { name: 'Réessayer' })).not.toBeInTheDocument();
  });
});
