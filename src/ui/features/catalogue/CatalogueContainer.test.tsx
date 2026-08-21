import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { type Recipe } from '../../../domain/entities/recipe';
import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { type ListRecipes } from '../../../domain/use-cases/list-recipes';
import { IngredientBuilder } from '../../../domain/test-builders/ingredient.builder';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../store/create-test-store';
import { CatalogueContainer } from './CatalogueContainer';

const OFFLINE_NOTICE = 'Aucune connexion — le catalogue n’a pas pu être chargé.';

function renderWithStore(listRecipes: ListRecipes) {
  const store = createTestStore({ listRecipes });
  return { store, ...renderWith(store) };
}

function renderWith(store: ReturnType<typeof createTestStore>) {
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <CatalogueContainer />
      </MemoryRouter>
    </Provider>,
  );
}

function spyReturning(recipes: Recipe[]): { fn: ListRecipes; callCount: () => number } {
  let count = 0;
  const fn: ListRecipes = async () => {
    count += 1;
    return recipes;
  };
  return { fn, callCount: () => count };
}

describe('CatalogueContainer', () => {
  it('charge les recettes au montage et les affiche dans l’ordre renvoyé par le use case', async () => {
    const recipes = [
      RecipeBuilder.aRecipe().withId('r-1').withTitle('Zèbre au four').build(),
      RecipeBuilder.aRecipe().withId('r-2').withTitle('Avocat farci').build(),
    ];
    const spy = spyReturning(recipes);
    renderWithStore(spy.fn);

    expect(await screen.findByText('Zèbre au four')).toBeInTheDocument();
    expect(screen.getByText('Avocat farci')).toBeInTheDocument();
    expect(spy.callCount()).toBe(1);

    const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titles).toEqual(['Zèbre au four', 'Avocat farci']);
  });

  it('affiche l’indicateur de chargement tant que le use case n’a pas résolu', () => {
    const pending: ListRecipes = () => new Promise<Recipe[]>(() => {});
    renderWithStore(pending);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('affiche une icône (svg) dans l’indicateur de chargement', () => {
    const pending: ListRecipes = () => new Promise<Recipe[]>(() => {});
    renderWithStore(pending);

    expect(screen.getByRole('status').querySelector('svg')).toBeInTheDocument();
  });

  it('affiche l’état vide (icône + message) quand aucune recette n’est renvoyée', async () => {
    const spy = spyReturning([]);
    const { container } = renderWithStore(spy.fn);

    expect(await screen.findByText(/aucune recette/i)).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('affiche un message utilisateur sobre + « Réessayer » en erreur, et recharge au clic', async () => {
    const user = userEvent.setup();
    const recipes = [RecipeBuilder.aRecipe().withId('r-1').withTitle('Poulet rôti').build()];
    let count = 0;
    const failThenSucceed: ListRecipes = async () => {
      count += 1;
      if (count === 1) throw new Error('Firestore down');
      return recipes;
    };
    renderWithStore(failThenSucceed);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible de charger le catalogue.',
    );
    expect(screen.queryByText(/Firestore/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /réessayer/i }));

    expect(await screen.findByText('Poulet rôti')).toBeInTheDocument();
    expect(count).toBe(2);
  });

  it('rend une action « + » liant vers la page de création /catalogue/nouvelle', async () => {
    renderWithStore(async () => [
      RecipeBuilder.aRecipe().withId('r-1').withTitle('Ratatouille').build(),
    ]);

    await screen.findByText('Ratatouille');
    expect(screen.getByRole('link', { name: /ajouter une recette/i })).toHaveAttribute(
      'href',
      '/catalogue/nouvelle',
    );
  });

  it('rend l’action « + » aussi sur l’état vide (en plus du CTA)', async () => {
    renderWithStore(spyReturning([]).fn);

    await screen.findByText(/aucune recette/i);
    expect(screen.getByRole('link', { name: /ajouter une recette/i })).toHaveAttribute(
      'href',
      '/catalogue/nouvelle',
    );
  });

  it('rend chaque recette comme un lien vers son détail', async () => {
    const recipes = [
      RecipeBuilder.aRecipe().withId('r-1').withTitle('Ratatouille').build(),
      RecipeBuilder.aRecipe().withId('r-2').withTitle('Blanquette').build(),
    ];
    renderWithStore(async () => recipes);

    const link1 = await screen.findByRole('link', { name: /Ratatouille/i });
    expect(link1).toHaveAttribute('href', '/catalogue/r-1');
    const link2 = screen.getByRole('link', { name: /Blanquette/i });
    expect(link2).toHaveAttribute('href', '/catalogue/r-2');
  });

  it('formate la meta de ligne : pluralise les ingrédients et affiche les personnes', async () => {
    const twoIngredients = RecipeBuilder.aRecipe()
      .withId('r-1')
      .withTitle('Salade complète')
      .withIngredients([
        IngredientBuilder.anIngredient().withName('Tomates').build(),
        IngredientBuilder.anIngredient().withName('Avocat').build(),
      ])
      .withConvivesReference(4)
      .build();
    const oneIngredient = RecipeBuilder.aRecipe()
      .withId('r-2')
      .withTitle('Œuf dur')
      .withIngredients([IngredientBuilder.anIngredient().withName('Œuf').build()])
      .withConvivesReference(2)
      .build();
    const spy = spyReturning([twoIngredients, oneIngredient]);
    renderWithStore(spy.fn);

    expect(await screen.findByText('2 ingrédients · 4 personnes')).toBeInTheDocument();
    expect(screen.getByText('1 ingrédient · 2 personnes')).toBeInTheDocument();
  });

  it('hors ligne, l’app dit qu’elle n’a pas pu charger le catalogue — jamais qu’il est vide', async () => {
    renderWithStore(() => Promise.reject(RepositoryUnavailableError.create()));

    expect(await screen.findByText(OFFLINE_NOTICE)).toBeInTheDocument();
    expect(screen.queryByText(/aucune recette/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Impossible de charger le catalogue.')).not.toBeInTheDocument();
  });

  it('le constat hors-ligne ne propose pas « Réessayer », contrairement à l’échec de chargement', async () => {
    renderWithStore(() => Promise.reject(RepositoryUnavailableError.create()));
    await screen.findByText(OFFLINE_NOTICE);

    expect(screen.queryByRole('button', { name: /réessayer/i })).not.toBeInTheDocument();
  });

  it('le constat hors-ligne est annoncé poliment, jamais comme une alerte', async () => {
    renderWithStore(() => Promise.reject(RepositoryUnavailableError.create()));
    await screen.findByText(OFFLINE_NOTICE);

    expect(screen.getByRole('status')).toHaveTextContent(OFFLINE_NOTICE);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('l’état hors-ligne garde le lien « Ajouter une recette » accessible', async () => {
    renderWithStore(() => Promise.reject(RepositoryUnavailableError.create()));
    await screen.findByText(OFFLINE_NOTICE);

    expect(screen.getByRole('link', { name: /ajouter une recette/i })).toHaveAttribute(
      'href',
      '/catalogue/nouvelle',
    );
  });

  it('un rechargement réussi au remontage efface le constat hors-ligne, sur le MÊME store', async () => {
    let offline = true;
    const flaky: ListRecipes = async () => {
      if (offline) throw RepositoryUnavailableError.create();
      return [RecipeBuilder.aRecipe().withId('r-1').withTitle('Ratatouille').build()];
    };
    const store = createTestStore({ listRecipes: flaky });
    const { unmount } = renderWith(store);
    await screen.findByText(OFFLINE_NOTICE);

    offline = false;
    unmount();
    renderWith(store);

    expect(await screen.findByText('Ratatouille')).toBeInTheDocument();
    expect(screen.queryByText(OFFLINE_NOTICE)).not.toBeInTheDocument();
  });
});
