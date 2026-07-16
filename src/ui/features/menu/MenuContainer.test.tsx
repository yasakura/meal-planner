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

function renderWithStore(overrides: { generateMenu?: GenerateMenu; listRecipes?: ListRecipes }) {
  const store = createTestStore(overrides);
  const view = render(
    <Provider store={store}>
      <MemoryRouter>
        <MenuContainer />
      </MemoryRouter>
    </Provider>,
  );
  return { store, ...view };
}

describe('MenuContainer', () => {
  it('affiche une invite et un bouton « Générer un menu » à l’ouverture', () => {
    renderWithStore({});

    expect(screen.getByRole('button', { name: /générer un menu/i })).toBeInTheDocument();
  });

  it('génère un menu de 7 jours au clic sur « Générer un menu »', async () => {
    const user = userEvent.setup();
    const daysReceived: number[] = [];
    const generate: GenerateMenu = async ({ days }) => {
      daysReceived.push(days);
      return aMenu();
    };
    renderWithStore({ generateMenu: generate, listRecipes: async () => twoRecipes() });

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(await screen.findByText('Jour 1')).toBeInTheDocument();
    expect(daysReceived).toEqual([7]);
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
});
