import { type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { beforeEach, describe, it, expect, vi } from 'vitest';

import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { type Recipe } from '../../../domain/entities/recipe';
import { type UpdateRecipe, type UpdateRecipeInput } from '../../../domain/use-cases/update-recipe';
import { IngredientBuilder } from '../../../domain/test-builders/ingredient.builder';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { DataSubscription } from '../../DataSubscription';
import { RecipeChannel } from '../../test-utils/recipe-channel';
import { createTestStore } from '../../../test/create-test-store';
import { RecipeEditContainer } from './RecipeEditContainer';

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

beforeEach(() => {
  mockNavigate.mockClear();
});

type TestStore = ReturnType<typeof createTestStore>;

const GRATIN: Recipe = RecipeBuilder.aRecipe()
  .withId('r-1')
  .withTitle('Gratin dauphinois')
  .withConvivesReference(6)
  .withIngredients([
    IngredientBuilder.anIngredient()
      .withName('Pommes de terre')
      .withQuantity(1)
      .withUnit('kg')
      .build(),
    IngredientBuilder.anIngredient().withName('Crème').withQuantity(500).withUnit('ml').build(),
  ])
  .withInstructions('Émincer, napper, cuire.')
  .build();

type Overrides = { channel?: RecipeChannel; updateRecipe?: UpdateRecipe };

function storePour(overrides?: Overrides): TestStore {
  const channel = overrides?.channel ?? RecipeChannel.seededWith([GRATIN]);
  return createTestStore({
    observeRecipes: channel.observeRecipes,
    ...(overrides?.updateRecipe ? { updateRecipe: overrides.updateRecipe } : {}),
  });
}

function renderRouteAt(store: TestStore, path: string, avant?: ReactNode) {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <DataSubscription>
          {avant}
          <Routes>
            <Route path="/catalogue/:id/modifier" element={<RecipeEditContainer />} />
          </Routes>
        </DataSubscription>
      </MemoryRouter>
    </Provider>,
  );
}

function renderOn(store: TestStore, id = 'r-1') {
  return renderRouteAt(store, `/catalogue/${id}/modifier`);
}

function renderWithStore(overrides?: Overrides, id = 'r-1') {
  const store = storePour(overrides);
  return { store, ...renderOn(store, id) };
}

function renderAtPath(path: string, overrides?: Overrides) {
  const store = storePour(overrides);
  return { store, ...renderRouteAt(store, path) };
}

function renderOnWithLinkTo(store: TestStore, cible: string, depuis = 'r-1') {
  return renderRouteAt(
    store,
    `/catalogue/${depuis}/modifier`,
    <Link to={`/catalogue/${cible}/modifier`}>Autre recette</Link>,
  );
}

function capturingSpy() {
  const state: { captured: UpdateRecipeInput | undefined } = { captured: undefined };
  const fn: UpdateRecipe = async (input) => {
    state.captured = input;
    return RecipeBuilder.aRecipe().build();
  };
  return { fn, state };
}

describe('RecipeEditContainer', () => {
  it('ne laisse pas partir un nombre de personnes que le domaine refuserait, et laisse partir celui qu’il accepte', async () => {
    const user = userEvent.setup();
    const spy = capturingSpy();
    renderWithStore({ updateRecipe: spy.fn });
    await screen.findByLabelText(/titre/i);
    await user.clear(screen.getByLabelText(/personnes/i));

    await user.click(screen.getByRole('button', { name: /^enregistrer$/i }));

    expect(spy.state.captured).toBeUndefined();

    await user.type(screen.getByLabelText(/personnes/i), '6');
    await user.click(screen.getByRole('button', { name: /^enregistrer$/i }));

    await vi.waitFor(() => expect(spy.state.captured?.convivesReference).toBe(6));
  });

  it('préremplit le formulaire avec le contenu de la recette de l’URL', async () => {
    renderWithStore();

    expect(await screen.findByLabelText(/titre/i)).toHaveValue('Gratin dauphinois');
    expect(screen.getByLabelText(/personnes/i)).toHaveValue(6);

    const noms = screen.getAllByLabelText(/nom/i);
    expect(noms).toHaveLength(2);
    expect(noms[0]).toHaveValue('Pommes de terre');
    expect(noms[1]).toHaveValue('Crème');

    const quantites = screen.getAllByLabelText(/quantité/i);
    expect(quantites[0]).toHaveValue(1);
    expect(quantites[1]).toHaveValue(500);

    const unites = screen.getAllByLabelText(/unité/i);
    expect(unites[0]).toHaveValue('kg');
    expect(unites[1]).toHaveValue('ml');

    expect(screen.getByRole('textbox', { name: /préparation/i })).toHaveValue(
      'Émincer, napper, cuire.',
    );
  });

  it('ouvre un champ préparation vide quand la recette n’en a pas', async () => {
    const sansPreparation = RecipeBuilder.aRecipe().withId('r-1').withoutInstructions().build();
    renderWithStore({ channel: RecipeChannel.seededWith([sansPreparation]) });

    expect(await screen.findByRole('textbox', { name: /préparation/i })).toHaveValue('');
  });

  it('titre l’écran « Modifier la recette », et non « Nouvelle recette »', async () => {
    renderWithStore();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Modifier la recette' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Nouvelle recette')).not.toBeInTheDocument();
  });

  it('garde le libellé « Enregistrer » sur le bouton de soumission', async () => {
    renderWithStore();

    expect(await screen.findByRole('button', { name: /^enregistrer$/i })).toBeInTheDocument();
  });

  it('enregistre la modification sous l’id de l’URL, avec le contenu du formulaire', async () => {
    const user = userEvent.setup();
    const spy = capturingSpy();
    const { store } = renderWithStore({ updateRecipe: spy.fn });

    const titre = await screen.findByLabelText(/titre/i);
    await user.clear(titre);
    await user.type(titre, 'Gratin de courgettes');
    await user.click(screen.getByRole('button', { name: /^enregistrer$/i }));

    await vi.waitFor(() => expect(store.getState().recipeEdit.status).toBe('success'));
    expect(spy.state.captured).toEqual({
      id: 'r-1',
      title: 'Gratin de courgettes',
      ingredients: [
        { name: 'Pommes de terre', quantity: 1, unit: 'kg' },
        { name: 'Crème', quantity: 500, unit: 'ml' },
      ],
      convivesReference: 6,
      instructions: 'Émincer, napper, cuire.',
    });
  });

  it('n’envoie pas l’ingrédient retiré du formulaire', async () => {
    const user = userEvent.setup();
    const spy = capturingSpy();
    const { store } = renderWithStore({ updateRecipe: spy.fn });

    await screen.findByLabelText(/titre/i);
    const retirer = screen.getAllByRole('button', { name: /retirer l'ingrédient/i });
    const second = retirer[1];
    if (!second) throw new Error('seconde ligne introuvable');
    await user.click(second);

    await user.click(screen.getByRole('button', { name: /^enregistrer$/i }));

    await vi.waitFor(() => expect(store.getState().recipeEdit.status).toBe('success'));
    expect(spy.state.captured?.ingredients).toEqual([
      { name: 'Pommes de terre', quantity: 1, unit: 'kg' },
    ]);
  });

  it('refuse d’enregistrer une ligne d’ingrédient incomplète, sans rien envoyer', async () => {
    const user = userEvent.setup();
    const spy = capturingSpy();
    const { store } = renderWithStore({ updateRecipe: spy.fn });

    await screen.findByLabelText(/titre/i);
    const quantites = screen.getAllByLabelText(/quantité/i);
    const creme = quantites[1];
    if (!creme) throw new Error('la ligne « Crème » est introuvable');
    await user.clear(creme);

    const enregistrer = screen.getByRole('button', { name: /^enregistrer$/i });
    expect(enregistrer).toBeEnabled();
    await user.click(enregistrer);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Complète ou retire les lignes d’ingrédient incomplètes.',
    );
    expect(screen.queryByText('Impossible d’enregistrer la recette.')).not.toBeInTheDocument();

    expect(spy.state.captured).toBeUndefined();
    expect(store.getState().recipeEdit.status).toBe('idle');
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getAllByLabelText(/nom/i)[1]).toHaveValue('Crème');
  });

  it('la quantité retapée efface le constat et l’ingrédient repart intact', async () => {
    const user = userEvent.setup();
    const spy = capturingSpy();
    const { store } = renderWithStore({ updateRecipe: spy.fn });

    await screen.findByLabelText(/titre/i);
    const creme = screen.getAllByLabelText(/quantité/i)[1];
    if (!creme) throw new Error('la ligne « Crème » est introuvable');
    await user.clear(creme);
    await user.click(screen.getByRole('button', { name: /^enregistrer$/i }));
    expect(
      await screen.findByText('Complète ou retire les lignes d’ingrédient incomplètes.'),
    ).toBeInTheDocument();

    await user.type(creme, '400');

    expect(
      screen.queryByText('Complète ou retire les lignes d’ingrédient incomplètes.'),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^enregistrer$/i }));

    await vi.waitFor(() => expect(store.getState().recipeEdit.status).toBe('success'));
    expect(spy.state.captured?.ingredients).toEqual([
      { name: 'Pommes de terre', quantity: 1, unit: 'kg' },
      { name: 'Crème', quantity: 400, unit: 'ml' },
    ]);
  });

  it('retirer la ligne incomplète efface le constat et laisse enregistrer', async () => {
    const user = userEvent.setup();
    const spy = capturingSpy();
    const { store } = renderWithStore({ updateRecipe: spy.fn });

    await screen.findByLabelText(/titre/i);
    const creme = screen.getAllByLabelText(/quantité/i)[1];
    if (!creme) throw new Error('la ligne « Crème » est introuvable');
    await user.clear(creme);
    await user.click(screen.getByRole('button', { name: /^enregistrer$/i }));
    expect(
      await screen.findByText('Complète ou retire les lignes d’ingrédient incomplètes.'),
    ).toBeInTheDocument();

    const retirer = screen.getAllByRole('button', { name: /retirer l'ingrédient/i })[1];
    if (!retirer) throw new Error('bouton « Retirer » introuvable');
    await user.click(retirer);

    expect(
      screen.queryByText('Complète ou retire les lignes d’ingrédient incomplètes.'),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^enregistrer$/i }));

    await vi.waitFor(() => expect(store.getState().recipeEdit.status).toBe('success'));
    expect(spy.state.captured?.ingredients).toEqual([
      { name: 'Pommes de terre', quantity: 1, unit: 'kg' },
    ]);
  });

  it('renvoie au DÉTAIL de la recette modifiée après un enregistrement réussi', async () => {
    const user = userEvent.setup();
    const spy = capturingSpy();
    renderWithStore({ updateRecipe: spy.fn });

    await screen.findByLabelText(/titre/i);
    await user.click(screen.getByRole('button', { name: /^enregistrer$/i }));

    await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/catalogue/r-1'));
  });

  it('verrouille « Enregistrer » pendant que la modification est en vol', async () => {
    const user = userEvent.setup();
    const pending: UpdateRecipe = () => new Promise<Recipe>(() => {});
    renderWithStore({ updateRecipe: pending });

    await screen.findByLabelText(/titre/i);
    await user.click(screen.getByRole('button', { name: /^enregistrer$/i }));

    const bouton = await screen.findByRole('button', { name: /enregistrement/i });
    expect(bouton).toBeDisabled();
  });

  it('verrouille « Enregistrer » si le titre est vidé', async () => {
    const user = userEvent.setup();
    renderWithStore();

    const titre = await screen.findByLabelText(/titre/i);
    expect(screen.getByRole('button', { name: /^enregistrer$/i })).toBeEnabled();

    await user.clear(titre);

    expect(screen.getByRole('button', { name: /^enregistrer$/i })).toBeDisabled();
  });

  it('verrouille « Enregistrer » si la seule quantité restante dépasse le maximum sûr', async () => {
    const user = userEvent.setup();
    renderWithStore();

    await screen.findByLabelText(/titre/i);
    const [premiereQuantite] = screen.getAllByLabelText(/quantité/i);
    if (!premiereQuantite) throw new Error('champ « Quantité » introuvable');
    const [retirerSecond] = screen
      .getAllByRole('button', { name: /retirer l'ingrédient/i })
      .slice(1);
    if (!retirerSecond) throw new Error('bouton « Retirer » introuvable');
    await user.click(retirerSecond);
    expect(screen.getByRole('button', { name: /^enregistrer$/i })).toBeEnabled();

    await user.clear(premiereQuantite);
    await user.type(premiereQuantite, '1e307');

    expect(premiereQuantite).toHaveValue(1e307);
    expect(screen.getByRole('button', { name: /^enregistrer$/i })).toBeDisabled();
  });

  it('verrouille « Enregistrer » si le dernier ingrédient est retiré', async () => {
    const user = userEvent.setup();
    renderWithStore();

    await screen.findByLabelText(/titre/i);
    expect(screen.getAllByLabelText(/nom/i)).toHaveLength(2);

    while (screen.queryAllByRole('button', { name: /retirer l'ingrédient/i }).length > 0) {
      const [premier] = screen.getAllByRole('button', { name: /retirer l'ingrédient/i });
      if (!premier) throw new Error('bouton « Retirer » introuvable');
      await user.click(premier);
    }

    expect(screen.queryAllByLabelText(/nom/i)).toHaveLength(0);
    expect(screen.getByRole('button', { name: /^enregistrer$/i })).toBeDisabled();
  });

  it('affiche « Recette introuvable » et aucun formulaire pour un identifiant inconnu', async () => {
    renderWithStore(undefined, 'r-inconnue');

    expect(await screen.findByRole('alert')).toHaveTextContent('Recette introuvable');
    expect(screen.queryByLabelText(/titre/i)).not.toBeInTheDocument();
  });

  it('affiche un indicateur de chargement tant que la recette n’est pas lue', () => {
    renderWithStore({ channel: RecipeChannel.silent() });

    expect(screen.getByRole('status')).toHaveTextContent('Chargement…');
  });

  it('hors ligne, dit qu’il n’a pas pu charger la recette — jamais qu’elle est introuvable', async () => {
    renderWithStore({ channel: RecipeChannel.refusingWith(RepositoryUnavailableError.create()) });

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Aucune connexion — la recette n’a pas pu être chargée.',
    );
    expect(screen.queryByText('Recette introuvable')).not.toBeInTheDocument();
  });

  it('venu du menu, l’écran sans recette ramène au MENU', async () => {
    renderAtPath('/catalogue/r-1/modifier?depuis=menu', {
      channel: RecipeChannel.refusingWith(RepositoryUnavailableError.create()),
    });

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Aucune connexion — la recette n’a pas pu être chargée.',
    );
    expect(screen.getByRole('link', { name: '← Menu' })).toHaveAttribute('href', '/menu');
    expect(screen.queryByRole('link', { name: '← Recettes' })).not.toBeInTheDocument();
  });

  it('sans provenance, l’écran sans recette ramène au CATALOGUE', async () => {
    renderAtPath('/catalogue/r-1/modifier', {
      channel: RecipeChannel.refusingWith(RepositoryUnavailableError.create()),
    });

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Aucune connexion — la recette n’a pas pu être chargée.',
    );
    expect(screen.getByRole('link', { name: '← Recettes' })).toHaveAttribute('href', '/catalogue');
    expect(screen.queryByRole('link', { name: '← Menu' })).not.toBeInTheDocument();
  });

  it('offre un lien retour « ← Recette » vers le détail de la recette modifiée', async () => {
    renderWithStore();

    expect(await screen.findByRole('link', { name: '← Recette' })).toHaveAttribute(
      'href',
      '/catalogue/r-1',
    );
  });

  it('venu du menu, le lien « ← Recette » ramène à une fiche qui sait encore d’où l’on vient', async () => {
    renderAtPath('/catalogue/r-1/modifier?depuis=menu');

    expect(await screen.findByRole('link', { name: '← Recette' })).toHaveAttribute(
      'href',
      '/catalogue/r-1?depuis=menu',
    );
  });

  it('venu du menu, un enregistrement réussi rend une fiche qui sait encore d’où l’on vient', async () => {
    const user = userEvent.setup();
    const spy = capturingSpy();
    renderAtPath('/catalogue/r-1/modifier?depuis=menu', { updateRecipe: spy.fn });

    await screen.findByLabelText(/titre/i);
    await user.click(screen.getByRole('button', { name: /^enregistrer$/i }));

    await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/catalogue/r-1?depuis=menu'));
  });

  it('remonté sur le MÊME store après une modification réussie, rouvre le formulaire sans renavigüer', async () => {
    const user = userEvent.setup();
    const spy = capturingSpy();
    const { store, unmount } = renderWithStore({ updateRecipe: spy.fn });

    await screen.findByLabelText(/titre/i);
    await user.click(screen.getByRole('button', { name: /^enregistrer$/i }));
    await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/catalogue/r-1'));

    unmount();
    mockNavigate.mockClear();
    renderOn(store);

    expect(await screen.findByLabelText(/titre/i)).toHaveValue('Gratin dauphinois');
    expect(store.getState().recipeEdit.status).toBe('idle');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('une modification qui aboutit après le départ de l’utilisateur ne le ramène pas au détail', async () => {
    const user = userEvent.setup();
    let resoudre: ((recipe: Recipe) => void) | undefined;
    const differe: UpdateRecipe = () =>
      new Promise<Recipe>((resolve) => {
        resoudre = resolve;
      });
    const { store, unmount } = renderWithStore({ updateRecipe: differe });

    await screen.findByLabelText(/titre/i);
    await user.click(screen.getByRole('button', { name: /^enregistrer$/i }));

    unmount();
    if (!resoudre) throw new Error('l’enregistrement n’a pas été déclenché');
    resoudre(RecipeBuilder.aRecipe().build());

    await vi.waitFor(() => expect(store.getState().recipeEdit.status).toBe('success'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('changer d’identifiant sans démontage remet le statut d’édition à zéro', async () => {
    const user = userEvent.setup();
    const omelette = RecipeBuilder.aRecipe().withId('r-2').withTitle('Omelette aux herbes').build();
    const store = createTestStore({
      observeRecipes: RecipeChannel.seededWith([GRATIN, omelette]).observeRecipes,
      updateRecipe: async (input) => RecipeBuilder.aRecipe().withId(input.id).build(),
    });
    renderOnWithLinkTo(store, 'r-2');

    await screen.findByLabelText(/titre/i);
    await user.click(screen.getByRole('button', { name: /^enregistrer$/i }));
    await vi.waitFor(() => expect(store.getState().recipeEdit.status).toBe('success'));

    await user.click(screen.getByRole('link', { name: 'Autre recette' }));

    expect(await screen.findByDisplayValue('Omelette aux herbes')).toBeInTheDocument();
    expect(store.getState().recipeEdit.status).toBe('idle');
  });
});

describe('RecipeEditContainer — le formulaire ne modifie jamais qu’une recette de référence', () => {
  it('ouvert depuis un créneau de trois personnes, le formulaire montre les quantités de RÉFÉRENCE et l’effectif de référence', async () => {
    renderAtPath('/catalogue/r-1/modifier?depuis=menu&pour=3');
    await screen.findByLabelText(/titre/i);

    expect(screen.getByLabelText(/personnes/i)).toHaveValue(6);
    expect(screen.getAllByLabelText(/quantité/i)[0]).toHaveValue(1);
    expect(screen.getAllByLabelText(/quantité/i)[1]).toHaveValue(500);
  });

  it('ouvert depuis un créneau, un enregistrement rend la fiche du même créneau', async () => {
    const user = userEvent.setup();
    const spy = capturingSpy();
    renderAtPath('/catalogue/r-1/modifier?depuis=menu&pour=3', { updateRecipe: spy.fn });

    await screen.findByLabelText(/titre/i);
    await user.click(screen.getByRole('button', { name: /^enregistrer$/i }));

    await vi.waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/catalogue/r-1?depuis=menu&pour=3'),
    );
  });
});
