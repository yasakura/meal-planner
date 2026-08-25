import { act, render, screen, within } from '@testing-library/react';
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
import { type GenerateMenu } from '../../../domain/use-cases/generate-menu';
import { type MenuNavigation } from '../../../domain/use-cases/observe-menus';
import { ConviveBuilder } from '../../../domain/test-builders/convive.builder';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../../test/create-test-store';
import { convivesObserved } from '../convives/convives-slice';
import { DataSubscription } from '../../DataSubscription';
import { MenuChannel } from '../../test-utils/menu-channel';
import { RecipeChannel } from '../../test-utils/recipe-channel';
import { generateMenu, saveMenu } from './menu-slice';
import { MENU_APRES_ENREGISTREMENT } from './menu-return';
import { MenuContainer } from './MenuContainer';

const LUNDI_24_AOUT = createCalendarDate({ year: 2026, month: 8, day: 24 });

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
        <DataSubscription>
          <MenuContainer />
        </DataSubscription>
      </MemoryRouter>
    </Provider>,
  );
}

function renderApresEnregistrement(store: TestStore) {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[MENU_APRES_ENREGISTREMENT]}>
        <DataSubscription>
          <MenuContainer />
        </DataSubscription>
      </MemoryRouter>
    </Provider>,
  );
}

describe('MenuContainer — consultation des menus enregistrés', () => {
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

  function navigation(menus: Menu[], indexInitial: number | null): MenuNavigation {
    return { menus, indexInitial };
  }

  function storeAbonneA(
    menus: MenuChannel,
    recettes: RecipeChannel = RecipeChannel.seededWith(twoRecipes()),
    overrides?: { generateMenu?: GenerateMenu },
  ): TestStore {
    return createTestStore({
      observeMenus: menus.observeMenus,
      observeRecipes: recettes.observeRecipes,
      listRecipes: async () => twoRecipes(),
      ...overrides,
    });
  }

  function flecheGauche() {
    return screen.getByRole('button', { name: 'Menu précédent' });
  }

  function flecheDroite() {
    return screen.getByRole('button', { name: 'Menu suivant' });
  }

  it('tant que le canal n’a rien émis, l’état de chargement annonce un chargement, sans prétendre générer', () => {
    renderOn(storeAbonneA(MenuChannel.silent()));

    expect(screen.getByRole('status')).toHaveTextContent('Chargement…');
    expect(screen.queryByRole('button', { name: /générer un menu/i })).not.toBeInTheDocument();
  });

  it('les flèches font défiler les menus enregistrés et se verrouillent à chaque borne', async () => {
    const user = userEvent.setup();
    renderOn(storeAbonneA(MenuChannel.seededWith(navigation(TROIS_SEMAINES, 1))));

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
    const store = storeAbonneA(MenuChannel.seededWith(navigation(TROIS_SEMAINES, 1)));
    const { unmount } = renderOn(store);
    expect(await screen.findByText('31 août – 6 sept.')).toBeInTheDocument();
    await user.click(flecheGauche());
    expect(screen.getByText('24 – 30 août')).toBeInTheDocument();

    unmount();
    renderOn(store);

    expect(await screen.findByText('31 août – 6 sept.')).toBeInTheDocument();
    expect(screen.queryByText('24 – 30 août')).not.toBeInTheDocument();
  });

  it('un menu enregistré ailleurs arrive à l’écran sans le moindre geste', async () => {
    const canal = MenuChannel.seededWith(navigation([menuDeLaSemaine(LUNDI_24_AOUT)], 0));
    renderOn(storeAbonneA(canal));
    expect(await screen.findByText('24 – 30 août')).toBeInTheDocument();

    act(() => canal.emit(navigation(TROIS_SEMAINES, 1)));

    expect(screen.getByText('31 août – 6 sept.')).toBeInTheDocument();
    expect(flecheGauche()).toBeEnabled();
  });

  it('l’écran montre le chargement avant de montrer le menu consulté', async () => {
    const canal = MenuChannel.silent();
    renderOn(storeAbonneA(canal));

    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => canal.emit(navigation(TROIS_SEMAINES, 1)));

    expect(await screen.findByText('31 août – 6 sept.')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('des titres injoignables au remontage laissent le menu consulté à l’écran, sur le MÊME store', async () => {
    const recettes = RecipeChannel.seededWith(twoRecipes());
    const store = storeAbonneA(MenuChannel.seededWith(navigation(TROIS_SEMAINES, 1)), recettes);
    const { unmount } = renderOn(store);
    expect(await screen.findByText('31 août – 6 sept.')).toBeInTheDocument();

    unmount();
    recettes.fail(RepositoryUnavailableError.create());
    renderOn(store);
    await arriveeAchevee();

    expect(screen.getByText('31 août – 6 sept.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ratatouille' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('les menus enregistrés illisibles : l’écran accuse les menus, et « Réessayer » rouvre leur canal', async () => {
    const user = userEvent.setup();
    const canal = MenuChannel.refusingWith(new Error('Boom firestore'));
    let generations = 0;
    renderOn(
      storeAbonneA(canal, RecipeChannel.seededWith(twoRecipes()), {
        generateMenu: async () => {
          generations += 1;
          return menuDeLaSemaine(LUNDI_24_AOUT);
        },
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible de charger tes menus enregistrés.',
    );
    expect(screen.queryByText('Impossible de générer le menu.')).not.toBeInTheDocument();

    canal.willEmit(navigation(TROIS_SEMAINES, 1));
    await user.click(screen.getByRole('button', { name: /réessayer/i }));

    expect(await screen.findByText('31 août – 6 sept.')).toBeInTheDocument();
    expect(canal.subscriptions).toBe(2);
    expect(canal.live).toBe(1);
    expect(generations).toBe(0);
  });

  it('hors ligne, l’écran des menus n’est pas une impasse : « Réessayer » rouvre leur canal', async () => {
    const user = userEvent.setup();
    const canal = MenuChannel.refusingWith(RepositoryUnavailableError.create());
    renderOn(storeAbonneA(canal));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Aucune connexion — le menu n’a pas pu être chargé.',
    );

    canal.willEmit(navigation(TROIS_SEMAINES, 1));
    await user.click(screen.getByRole('button', { name: /réessayer/i }));

    expect(await screen.findByText('31 août – 6 sept.')).toBeInTheDocument();
    expect(
      screen.queryByText('Aucune connexion — le menu n’a pas pu être chargé.'),
    ).not.toBeInTheDocument();
    expect(canal.subscriptions).toBe(2);
    expect(canal.live).toBe(1);
  });

  it('des titres hors ligne laissent le menu à l’écran, disent pourquoi ses créneaux n’ont plus de nom, et « Réessayer » rouvre LEUR canal en laissant celui des menus tranquille', async () => {
    const user = userEvent.setup();
    const recettes = RecipeChannel.refusingWith(RepositoryUnavailableError.create());
    const menus = MenuChannel.seededWith(navigation(TROIS_SEMAINES, 1));
    renderOn(storeAbonneA(menus, recettes));

    expect(await screen.findByText('31 août – 6 sept.')).toBeInTheDocument();
    expect(screen.getAllByText('Titre indisponible')).toHaveLength(2);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Aucune connexion — les noms des recettes n’ont pas pu être chargés.',
    );
    expect(screen.getByRole('button', { name: 'Menu précédent' })).toBeEnabled();

    recettes.willEmit(twoRecipes());
    await user.click(screen.getByRole('button', { name: /réessayer/i }));

    expect(await screen.findByRole('link', { name: 'Ratatouille' })).toBeInTheDocument();
    expect(screen.getByText('31 août – 6 sept.')).toBeInTheDocument();
    expect(screen.queryByText('Titre indisponible')).not.toBeInTheDocument();
    expect(recettes.subscriptions).toBe(2);
    expect(recettes.live).toBe(1);
    expect(menus.subscriptions).toBe(1);
  });

  it('relancer les titres ne retire pas le menu de l’écran : il reste, son constat annonce le chargement et n’offre plus de relance', async () => {
    const user = userEvent.setup();
    const recettes = RecipeChannel.refusingWith(RepositoryUnavailableError.create());
    const menus = MenuChannel.seededWith(navigation(TROIS_SEMAINES, 1));
    renderOn(storeAbonneA(menus, recettes));
    expect(await screen.findByText('31 août – 6 sept.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument();

    recettes.willStaySilent();
    await user.click(screen.getByRole('button', { name: /réessayer/i }));

    expect(screen.getByText('31 août – 6 sept.')).toBeInTheDocument();
    expect(screen.getAllByText('Titre indisponible')).toHaveLength(2);
    expect(screen.getByRole('status')).toHaveTextContent('Chargement des noms des recettes…');
    expect(screen.queryByRole('button', { name: /réessayer/i })).not.toBeInTheDocument();
    expect(recettes.subscriptions).toBe(2);
    expect(menus.subscriptions).toBe(1);
  });

  it('le menu survit au remontage sur le MÊME store après une relance des titres restée sans réponse', async () => {
    const user = userEvent.setup();
    const recettes = RecipeChannel.refusingWith(RepositoryUnavailableError.create());
    const store = storeAbonneA(MenuChannel.seededWith(navigation(TROIS_SEMAINES, 1)), recettes);
    const { unmount } = renderOn(store);
    expect(await screen.findByText('31 août – 6 sept.')).toBeInTheDocument();
    recettes.willStaySilent();
    await user.click(screen.getByRole('button', { name: /réessayer/i }));

    unmount();
    renderOn(store);
    await arriveeAchevee();

    expect(screen.getByText('31 août – 6 sept.')).toBeInTheDocument();
    expect(screen.getAllByText('Titre indisponible')).toHaveLength(2);
    expect(screen.getByRole('status')).toHaveTextContent('Chargement des noms des recettes…');
  });

  it('aucun menu enregistré : l’écran le dit et invite à en générer un', async () => {
    renderOn(storeAbonneA(MenuChannel.seededWith(navigation([], null))));

    expect(await screen.findByText('Aucun menu enregistré')).toBeInTheDocument();
    expect(screen.getByText('Génère ton premier menu pour le retrouver ici')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Créer un menu' })).toHaveAttribute(
      'href',
      '/menu/nouveau',
    );
  });

  it('le constat « Menu enregistré » ne survit pas à un retour ultérieur sur l’onglet, sur le MÊME store', async () => {
    const enregistre = menuDeLaSemaine(LUNDI_24_AOUT);
    const store = storeAbonneA(
      MenuChannel.seededWith(navigation([enregistre], 0)),
      RecipeChannel.seededWith(twoRecipes()),
      { generateMenu: async () => enregistre },
    );
    await store.dispatch(generateMenu(14));
    await store.dispatch(saveMenu());
    const premiere = renderApresEnregistrement(store);
    expect(await screen.findByText('Menu enregistré')).toBeInTheDocument();

    premiere.unmount();
    renderOn(store);

    expect(await screen.findByText('24 – 30 août')).toBeInTheDocument();
    expect(screen.queryByText('Menu enregistré')).not.toBeInTheDocument();
  });

  it('le menu refusé par le serveur s’efface de l’écran, constat compris, sans un geste', async () => {
    const enregistre = menuDeLaSemaine(LUNDI_24_AOUT);
    const canal = MenuChannel.seededWith(navigation([enregistre], 0));
    const store = storeAbonneA(canal, RecipeChannel.seededWith(twoRecipes()), {
      generateMenu: async () => enregistre,
    });
    await store.dispatch(generateMenu(14));
    await store.dispatch(saveMenu());
    renderApresEnregistrement(store);
    expect(await screen.findByText('Menu enregistré')).toBeInTheDocument();
    expect(screen.getByText('24 – 30 août')).toBeInTheDocument();

    act(() => canal.emit(navigation([], null)));

    expect(screen.queryByText('Menu enregistré')).not.toBeInTheDocument();
    expect(screen.queryByText('24 – 30 août')).not.toBeInTheDocument();
    expect(screen.getByText('Aucun menu enregistré')).toBeInTheDocument();
  });
});

describe('MenuContainer — le menu consulté s’annonce sans se modifier', () => {
  const AURELIE = ConviveBuilder.aConvive().withId('c-au').withName('Aurélie').build();

  function menuAvecUnJourDeSortie(): Menu {
    return createMenu({
      dateDebut: LUNDI_24_AOUT,
      repas: [
        createRepas({
          jour: 0,
          creneau: 'midi',
          slots: [createSlot({ recipeId: 'r1' })],
          presents: [],
          invites: 0,
        }),
        createRepas({ jour: 0, creneau: 'soir', slots: [createSlot({ recipeId: 'r2' })] }),
      ],
    });
  }

  function consulterLeMenuDeLaSortie() {
    const store = createTestStore({
      observeMenus: MenuChannel.seededWith({
        menus: [menuAvecUnJourDeSortie()],
        indexInitial: 0,
      }).observeMenus,
      observeRecipes: RecipeChannel.seededWith(twoRecipes()).observeRecipes,
    });
    store.dispatch(convivesObserved([AURELIE]));
    return renderOn(store);
  }

  function ligneDe(titre: string) {
    return screen.getByRole('link', { name: titre }).closest('li') as HTMLElement;
  }

  it('le créneau enregistré que personne ne mange annonce la sortie de la famille, là où son voisin du même jour n’annonce rien', async () => {
    consulterLeMenuDeLaSortie();

    expect(await screen.findByRole('link', { name: 'Ratatouille' })).toBeInTheDocument();
    expect(
      within(ligneDe('Ratatouille')).getByText('La famille est de sortie'),
    ).toBeInTheDocument();
    expect(within(ligneDe('Blanquette')).queryByText('La famille est de sortie')).toBeNull();
  });

  it('le menu consulté n’offre aucun rond de présence ni compteur d’invités : on n’y modifie pas qui mange', async () => {
    consulterLeMenuDeLaSortie();

    expect(await screen.findByRole('link', { name: 'Ratatouille' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Aurélie au repas de/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Ajouter un invité au repas de/ })).toBeNull();
    expect(screen.queryByText('0 invité')).toBeNull();
  });
});
