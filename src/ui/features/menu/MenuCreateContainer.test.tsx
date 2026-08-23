import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { createCalendarDate, type CalendarDate } from '../../../domain/entities/calendar-date';
import { createMenu, type Menu } from '../../../domain/entities/menu';
import { createRepas } from '../../../domain/entities/repas';
import { createSlot } from '../../../domain/entities/slot';
import { type Recipe } from '../../../domain/entities/recipe';
import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { type BrowseMenus } from '../../../domain/use-cases/browse-menus';
import { type GenerateMenu } from '../../../domain/use-cases/generate-menu';
import { type ListRecipes } from '../../../domain/use-cases/list-recipes';
import { nextMondayUseCase, type NextMonday } from '../../../domain/use-cases/next-monday';
import { type SaveMenu } from '../../../domain/use-cases/save-menu';
import { DriftingClock } from '../../../domain/test-doubles/drifting-clock';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../../test/create-test-store';
import { deferred } from '../../test-utils/deferred';
import { MenuCreateContainer } from './MenuCreateContainer';

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
        <MenuCreateContainer />
      </MemoryRouter>
    </Provider>,
  );
}

function harnais(affiche: boolean, store: TestStore) {
  return (
    <StrictMode>
      <Provider store={store}>
        <MemoryRouter initialEntries={['/menu/nouveau']}>
          <Routes>
            <Route
              path="/menu/nouveau"
              element={affiche ? <MenuCreateContainer /> : <p>écran de génération quitté</p>}
            />
            <Route path="/menu" element={<p>consultation des menus</p>} />
          </Routes>
        </MemoryRouter>
      </Provider>
    </StrictMode>
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

describe('MenuCreateContainer', () => {
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

    expect(screen.getByLabelText('Début du menu')).toHaveAttribute('min', '2026-08-26');
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

  it('chaque recette du brouillon est un lien vers sa fiche, marquée comme venant du brouillon', async () => {
    const user = userEvent.setup();
    renderWithStore({ generateMenu: async () => aMenu(), listRecipes: async () => twoRecipes() });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    await screen.findByText('lundi 24 août');

    const ratatouille = screen.getAllByRole('link', { name: 'Ratatouille' });
    expect(ratatouille).toHaveLength(2);
    for (const lien of ratatouille) {
      expect(lien).toHaveAttribute('href', '/catalogue/r1?depuis=menu-nouveau');
    }
    expect(screen.getByRole('link', { name: 'Blanquette' })).toHaveAttribute(
      'href',
      '/catalogue/r2?depuis=menu-nouveau',
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
    expect(screen.queryByRole('button', { name: /enregistrer/i })).not.toBeInTheDocument();
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

    expect(await screen.findByRole('button', { name: /générer un menu/i })).toBeInTheDocument();
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
    expect(screen.queryByRole('button', { name: /enregistrer/i })).not.toBeInTheDocument();
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

  it('chaque créneau du brouillon ouvre le choix d’une autre recette, sans perdre le lien vers sa fiche', async () => {
    const user = userEvent.setup();
    renderWithStore({ generateMenu: async () => aMenu(), listRecipes: async () => twoRecipes() });
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    const acces = await screen.findAllByRole('link', { name: /choisir une recette/i });
    expect(acces.map((lien) => lien.getAttribute('href'))).toEqual([
      '/menu/nouveau/choisir/0/0',
      '/menu/nouveau/choisir/1/0',
      '/menu/nouveau/choisir/2/0',
    ]);
    expect(acces.map((lien) => lien.getAttribute('aria-label'))).toEqual([
      'Choisir une recette pour lundi 24 août, Midi',
      'Choisir une recette pour lundi 24 août, Soir',
      'Choisir une recette pour mardi 25 août, Midi',
    ]);
    expect(screen.getByRole('link', { name: 'Blanquette' })).toHaveAttribute(
      'href',
      '/catalogue/r2?depuis=menu-nouveau',
    );
  });

  it('l’écran de génération ramène au menu par un lien', async () => {
    renderWithStore({});
    await arriveeAchevee();

    expect(screen.getByRole('link', { name: '← Menu' })).toHaveAttribute('href', '/menu');
  });

  it('un menu généré et non enregistré survit à une relecture des titres qui échoue, sur le MÊME store', async () => {
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
    expect(await screen.findAllByText('Ratatouille')).toHaveLength(2);

    unmount();
    enPanne = true;
    renderOn(store);
    await arriveeAchevee();

    expect(screen.getAllByText('Ratatouille')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeInTheDocument();
    expect(
      screen.queryByText('Aucune connexion — le menu n’a pas pu être chargé.'),
    ).not.toBeInTheDocument();
  });

  it('un enregistrement honoré emmène à la consultation', async () => {
    const user = userEvent.setup();
    const store = createTestStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => twoRecipes(),
      saveMenu: async () => {},
    });
    render(harnais(true, store));
    await arriveeAchevee();

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    await user.click(await screen.findByRole('button', { name: /enregistrer/i }));

    expect(await screen.findByText('consultation des menus')).toBeInTheDocument();
  });

  it('un enregistrement qui aboutit après le départ de l’écran n’emmène nulle part', async () => {
    const user = userEvent.setup();
    const enVol = deferred<void>();
    const store = createTestStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => twoRecipes(),
      saveMenu: () => enVol.promise,
    });
    const { rerender } = render(harnais(true, store));
    await arriveeAchevee();
    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    await user.click(await screen.findByRole('button', { name: /enregistrer/i }));

    rerender(harnais(false, store));
    expect(screen.getByText('écran de génération quitté')).toBeInTheDocument();

    await act(async () => {
      enVol.resolve();
    });

    expect(screen.getByText('écran de génération quitté')).toBeInTheDocument();
    expect(screen.queryByText('consultation des menus')).not.toBeInTheDocument();
  });
});
