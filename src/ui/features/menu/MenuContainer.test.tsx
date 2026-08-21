import { act, fireEvent, render, screen, within } from '@testing-library/react';
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
import { nextMondayUseCase, type NextMonday } from '../../../domain/use-cases/next-monday';
import { type SaveMenu } from '../../../domain/use-cases/save-menu';
import { DriftingClock } from '../../../domain/test-doubles/drifting-clock';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../store/create-test-store';
import { deferred } from '../../test-utils/deferred';
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

function choisirLaDateDeDebut(valeur: string) {
  fireEvent.change(screen.getByLabelText('Début du menu'), { target: { value: valeur } });
}

function menuDatedOn(dateDebut: CalendarDate): Menu {
  return createMenu({
    dateDebut,
    repas: [createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] })],
  });
}

describe('MenuContainer', () => {
  it('affiche une invite et un bouton « Générer un menu » à l’ouverture', async () => {
    renderWithStore({});
    await arriveeAchevee();

    expect(screen.getByRole('button', { name: /générer un menu/i })).toBeInTheDocument();
  });

  it('génère un menu de 14 jours (« 2 semaines ») par défaut au clic sur « Générer un menu »', async () => {
    const user = userEvent.setup();
    const daysReceived: number[] = [];
    const generate: GenerateMenu = async ({ days }) => {
      daysReceived.push(days);
      return aMenu();
    };
    renderWithStore({ generateMenu: generate, listRecipes: async () => twoRecipes() });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(await screen.findByText('lundi 24 août')).toBeInTheDocument();
    expect(daysReceived).toEqual([14]);
  });

  it('rend le sélecteur segmenté avec « 2 semaines » actif par défaut', async () => {
    renderWithStore({});
    await arriveeAchevee();

    expect(screen.getByRole('button', { name: /2 semaines/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /1 semaine/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('sélectionner « 1 semaine » puis Générer → generateMenu avec 7 jours', async () => {
    const user = userEvent.setup();
    const daysReceived: number[] = [];
    const generate: GenerateMenu = async ({ days }) => {
      daysReceived.push(days);
      return aMenu();
    };
    renderWithStore({ generateMenu: generate, listRecipes: async () => twoRecipes() });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /1 semaine/i }));
    expect(screen.getByRole('button', { name: /1 semaine/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(await screen.findByText('lundi 24 août')).toBeInTheDocument();
    expect(daysReceived).toEqual([7]);
  });

  it('propose encore le sélecteur segmenté sur l’état « menu généré »', async () => {
    const user = userEvent.setup();
    renderWithStore({ generateMenu: async () => aMenu(), listRecipes: async () => twoRecipes() });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    await screen.findByRole('button', { name: /régénérer/i });

    expect(screen.getByRole('button', { name: /1 semaine/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2 semaines/i })).toBeInTheDocument();
  });

  it('depuis le menu affiché, cliquer « 1 semaine » bascule le segment et régénère sur 7 jours', async () => {
    const user = userEvent.setup();
    const daysReceived: number[] = [];
    const generate: GenerateMenu = async ({ days }) => {
      daysReceived.push(days);
      return aMenu();
    };
    renderWithStore({ generateMenu: generate, listRecipes: async () => twoRecipes() });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    await screen.findByRole('button', { name: /régénérer/i });
    expect(screen.getByRole('button', { name: /2 semaines/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: /1 semaine/i }));

    expect(screen.getByRole('button', { name: /1 semaine/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /2 semaines/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    await user.click(screen.getByRole('button', { name: /régénérer/i }));
    await screen.findByText('lundi 24 août');

    expect(daysReceived).toEqual([14, 7]);
  });

  it('affiche l’indicateur de chargement pendant la génération', async () => {
    const user = userEvent.setup();
    const pending: GenerateMenu = () => new Promise<Menu>(() => {});
    renderWithStore({ generateMenu: pending, listRecipes: async () => twoRecipes() });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('à l’arrivée, l’état de chargement annonce un chargement, sans prétendre générer', () => {
    renderWithStore({ browseMenus: () => new Promise<MenuNavigation>(() => {}) });

    expect(screen.getByRole('status')).toHaveTextContent('Chargement…');
  });

  it('pendant la génération, l’état de chargement annonce le même chargement', async () => {
    const user = userEvent.setup();
    const pending: GenerateMenu = () => new Promise<Menu>(() => {});
    renderWithStore({ generateMenu: pending, listRecipes: async () => twoRecipes() });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(screen.getByRole('status')).toHaveTextContent('Chargement…');
  });

  it('affiche un message sobre + « Réessayer » en cas d’échec, et régénère au clic', async () => {
    const user = userEvent.setup();
    let count = 0;
    const failThenSucceed: GenerateMenu = async ({ days }) => {
      count += 1;
      if (count === 1) throw new Error('Impossible de générer un menu sans recette');
      void days;
      return aMenu();
    };
    renderWithStore({ generateMenu: failThenSucceed, listRecipes: async () => twoRecipes() });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de générer le menu.');
    expect(screen.queryByText(/sans recette/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /réessayer/i }));

    expect(await screen.findByText('lundi 24 août')).toBeInTheDocument();
    expect(count).toBe(2);
  });

  it('hors ligne, la génération porte le constat du menu et n’offre aucun bouton', async () => {
    const user = userEvent.setup();
    renderWithStore({
      generateMenu: async () => aMenu(),
      listRecipes: () => Promise.reject(RepositoryUnavailableError.create()),
    });
    await arriveeAchevee();

    expect(screen.getByRole('button', { name: /générer un menu/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Aucune connexion — le menu n’a pas pu être chargé.',
    );
    expect(screen.queryByRole('button', { name: /générer un menu/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /réessayer/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Impossible de générer le menu.')).not.toBeInTheDocument();
    expect(screen.queryByText(/Ajoute d'abord des recettes/)).not.toBeInTheDocument();
  });

  it('le réseau revenu, revenir sur l’écran rend l’offre de générer, et le menu se génère', async () => {
    const user = userEvent.setup();
    let enPanne = true;
    const { store, unmount } = renderWithStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => {
        if (enPanne) throw RepositoryUnavailableError.create();
        return twoRecipes();
      },
    });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    const constat = await screen.findByText('Aucune connexion — le menu n’a pas pu être chargé.');
    expect(constat).toBeInTheDocument();

    unmount();
    enPanne = false;
    renderOn(store);
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(await screen.findByText('lundi 24 août')).toBeInTheDocument();
    expect(
      screen.queryByText('Aucune connexion — le menu n’a pas pu être chargé.'),
    ).not.toBeInTheDocument();
  });

  it('catalogue vide : affiche un message actionnable invitant à ajouter des recettes', async () => {
    const user = userEvent.setup();
    renderWithStore({ generateMenu: async () => aMenu(), listRecipes: async () => [] });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Ajoute d'abord des recettes pour générer un menu.",
    );
  });

  it('erreur non fonctionnelle : affiche le message générique, jamais le détail technique', async () => {
    const user = userEvent.setup();
    const generate: GenerateMenu = async () => {
      throw new Error('Boom firestore interne');
    };
    renderWithStore({ generateMenu: generate, listRecipes: async () => twoRecipes() });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Impossible de générer le menu.');
    expect(screen.queryByText(/Boom firestore/i)).not.toBeInTheDocument();
  });

  it('nomme chaque jour par sa date, dérivée de la date de début DU MENU affiché', async () => {
    const user = userEvent.setup();
    const menu = createMenu({
      dateDebut: createCalendarDate({ year: 2027, month: 1, day: 4 }),
      repas: [
        createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] }),
        createRepas({ jour: 1, creneau: 'midi', slots: [createSlot({ recipeId: 'r2' })] }),
      ],
    });
    renderWithStore({ generateMenu: async () => menu, listRecipes: async () => twoRecipes() });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    await screen.findByText('lundi 4 janvier');
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'lundi 4 janvier',
      'mardi 5 janvier',
    ]);
  });

  it('regroupe les repas par jour et affiche le titre de la recette de chaque créneau', async () => {
    const user = userEvent.setup();
    renderWithStore({ generateMenu: async () => aMenu(), listRecipes: async () => twoRecipes() });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    const jour1 = (await screen.findByText('lundi 24 août')).closest('section') as HTMLElement;
    expect(within(jour1).getByText('Midi')).toBeInTheDocument();
    expect(within(jour1).getByText('Ratatouille')).toBeInTheDocument();
    expect(within(jour1).getByText('Soir')).toBeInTheDocument();
    expect(within(jour1).getByText('Blanquette')).toBeInTheDocument();

    const jour2 = screen.getByText('mardi 25 août').closest('section') as HTMLElement;
    expect(within(jour2).getByText('Midi')).toBeInTheDocument();
    expect(within(jour2).getByText('Ratatouille')).toBeInTheDocument();
  });

  it('affiche les jours dans l’ordre croissant et, au sein d’un jour, Midi avant Soir', async () => {
    const user = userEvent.setup();
    renderWithStore({ generateMenu: async () => aMenu(), listRecipes: async () => twoRecipes() });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    await screen.findByText('lundi 24 août');
    const dayLabels = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(dayLabels).toEqual(['lundi 24 août', 'mardi 25 août']);

    const jour1 = screen.getByText('lundi 24 août').closest('section') as HTMLElement;
    const creneaux = within(jour1)
      .getAllByText(/^(Midi|Soir)$/)
      .map((el) => el.textContent);
    expect(creneaux).toEqual(['Midi', 'Soir']);
  });

  it('affiche un libellé de repli quand la recette d’un créneau est introuvable', async () => {
    const user = userEvent.setup();
    const menu = createMenu({
      dateDebut: LUNDI_24_AOUT,
      repas: [
        createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'inconnu' })] }),
      ],
    });
    renderWithStore({ generateMenu: async () => menu, listRecipes: async () => twoRecipes() });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(await screen.findByText('Recette inconnue')).toBeInTheDocument();
  });

  it('propose « Régénérer » une fois un menu affiché', async () => {
    const user = userEvent.setup();
    renderWithStore({ generateMenu: async () => aMenu(), listRecipes: async () => twoRecipes() });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(await screen.findByRole('button', { name: /régénérer/i })).toBeInTheDocument();
  });

  it('la fenêtre choisie survit à un remontage sur le MÊME store', async () => {
    const user = userEvent.setup();
    const { store, unmount } = renderWithStore({});
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /1 semaine/i }));
    unmount();
    renderOn(store);
    await arriveeAchevee();

    expect(screen.getByRole('button', { name: /1 semaine/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /2 semaines/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('après un remontage, « Régénérer » régénère sur la fenêtre choisie, pas sur 14', async () => {
    const user = userEvent.setup();
    const daysReceived: number[] = [];
    const generate: GenerateMenu = async ({ days }) => {
      daysReceived.push(days);
      return aMenu();
    };
    const { store, unmount } = renderWithStore({
      generateMenu: generate,
      listRecipes: async () => twoRecipes(),
    });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /1 semaine/i }));
    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    await screen.findByText('lundi 24 août');

    unmount();
    renderOn(store);
    await arriveeAchevee();

    await user.click(await screen.findByRole('button', { name: /régénérer/i }));
    await screen.findByText('lundi 24 août');

    expect(daysReceived).toEqual([7, 7]);
  });

  it('après un remontage, « Réessayer » régénère sur la fenêtre choisie, pas sur 14', async () => {
    const user = userEvent.setup();
    const daysReceived: number[] = [];
    let count = 0;
    const failThenSucceed: GenerateMenu = async ({ days }) => {
      daysReceived.push(days);
      count += 1;
      if (count === 1) throw new Error('Boom');
      return aMenu();
    };
    const { store, unmount } = renderWithStore({
      generateMenu: failThenSucceed,
      listRecipes: async () => twoRecipes(),
    });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /1 semaine/i }));
    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    await screen.findByRole('alert');

    unmount();
    renderOn(store);
    await arriveeAchevee();

    await user.click(await screen.findByRole('button', { name: /réessayer/i }));
    await screen.findByText('lundi 24 août');

    expect(daysReceived).toEqual([7, 7]);
  });
  it('arriver sur l’écran avec un menu déjà généré relit les recettes et rafraîchit les titres', async () => {
    const user = userEvent.setup();
    let catalogue = twoRecipes();
    const { store, unmount } = renderWithStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => catalogue,
    });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    expect(await screen.findAllByText('Ratatouille')).toHaveLength(2);

    unmount();
    catalogue = [
      RecipeBuilder.aRecipe().withId('r1').withTitle('Tian de légumes').build(),
      RecipeBuilder.aRecipe().withId('r2').withTitle('Blanquette').build(),
    ];
    renderOn(store);
    await arriveeAchevee();

    expect(await screen.findAllByText('Tian de légumes')).toHaveLength(2);
    expect(screen.queryAllByText('Ratatouille')).toHaveLength(0);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'lundi 24 août',
      'mardi 25 août',
    ]);
  });

  it('une relecture en vol n’affiche aucun indicateur de chargement par-dessus le menu', async () => {
    const user = userEvent.setup();
    let relectureEnVol = false;
    const { store, unmount } = renderWithStore({
      generateMenu: async () => aMenu(),
      listRecipes: () =>
        relectureEnVol ? new Promise<Recipe[]>(() => {}) : Promise.resolve(twoRecipes()),
    });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    expect(await screen.findAllByText('Ratatouille')).toHaveLength(2);

    unmount();
    relectureEnVol = true;
    renderOn(store);
    await arriveeAchevee();

    expect(await screen.findAllByText('Ratatouille')).toHaveLength(2);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('hors ligne, l’écran du menu porte le constat du menu et n’offre plus aucun bouton', async () => {
    const user = userEvent.setup();
    let enPanne = false;
    const { store, unmount } = renderWithStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => {
        if (enPanne) throw RepositoryUnavailableError.create();
        return twoRecipes();
      },
    });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    expect(await screen.findByRole('button', { name: /régénérer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeInTheDocument();
    expect(screen.getAllByText('Ratatouille')).toHaveLength(2);

    unmount();
    enPanne = true;
    renderOn(store);
    await arriveeAchevee();

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Aucune connexion — le menu n’a pas pu être chargé.',
    );
    expect(screen.queryByRole('button', { name: /régénérer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /enregistrer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /réessayer/i })).not.toBeInTheDocument();
    expect(screen.queryAllByText('Ratatouille')).toHaveLength(0);
  });

  it('le réseau revenu, revenir sur l’écran fait réapparaître le menu avec ses titres à jour', async () => {
    const user = userEvent.setup();
    let catalogue = twoRecipes();
    let enPanne = false;
    const { store, unmount } = renderWithStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => {
        if (enPanne) throw RepositoryUnavailableError.create();
        return catalogue;
      },
    });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    expect(await screen.findAllByText('Ratatouille')).toHaveLength(2);

    unmount();
    enPanne = true;
    const horsLigne = renderOn(store);
    await arriveeAchevee();
    const constat = await screen.findByText('Aucune connexion — le menu n’a pas pu être chargé.');
    expect(constat).toBeInTheDocument();

    horsLigne.unmount();
    enPanne = false;
    catalogue = [
      RecipeBuilder.aRecipe().withId('r1').withTitle('Tian de légumes').build(),
      RecipeBuilder.aRecipe().withId('r2').withTitle('Blanquette').build(),
    ];
    renderOn(store);
    await arriveeAchevee();

    expect(await screen.findAllByText('Tian de légumes')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /régénérer/i })).toBeInTheDocument();
    expect(
      screen.queryByText('Aucune connexion — le menu n’a pas pu être chargé.'),
    ).not.toBeInTheDocument();
  });

  it('sans menu généré, arriver sur l’écran ne relit pas les recettes', async () => {
    let listCalls = 0;
    renderWithStore({
      listRecipes: async () => {
        listCalls += 1;
        return twoRecipes();
      },
    });

    expect(await screen.findByRole('button', { name: /générer un menu/i })).toBeInTheDocument();
    expect(listCalls).toBe(0);
  });

  it('affiche un champ « Début du menu » renseigné au prochain lundi', async () => {
    renderWithStore({});
    await arriveeAchevee();

    expect(screen.getByLabelText('Début du menu')).toHaveValue('2026-08-24');
  });

  it('choisir une date de début, puis générer : le menu part de cette date', async () => {
    const user = userEvent.setup();
    const generate: GenerateMenu = async ({ dateDebut }) => menuDatedOn(dateDebut);
    renderWithStore({ generateMenu: generate, listRecipes: async () => twoRecipes() });
    await arriveeAchevee();

    choisirLaDateDeDebut('2026-09-02');
    expect(screen.getByLabelText('Début du menu')).toHaveValue('2026-09-02');

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(await screen.findByText('mercredi 2 septembre')).toBeInTheDocument();
  });

  it('depuis le menu affiché, changer la date et régénérer : le menu repart de la nouvelle date', async () => {
    const user = userEvent.setup();
    const generate: GenerateMenu = async ({ dateDebut }) => menuDatedOn(dateDebut);
    renderWithStore({ generateMenu: generate, listRecipes: async () => twoRecipes() });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    expect(await screen.findByText('lundi 24 août')).toBeInTheDocument();

    choisirLaDateDeDebut('2026-09-02');
    expect(screen.getByLabelText('Début du menu')).toHaveValue('2026-09-02');

    await user.click(screen.getByRole('button', { name: /régénérer/i }));

    expect(await screen.findByText('mercredi 2 septembre')).toBeInTheDocument();
    expect(screen.queryByText('lundi 24 août')).not.toBeInTheDocument();
  });

  it('la date de début choisie survit à un remontage sur le MÊME store', async () => {
    const { store, unmount } = renderWithStore({});
    await arriveeAchevee();

    choisirLaDateDeDebut('2026-09-02');
    unmount();
    renderOn(store);
    await arriveeAchevee();

    expect(screen.getByLabelText('Début du menu')).toHaveValue('2026-09-02');
  });

  it('n’interroge l’horloge qu’UNE fois par session, quel que soit le nombre de montages', async () => {
    let lectures = 0;
    const clock = DriftingClock.startingOn(createCalendarDate({ year: 2026, month: 8, day: 23 }));
    const prochainLundi = nextMondayUseCase({ clock });
    const nextMonday: NextMonday = () => {
      lectures += 1;
      return prochainLundi();
    };
    const { store, unmount } = renderWithStore({ nextMonday });
    await arriveeAchevee();

    unmount();
    renderOn(store).unmount();
    renderOn(store);
    await arriveeAchevee();

    expect(lectures).toBe(1);
    expect(screen.getByLabelText('Début du menu')).toHaveValue('2026-08-24');
  });

  const CONSTAT_PLANCHER = 'Le menu ne peut pas commencer avant aujourd’hui.';

  it('le champ ne propose aucun jour antérieur à aujourd’hui, relu à CHAQUE arrivée', async () => {
    const { store, unmount } = renderWithStore({});
    await arriveeAchevee();

    expect(screen.getByLabelText('Début du menu')).toHaveAttribute('min', '2026-08-25');

    unmount();
    renderOn(store);
    await arriveeAchevee();

    expect(screen.getByLabelText('Début du menu')).toHaveAttribute('min', '2026-08-27');
    expect(screen.getByLabelText('Début du menu')).toHaveValue('2026-08-24');
  });

  it('une date de début passée est refusée : le champ revient à la date retenue et l’écran le dit', async () => {
    renderWithStore({});
    await arriveeAchevee();

    choisirLaDateDeDebut('2026-08-20');

    expect(screen.getByLabelText('Début du menu')).toHaveValue('2026-08-24');
    expect(screen.getByText(CONSTAT_PLANCHER)).toBeInTheDocument();
  });

  it('corriger la date efface le constat', async () => {
    renderWithStore({});
    await arriveeAchevee();
    choisirLaDateDeDebut('2026-08-20');
    expect(screen.getByText(CONSTAT_PLANCHER)).toBeInTheDocument();

    choisirLaDateDeDebut('2026-09-02');

    expect(screen.getByLabelText('Début du menu')).toHaveValue('2026-09-02');
    expect(screen.queryByText(CONSTAT_PLANCHER)).not.toBeInTheDocument();
  });

  it('le constat ne survit pas à un remontage sur le MÊME store', async () => {
    const { store, unmount } = renderWithStore({});
    await arriveeAchevee();
    choisirLaDateDeDebut('2026-08-20');
    expect(screen.getByText(CONSTAT_PLANCHER)).toBeInTheDocument();

    unmount();
    renderOn(store);
    await arriveeAchevee();

    expect(screen.queryByText(CONSTAT_PLANCHER)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Début du menu')).toHaveValue('2026-08-24');
  });

  it('depuis le menu affiché, une date passée est refusée et l’écran le dit', async () => {
    const user = userEvent.setup();
    const generate: GenerateMenu = async ({ dateDebut }) => menuDatedOn(dateDebut);
    renderWithStore({ generateMenu: generate, listRecipes: async () => twoRecipes() });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    expect(await screen.findByText('lundi 24 août')).toBeInTheDocument();

    choisirLaDateDeDebut('2026-08-20');

    expect(screen.getByLabelText('Début du menu')).toHaveValue('2026-08-24');
    expect(screen.getByText(CONSTAT_PLANCHER)).toBeInTheDocument();
  });

  it('chaque recette du menu est un lien vers sa fiche, marquée comme venant du menu', async () => {
    const user = userEvent.setup();
    renderWithStore({ generateMenu: async () => aMenu(), listRecipes: async () => twoRecipes() });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    await screen.findByText('lundi 24 août');

    const ratatouille = screen.getAllByRole('link', { name: 'Ratatouille' });
    expect(ratatouille).toHaveLength(2);
    for (const lien of ratatouille) {
      expect(lien).toHaveAttribute('href', '/catalogue/r1?depuis=menu');
    }
    expect(screen.getByRole('link', { name: 'Blanquette' })).toHaveAttribute(
      'href',
      '/catalogue/r2?depuis=menu',
    );
  });

  const CONSTAT_ENREGISTRE = 'Menu enregistré';
  const CONSTAT_PANNE = 'Aucune connexion — l’enregistrement du menu n’a pas pu être confirmé.';
  const CONSTAT_ECHEC = 'Impossible d’enregistrer le menu.';

  async function genererLeMenu(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    await screen.findByRole('button', { name: /régénérer/i });
  }

  it('« Enregistrer » n’apparaît qu’une fois un menu affiché', async () => {
    const user = userEvent.setup();
    renderWithStore({ generateMenu: async () => aMenu(), listRecipes: async () => twoRecipes() });
    await arriveeAchevee();

    expect(screen.queryByRole('button', { name: /enregistrer/i })).not.toBeInTheDocument();

    await genererLeMenu(user);

    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeInTheDocument();
  });

  it('enregistrer le menu affiché : l’écran le constate, poliment', async () => {
    const user = userEvent.setup();
    renderWithStore({ generateMenu: async () => aMenu(), listRecipes: async () => twoRecipes() });
    await arriveeAchevee();
    await genererLeMenu(user);

    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(CONSTAT_ENREGISTRE);
  });

  it('pendant l’enregistrement, « Enregistrer » est verrouillé — pas deux écritures concurrentes', async () => {
    const user = userEvent.setup();
    const enVol = deferred<void>();
    renderWithStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => twoRecipes(),
      saveMenu: () => enVol.promise,
    });
    await arriveeAchevee();
    await genererLeMenu(user);

    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeDisabled();

    enVol.resolve();
    expect(await screen.findByText(CONSTAT_ENREGISTRE)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeEnabled();
  });

  it('dépôt indisponible : l’écran dit que l’enregistrement n’est pas confirmé, sans rien réclamer', async () => {
    const user = userEvent.setup();
    renderWithStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => twoRecipes(),
      saveMenu: () => Promise.reject(RepositoryUnavailableError.create()),
    });
    await arriveeAchevee();
    await genererLeMenu(user);

    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(CONSTAT_PANNE);
    expect(screen.queryByRole('button', { name: /réessayer/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeEnabled();
  });

  it('échec franc du dépôt : l’écran alerte', async () => {
    const user = userEvent.setup();
    renderWithStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => twoRecipes(),
      saveMenu: () => Promise.reject(new Error('Boom')),
    });
    await arriveeAchevee();
    await genererLeMenu(user);

    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(CONSTAT_ECHEC);
  });

  it('un nouvel essai réussi ne laisse aucune trace du constat d’échec', async () => {
    const user = userEvent.setup();
    let premier = true;
    const save: SaveMenu = async () => {
      if (premier) {
        premier = false;
        throw new Error('Boom');
      }
    };
    renderWithStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => twoRecipes(),
      saveMenu: save,
    });
    await arriveeAchevee();
    await genererLeMenu(user);

    await user.click(screen.getByRole('button', { name: /enregistrer/i }));
    expect(await screen.findByText(CONSTAT_ECHEC)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(await screen.findByText(CONSTAT_ENREGISTRE)).toBeInTheDocument();
    expect(screen.queryByText(CONSTAT_ECHEC)).not.toBeInTheDocument();
  });

  it('le constat d’enregistrement ne survit pas à un remontage sur le MÊME store', async () => {
    const user = userEvent.setup();
    const { store, unmount } = renderWithStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => twoRecipes(),
    });
    await arriveeAchevee();
    await genererLeMenu(user);
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));
    expect(await screen.findByText(CONSTAT_ENREGISTRE)).toBeInTheDocument();

    unmount();
    renderOn(store);
    await arriveeAchevee();

    expect(await screen.findByText('lundi 24 août')).toBeInTheDocument();
    expect(screen.queryByText(CONSTAT_ENREGISTRE)).not.toBeInTheDocument();
  });

  it('un enregistrement en vol reste verrouillé après un remontage sur le MÊME store', async () => {
    const user = userEvent.setup();
    const enVol = deferred<void>();
    const { store, unmount } = renderWithStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => twoRecipes(),
      saveMenu: () => enVol.promise,
    });
    await arriveeAchevee();
    await genererLeMenu(user);
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    unmount();
    renderOn(store);
    await arriveeAchevee();

    expect(await screen.findByRole('button', { name: /enregistrer/i })).toBeDisabled();

    enVol.resolve();
    expect(await screen.findByText(CONSTAT_ENREGISTRE)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeEnabled();
  });

  it('le verdict d’une écriture désavouée ne se fait pas passer pour celui de la suivante', async () => {
    const user = userEvent.setup();
    const premiere = deferred<void>();
    const seconde = deferred<void>();
    const enVol = [premiere, seconde];
    renderWithStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => twoRecipes(),
      saveMenu: () => enVol.shift()!.promise,
    });
    await arriveeAchevee();
    await genererLeMenu(user);

    await user.click(screen.getByRole('button', { name: /enregistrer/i }));
    await user.click(screen.getByRole('button', { name: /régénérer/i }));
    await screen.findByRole('button', { name: /enregistrer/i });
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    await act(async () => premiere.resolve());

    expect(screen.queryByText(CONSTAT_ENREGISTRE)).not.toBeInTheDocument();

    seconde.reject(new Error('Boom'));

    expect(await screen.findByText(CONSTAT_ECHEC)).toBeInTheDocument();
  });

  it('la ligne d’une recette absente du catalogue n’est pas un lien, et le créneau voisin l’est', async () => {
    const user = userEvent.setup();
    const menu = createMenu({
      dateDebut: LUNDI_24_AOUT,
      repas: [
        createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'disparue' })] }),
        createRepas({ jour: 0, creneau: 'soir', slots: [createSlot({ recipeId: 'r2' })] }),
      ],
    });
    renderWithStore({ generateMenu: async () => menu, listRecipes: async () => twoRecipes() });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(await screen.findByRole('link', { name: 'Blanquette' })).toBeInTheDocument();
    expect(screen.getByText('Recette inconnue')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Recette inconnue' })).not.toBeInTheDocument();
  });
});

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

  it('le menu consulté est en lecture seule ; « + Nouveau menu » ramène le formulaire et ses boutons', async () => {
    const user = userEvent.setup();
    renderWithStore({
      browseMenus: browsing(TROIS_SEMAINES, 1),
      listRecipes: async () => twoRecipes(),
      generateMenu: async () => aMenu(),
    });

    expect(await screen.findByText('31 août – 6 sept.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'lundi 31 août' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ratatouille' })).toHaveAttribute(
      'href',
      '/catalogue/r1?depuis=menu',
    );
    expect(screen.queryByRole('button', { name: /régénérer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /enregistrer/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Début du menu')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '+ Nouveau menu' }));

    expect(screen.getByLabelText('Début du menu')).toBeInTheDocument();
    expect(screen.queryByText('31 août – 6 sept.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(await screen.findByRole('button', { name: /régénérer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeInTheDocument();
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

  it('après un enregistrement réussi, l’écran consulte le menu qu’on vient d’enregistrer', async () => {
    const user = userEvent.setup();
    renderWithStore({
      generateMenu: async () => menuDeLaSemaine(LUNDI_24_AOUT),
      listRecipes: async () => twoRecipes(),
    });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    expect(await screen.findByRole('button', { name: /enregistrer/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(await screen.findByText('24 – 30 août')).toBeInTheDocument();
    expect(screen.getByText('Menu enregistré')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Nouveau menu' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /enregistrer/i })).not.toBeInTheDocument();
  });

  it('le constat d’enregistrement ne suit pas le menu voisin', async () => {
    const user = userEvent.setup();
    renderWithStore({
      generateMenu: async () => menuDeLaSemaine(LUNDI_31_AOUT),
      listRecipes: async () => twoRecipes(),
      browseMenus: browsing([menuDeLaSemaine(LUNDI_24_AOUT), menuDeLaSemaine(LUNDI_31_AOUT)], 0),
    });
    await screen.findByText('24 – 30 août');
    await user.click(screen.getByRole('button', { name: '+ Nouveau menu' }));
    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    await user.click(await screen.findByRole('button', { name: /enregistrer/i }));
    expect(await screen.findByText('31 août – 6 sept.')).toBeInTheDocument();
    expect(screen.getByText('Menu enregistré')).toBeInTheDocument();

    await user.click(flecheGauche());

    expect(screen.getByText('24 – 30 août')).toBeInTheDocument();
    expect(screen.queryByText('Menu enregistré')).not.toBeInTheDocument();
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
});
