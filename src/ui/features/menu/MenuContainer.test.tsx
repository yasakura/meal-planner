import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { createMenu, type Menu } from '../../../domain/entities/menu';
import { createRepas } from '../../../domain/entities/repas';
import { createSlot } from '../../../domain/entities/slot';
import { type Recipe } from '../../../domain/entities/recipe';
import { type GenerateMenu } from '../../../domain/use-cases/generate-menu';
import { type ListRecipes } from '../../../domain/use-cases/list-recipes';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../store/create-test-store';
import { MenuContainer } from './MenuContainer';

function aMenu(): Menu {
  return createMenu({
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

// Monte le container SUR un store donné — la seule façon de rejouer un remontage de session
// (le store est un singleton en prod, `unmount()` ne le réinitialise pas).
function renderOn(store: TestStore) {
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <MenuContainer />
      </MemoryRouter>
    </Provider>,
  );
}

function renderWithStore(overrides: { generateMenu?: GenerateMenu; listRecipes?: ListRecipes }) {
  const store = createTestStore(overrides);
  return { store, ...renderOn(store) };
}

describe('MenuContainer', () => {
  it('affiche une invite et un bouton « Générer un menu » à l’ouverture', () => {
    renderWithStore({});

    expect(screen.getByRole('button', { name: /générer un menu/i })).toBeInTheDocument();
  });

  // RUPTURE VOLONTAIRE : la fenêtre par défaut passe de 7 à 14 jours (« 2 semaines »).
  it('génère un menu de 14 jours (« 2 semaines ») par défaut au clic sur « Générer un menu »', async () => {
    const user = userEvent.setup();
    const daysReceived: number[] = [];
    const generate: GenerateMenu = async ({ days }) => {
      daysReceived.push(days);
      return aMenu();
    };
    renderWithStore({ generateMenu: generate, listRecipes: async () => twoRecipes() });

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(await screen.findByText('Jour 1')).toBeInTheDocument();
    expect(daysReceived).toEqual([14]);
  });

  it('rend le sélecteur segmenté avec « 2 semaines » actif par défaut', () => {
    renderWithStore({});

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

    await user.click(screen.getByRole('button', { name: /1 semaine/i }));
    // Le segment sélectionné devient actif.
    expect(screen.getByRole('button', { name: /1 semaine/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(await screen.findByText('Jour 1')).toBeInTheDocument();
    expect(daysReceived).toEqual([7]);
  });

  it('propose encore le sélecteur segmenté sur l’état « menu généré »', async () => {
    const user = userEvent.setup();
    renderWithStore({ generateMenu: async () => aMenu(), listRecipes: async () => twoRecipes() });

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    await screen.findByRole('button', { name: /régénérer/i });

    expect(screen.getByRole('button', { name: /1 semaine/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2 semaines/i })).toBeInTheDocument();
  });

  it('affiche l’indicateur de chargement pendant la génération', async () => {
    const user = userEvent.setup();
    const pending: GenerateMenu = () => new Promise<Menu>(() => {});
    renderWithStore({ generateMenu: pending, listRecipes: async () => twoRecipes() });

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(screen.getByRole('status')).toBeInTheDocument();
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

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de générer le menu.');
    expect(screen.queryByText(/sans recette/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /réessayer/i }));

    expect(await screen.findByText('Jour 1')).toBeInTheDocument();
    expect(count).toBe(2);
  });

  it('catalogue vide : affiche un message actionnable invitant à ajouter des recettes', async () => {
    const user = userEvent.setup();
    renderWithStore({ generateMenu: async () => aMenu(), listRecipes: async () => [] });

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

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Impossible de générer le menu.');
    expect(screen.queryByText(/Boom firestore/i)).not.toBeInTheDocument();
  });

  it('regroupe les repas par jour et affiche le titre de la recette de chaque créneau', async () => {
    const user = userEvent.setup();
    renderWithStore({ generateMenu: async () => aMenu(), listRecipes: async () => twoRecipes() });

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    const jour1 = (await screen.findByText('Jour 1')).closest('section') as HTMLElement;
    expect(within(jour1).getByText('Midi')).toBeInTheDocument();
    expect(within(jour1).getByText('Ratatouille')).toBeInTheDocument();
    expect(within(jour1).getByText('Soir')).toBeInTheDocument();
    expect(within(jour1).getByText('Blanquette')).toBeInTheDocument();

    const jour2 = screen.getByText('Jour 2').closest('section') as HTMLElement;
    expect(within(jour2).getByText('Midi')).toBeInTheDocument();
    expect(within(jour2).getByText('Ratatouille')).toBeInTheDocument();
  });

  it('affiche les jours dans l’ordre croissant et, au sein d’un jour, Midi avant Soir', async () => {
    const user = userEvent.setup();
    renderWithStore({ generateMenu: async () => aMenu(), listRecipes: async () => twoRecipes() });

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    await screen.findByText('Jour 1');
    const dayLabels = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(dayLabels).toEqual(['Jour 1', 'Jour 2']);

    const jour1 = screen.getByText('Jour 1').closest('section') as HTMLElement;
    const creneaux = within(jour1)
      .getAllByText(/^(Midi|Soir)$/)
      .map((el) => el.textContent);
    expect(creneaux).toEqual(['Midi', 'Soir']);
  });

  it('affiche un libellé de repli quand la recette d’un créneau est introuvable', async () => {
    const user = userEvent.setup();
    const menu = createMenu({
      repas: [
        createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'inconnu' })] }),
      ],
    });
    renderWithStore({ generateMenu: async () => menu, listRecipes: async () => twoRecipes() });

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(await screen.findByText('Recette inconnue')).toBeInTheDocument();
  });

  it('propose « Régénérer » une fois un menu affiché', async () => {
    const user = userEvent.setup();
    renderWithStore({ generateMenu: async () => aMenu(), listRecipes: async () => twoRecipes() });

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(await screen.findByRole('button', { name: /régénérer/i })).toBeInTheDocument();
  });

  /**
   * Issue #28. La fenêtre choisie est une PRÉFÉRENCE : elle vit dans le store, comme le menu
   * généré, et survit donc au démontage du container. Quand elle vivait dans un `useState`,
   * un simple aller-retour la ramenait à « 2 semaines » au-dessus d'un menu de 7 jours.
   */
  it('la fenêtre choisie survit à un remontage sur le MÊME store', async () => {
    const user = userEvent.setup();
    const { store, unmount } = renderWithStore({});

    await user.click(screen.getByRole('button', { name: /1 semaine/i }));
    unmount();
    renderOn(store);

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

    await user.click(screen.getByRole('button', { name: /1 semaine/i }));
    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    await screen.findByText('Jour 1');

    unmount();
    renderOn(store);

    await user.click(await screen.findByRole('button', { name: /régénérer/i }));
    await screen.findByText('Jour 1');

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

    await user.click(screen.getByRole('button', { name: /1 semaine/i }));
    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    await screen.findByRole('alert');

    unmount();
    renderOn(store);

    await user.click(await screen.findByRole('button', { name: /réessayer/i }));
    await screen.findByText('Jour 1');

    expect(daysReceived).toEqual([7, 7]);
  });
});
