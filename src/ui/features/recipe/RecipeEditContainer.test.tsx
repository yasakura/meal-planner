import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { beforeEach, describe, it, expect, vi } from 'vitest';

import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { type Recipe } from '../../../domain/entities/recipe';
import { type GetRecipe } from '../../../domain/use-cases/get-recipe';
import { type UpdateRecipe, type UpdateRecipeInput } from '../../../domain/use-cases/update-recipe';
import { IngredientBuilder } from '../../../domain/test-builders/ingredient.builder';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { loadRecipeDetail } from '../recipe-detail/recipe-detail-slice';
import { createTestStore } from '../../store/create-test-store';
import { RecipeEditContainer } from './RecipeEditContainer';

// L'écran d'édition renavigue vers le DÉTAIL de la recette modifiée (useNavigate) et expose un
// lien retour (Link) → montage sous <Router> requis ; on espionne la navigation.
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

// Monter sur une instance de store DONNÉE est la seule façon de reproduire la rémanence : le
// store applicatif est un singleton de session, un store neuf par montage la masque.
function renderOn(store: TestStore, id = 'r-1') {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/catalogue/${id}/modifier`]}>
        <Routes>
          <Route path="/catalogue/:id/modifier" element={<RecipeEditContainer />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

function renderWithStore(
  overrides?: { getRecipe?: GetRecipe; updateRecipe?: UpdateRecipe },
  id = 'r-1',
) {
  const store = createTestStore({
    getRecipe: overrides?.getRecipe ?? (async () => GRATIN),
    ...(overrides?.updateRecipe ? { updateRecipe: overrides.updateRecipe } : {}),
  });
  return { store, ...renderOn(store, id) };
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

  // Une recette sans préparation ouvre un champ VIDE, jamais « undefined » rendu en toutes lettres.
  it('ouvre un champ préparation vide quand la recette n’en a pas', async () => {
    const sansPreparation = RecipeBuilder.aRecipe().withId('r-1').withoutInstructions().build();
    renderWithStore({ getRecipe: async () => sansPreparation });

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

  // Règle 2 côté écran : ce que le formulaire n'affiche plus n'est PAS envoyé. Le remplacement
  // est intégral, la ligne retirée disparaît de l'input du use-case.
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

  /**
   * Le défaut le plus coûteux de cet écran : vider la quantité d'un ingrédient EXISTANT — le
   * geste banal de qui va retaper une valeur. La ligne est toujours affichée, le bouton toujours
   * actif ; l'enregistrement la faisait disparaître de la recette en annonçant un succès. Le clic
   * est désormais REFUSÉ, et rien ne part vers le dépôt.
   */
  it('refuse d’enregistrer une ligne d’ingrédient incomplète, sans rien envoyer', async () => {
    const user = userEvent.setup();
    const spy = capturingSpy();
    const { store } = renderWithStore({ updateRecipe: spy.fn });

    await screen.findByLabelText(/titre/i);
    const quantites = screen.getAllByLabelText(/quantité/i);
    const creme = quantites[1];
    if (!creme) throw new Error('la ligne « Crème » est introuvable');
    await user.clear(creme);

    // Le bouton RESTE actif : c'est le clic qui refuse, pas un verrou posé d'avance.
    const enregistrer = screen.getByRole('button', { name: /^enregistrer$/i });
    expect(enregistrer).toBeEnabled();
    await user.click(enregistrer);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Complète ou retire les lignes d’ingrédient incomplètes.',
    );
    // Le vocabulaire d'une panne n'a rien à faire ici : la saisie est incomplète, pas le réseau.
    expect(screen.queryByText('Impossible d’enregistrer la recette.')).not.toBeInTheDocument();

    // Aucune écriture n'est partie, et la ligne est toujours là.
    expect(spy.state.captured).toBeUndefined();
    expect(store.getState().recipeEdit.status).toBe('idle');
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getAllByLabelText(/nom/i)[1]).toHaveValue('Crème');
  });

  /** La SORTIE du constat : la ligne complétée, il s'efface et l'enregistrement repart. */
  it('la quantité retapée efface le constat et l’ingrédient repart intact', async () => {
    const user = userEvent.setup();
    const spy = capturingSpy();
    const { store } = renderWithStore({ updateRecipe: spy.fn });

    await screen.findByLabelText(/titre/i);
    const creme = screen.getAllByLabelText(/quantité/i)[1];
    if (!creme) throw new Error('la ligne « Crème » est introuvable');
    await user.clear(creme);
    await user.click(screen.getByRole('button', { name: /^enregistrer$/i }));
    // Le localisateur de l'absence affirmée juste après, vu ici en train de trouver son texte.
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

  /** L'autre remède que le constat nomme : retirer la ligne l'efface aussi. */
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

  it('reste sur le formulaire et affiche un constat sobre quand l’enregistrement échoue', async () => {
    const user = userEvent.setup();
    const failing: UpdateRecipe = () => Promise.reject(new Error('Firestore indisponible'));
    renderWithStore({ updateRecipe: failing });

    await screen.findByLabelText(/titre/i);
    await user.click(screen.getByRole('button', { name: /^enregistrer$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible d’enregistrer la recette.',
    );
    expect(screen.queryByText(/Firestore/i)).not.toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
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

  // Les invariants s'appliquent à la modification comme à la création : on ne peut pas rendre
  // invalide par modification une recette qui était valide. Le formulaire refuse de soumettre.
  it('verrouille « Enregistrer » si le titre est vidé', async () => {
    const user = userEvent.setup();
    renderWithStore();

    const titre = await screen.findByLabelText(/titre/i);
    expect(screen.getByRole('button', { name: /^enregistrer$/i })).toBeEnabled();

    await user.clear(titre);

    expect(screen.getByRole('button', { name: /^enregistrer$/i })).toBeDisabled();
  });

  it('verrouille « Enregistrer » si le dernier ingrédient est retiré', async () => {
    const user = userEvent.setup();
    renderWithStore();

    await screen.findByLabelText(/titre/i);
    expect(screen.getAllByLabelText(/nom/i)).toHaveLength(2);

    // RE-INTERROGER à chaque tour : la liste des lignes est recréée à chaque retrait, et un
    // bouton capturé avant le premier clic est détaché — le cliquer est un no-op silencieux,
    // même famille que le `user.type()` sur un champ `disabled` de FR-3.
    while (screen.queryAllByRole('button', { name: /retirer l'ingrédient/i }).length > 0) {
      const [premier] = screen.getAllByRole('button', { name: /retirer l'ingrédient/i });
      if (!premier) throw new Error('bouton « Retirer » introuvable');
      await user.click(premier);
    }

    expect(screen.queryAllByLabelText(/nom/i)).toHaveLength(0);
    expect(screen.getByRole('button', { name: /^enregistrer$/i })).toBeDisabled();
  });

  it('affiche « Recette introuvable » et aucun formulaire pour un identifiant inconnu', async () => {
    renderWithStore({ getRecipe: async () => undefined }, 'r-inconnue');

    expect(await screen.findByRole('alert')).toHaveTextContent('Recette introuvable');
    expect(screen.queryByLabelText(/titre/i)).not.toBeInTheDocument();
  });

  it('affiche un indicateur de chargement tant que la recette n’est pas lue', () => {
    const jamais: GetRecipe = () => new Promise<Recipe>(() => {});
    renderWithStore({ getRecipe: jamais });

    expect(screen.getByRole('status')).toHaveTextContent('Chargement…');
  });

  it('hors ligne, dit qu’il n’a pas pu charger la recette — jamais qu’elle est introuvable', async () => {
    const horsLigne: GetRecipe = () => Promise.reject(RepositoryUnavailableError.create());
    renderWithStore({ getRecipe: horsLigne });

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Aucune connexion — la recette n’a pas pu être chargée.',
    );
    // Même localisateur que le scénario « identifiant inconnu » ci-dessus, où il trouve bien
    // son texte : c'est ce qui rend cette absence discriminante plutôt que décorative.
    expect(screen.queryByText('Recette introuvable')).not.toBeInTheDocument();
  });

  // On arrive ici DEPUIS le détail : annuler doit rendre l'écran d'où l'on vient, pas la liste
  // deux crans plus loin. Libellé au singulier — « Recettes » annoncerait le catalogue. Le titre
  // de la recette ne figure pas dans le lien : un titre long y déborde de la mise en page.
  it('offre un lien retour « ← Recette » vers le détail de la recette modifiée', async () => {
    renderWithStore();

    expect(await screen.findByRole('link', { name: '← Recette' })).toHaveAttribute(
      'href',
      '/catalogue/r-1',
    );
  });

  /**
   * Rémanence du statut d'édition (même famille que l'issue #27). Revenir au détail puis
   * recliquer « Modifier » est une navigation CLIENT : le store survit, le container se remonte
   * sur un statut resté 'success'. Le store est délibérément RÉUTILISÉ d'un render à l'autre —
   * un store recréé ferait de chaque montage un « premier de la session » et ne détecterait rien.
   */
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

  /**
   * Rémanence de la LECTURE : `recipeDetail` est partagé avec l'écran de détail et survit à la
   * navigation. Ouvrir l'édition d'une recette alors que le store porte encore une AUTRE recette
   * ne doit jamais préremplir le formulaire avec cette dernière — l'utilisateur enregistrerait
   * le contenu d'une recette sous l'identifiant d'une autre.
   */
  it('ne préremplit jamais avec la recette précédemment consultée', async () => {
    const autre = RecipeBuilder.aRecipe().withId('r-2').withTitle('Omelette aux herbes').build();
    let resoudre: ((recipe: Recipe) => void) | undefined;
    const getRecipe: GetRecipe = (id) =>
      id === 'r-2'
        ? Promise.resolve(autre)
        : new Promise<Recipe>((resolve) => {
            resoudre = resolve;
          });
    const store = createTestStore({ getRecipe });

    await store.dispatch(loadRecipeDetail('r-2'));
    expect(store.getState().recipeDetail.recipe?.title).toBe('Omelette aux herbes');

    renderOn(store, 'r-1');

    expect(screen.queryByDisplayValue('Omelette aux herbes')).not.toBeInTheDocument();

    // Gage : le même localisateur, vu trouver le titre de la recette RÉELLEMENT demandée dès
    // qu'elle arrive. Sans lui, l'absence ci-dessus serait vraie sur un écran vide.
    if (!resoudre) throw new Error('la lecture de r-1 n’a pas été déclenchée');
    resoudre(GRATIN);
    expect(await screen.findByDisplayValue('Gratin dauphinois')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Omelette aux herbes')).not.toBeInTheDocument();
  });

  /**
   * Le bouton « Enregistrer » est verrouillé pendant l'enregistrement, la tab bar ne l'est pas :
   * l'utilisateur peut quitter le formulaire pendant que l'écriture est en vol. Elle aboutit
   * (rien ne l'annule), mais son geste de navigation prime — on ne le ramène pas au détail.
   */
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

    // L'enregistrement aboutit bel et bien : c'est ce qui rend l'absence de navigation
    // discriminante — la promesse s'est résolue, la suite du `then` a eu lieu.
    await vi.waitFor(() => expect(store.getState().recipeEdit.status).toBe('success'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
