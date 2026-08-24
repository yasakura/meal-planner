import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { describe, it, expect, afterEach, vi } from 'vitest';

import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { IngredientBuilder } from '../../../domain/test-builders/ingredient.builder';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../../test/create-test-store';
import { DataSubscription } from '../../DataSubscription';
import { RecipeChannel } from '../../test-utils/recipe-channel';
import { FROM_CATALOGUE } from './recipe-detail-origin';
import { CatalogueContainer } from './CatalogueContainer';

const OFFLINE_NOTICE = 'Aucune connexion — le catalogue n’a pas pu être chargé.';

function renderWithChannel(channel: RecipeChannel) {
  const store = createTestStore({ observeRecipes: channel.observeRecipes });
  return { store, channel, ...renderWith(store) };
}

function renderWith(store: ReturnType<typeof createTestStore>) {
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <DataSubscription>
          <CatalogueContainer />
        </DataSubscription>
      </MemoryRouter>
    </Provider>,
  );
}

function renderSeeded(recipes: Parameters<RecipeChannel['emit']>[0]) {
  return renderWithChannel(RecipeChannel.seededWith(recipes));
}

describe('CatalogueContainer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('demande l’adresse d’une ligne à FROM_CATALOGUE avec l’identifiant de la recette, au lieu de la fabriquer sur place', async () => {
    vi.spyOn(FROM_CATALOGUE, 'recipeHref').mockImplementation(
      (recipeId) => `/adresse-rendue-par-la-provenance/${recipeId}`,
    );
    renderSeeded([RecipeBuilder.aRecipe().withId('r-1').withTitle('Ratatouille').build()]);

    const lien = await screen.findByRole('link', { name: /Ratatouille/i });
    expect(lien).toHaveAttribute('href', '/adresse-rendue-par-la-provenance/r-1');
  });

  it('affiche au montage les recettes émises, dans l’ordre émis par le use case, sur un seul abonnement', async () => {
    const recipes = [
      RecipeBuilder.aRecipe().withId('r-1').withTitle('Zèbre au four').build(),
      RecipeBuilder.aRecipe().withId('r-2').withTitle('Avocat farci').build(),
    ];
    const { channel } = renderSeeded(recipes);

    expect(await screen.findByText('Zèbre au four')).toBeInTheDocument();
    expect(screen.getByText('Avocat farci')).toBeInTheDocument();
    expect(channel.subscriptions).toBe(1);

    const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titles).toEqual(['Zèbre au four', 'Avocat farci']);
  });

  it('affiche l’indicateur de chargement tant que le canal n’a rien émis', () => {
    renderWithChannel(RecipeChannel.silent());

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('affiche une icône (svg) dans l’indicateur de chargement', () => {
    renderWithChannel(RecipeChannel.silent());

    expect(screen.getByRole('status').querySelector('svg')).toBeInTheDocument();
  });

  it('affiche l’état vide (icône + message) quand aucune recette n’est émise', async () => {
    const { container } = renderSeeded([]);

    expect(await screen.findByText(/aucune recette/i)).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('affiche un message utilisateur sobre + « Réessayer » en erreur, et se réabonne au clic', async () => {
    const user = userEvent.setup();
    const recipes = [RecipeBuilder.aRecipe().withId('r-1').withTitle('Poulet rôti').build()];
    const channel = RecipeChannel.refusingWith(new Error('Firestore down'));
    renderWithChannel(channel);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible de charger le catalogue.',
    );
    expect(screen.queryByText(/Firestore/i)).not.toBeInTheDocument();

    channel.willEmit(recipes);
    await user.click(screen.getByRole('button', { name: /réessayer/i }));

    expect(await screen.findByText('Poulet rôti')).toBeInTheDocument();
    expect(channel.subscriptions).toBe(2);
  });

  it('rend une action « + » liant vers la page de création /catalogue/nouvelle', async () => {
    renderSeeded([RecipeBuilder.aRecipe().withId('r-1').withTitle('Ratatouille').build()]);

    await screen.findByText('Ratatouille');
    expect(screen.getByRole('link', { name: /ajouter une recette/i })).toHaveAttribute(
      'href',
      '/catalogue/nouvelle',
    );
  });

  it('rend l’action « + » aussi sur l’état vide (en plus du CTA)', async () => {
    renderSeeded([]);

    await screen.findByText(/aucune recette/i);
    expect(screen.getByRole('link', { name: /ajouter une recette/i })).toHaveAttribute(
      'href',
      '/catalogue/nouvelle',
    );
  });

  it('rend chaque recette comme un lien vers son détail', async () => {
    renderSeeded([
      RecipeBuilder.aRecipe().withId('r-1').withTitle('Ratatouille').build(),
      RecipeBuilder.aRecipe().withId('r-2').withTitle('Blanquette').build(),
    ]);

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
    renderSeeded([twoIngredients, oneIngredient]);

    expect(await screen.findByText('2 ingrédients · 4 personnes')).toBeInTheDocument();
    expect(screen.getByText('1 ingrédient · 2 personnes')).toBeInTheDocument();
  });

  it('hors ligne, l’app dit qu’elle n’a pas pu charger le catalogue — jamais qu’il est vide', async () => {
    renderWithChannel(RecipeChannel.refusingWith(RepositoryUnavailableError.create()));

    expect(await screen.findByText(OFFLINE_NOTICE)).toBeInTheDocument();
    expect(screen.queryByText(/aucune recette/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Impossible de charger le catalogue.')).not.toBeInTheDocument();
  });

  it('le constat hors-ligne propose « Réessayer », qui rouvre un abonnement neuf et ramène le catalogue', async () => {
    const user = userEvent.setup();
    const channel = RecipeChannel.refusingWith(RepositoryUnavailableError.create());
    renderWithChannel(channel);
    await screen.findByText(OFFLINE_NOTICE);

    channel.willEmit([RecipeBuilder.aRecipe().withId('r-1').withTitle('Poulet rôti').build()]);
    await user.click(screen.getByRole('button', { name: /réessayer/i }));

    expect(await screen.findByText('Poulet rôti')).toBeInTheDocument();
    expect(screen.queryByText(OFFLINE_NOTICE)).not.toBeInTheDocument();
    expect(channel.subscriptions).toBe(2);
    expect(channel.live).toBe(1);
  });

  it('le constat hors-ligne est annoncé poliment, jamais comme une alerte', async () => {
    renderWithChannel(RecipeChannel.refusingWith(RepositoryUnavailableError.create()));
    await screen.findByText(OFFLINE_NOTICE);

    expect(screen.getByRole('status')).toHaveTextContent(OFFLINE_NOTICE);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('l’état hors-ligne garde le lien « Ajouter une recette » accessible', async () => {
    renderWithChannel(RecipeChannel.refusingWith(RepositoryUnavailableError.create()));
    await screen.findByText(OFFLINE_NOTICE);

    expect(screen.getByRole('link', { name: /ajouter une recette/i })).toHaveAttribute(
      'href',
      '/catalogue/nouvelle',
    );
  });

  it('démonté puis remonté sous un abonnement qui tient, l’écran garde les recettes émises sans repasser par un chargement', async () => {
    const recipes = [RecipeBuilder.aRecipe().withId('r-1').withTitle('Ratatouille').build()];
    const channel = RecipeChannel.seededWith(recipes);
    const store = createTestStore({ observeRecipes: channel.observeRecipes });
    const sous = (montre: boolean) => (
      <Provider store={store}>
        <MemoryRouter>
          <DataSubscription>{montre ? <CatalogueContainer /> : null}</DataSubscription>
        </MemoryRouter>
      </Provider>
    );
    const { rerender } = render(sous(true));
    expect(await screen.findByText('Ratatouille')).toBeInTheDocument();

    rerender(sous(false));
    expect(screen.queryByText('Ratatouille')).not.toBeInTheDocument();
    rerender(sous(true));

    expect(channel.subscriptions).toBe(1);
    expect(screen.getByText('Ratatouille')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('une panne survenue APRÈS l’émission garde les recettes à l’écran, là où la même panne sans émission les remplace par un constat', async () => {
    const recipes = [RecipeBuilder.aRecipe().withId('r-1').withTitle('Ratatouille').build()];
    const { channel } = renderSeeded(recipes);
    await screen.findByText('Ratatouille');

    act(() => {
      channel.fail(RepositoryUnavailableError.create());
    });

    expect(screen.getByText('Ratatouille')).toBeInTheDocument();
    expect(screen.queryByText(OFFLINE_NOTICE)).not.toBeInTheDocument();

    renderWithChannel(RecipeChannel.refusingWith(RepositoryUnavailableError.create()));

    expect(await screen.findByText(OFFLINE_NOTICE)).toBeInTheDocument();
  });
});
