import { describe, it, expect } from 'vitest';

import { type Recipe } from '../../../domain/entities/recipe';
import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { type GetRecipe } from '../../../domain/use-cases/get-recipe';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../store/create-test-store';
import { deferred } from '../../test-utils/deferred';
import {
  loadRecipeDetail,
  recipeDetailReducer,
  selectRecipeDetail,
  type RecipeDetailState,
} from './recipe-detail-slice';

describe('recipe-detail slice', () => {
  it('un store neuf est idle, sans recette ni erreur', () => {
    const store = createTestStore();

    expect(selectRecipeDetail(store.getState())).toEqual({
      status: 'idle',
      recipe: null,
      error: null,
      latestRequestId: null,
    });
  });

  it('loadRecipeDetail qui trouve une recette passe en success avec la recette renvoyée par le use case injecté', async () => {
    const recipe = RecipeBuilder.aRecipe().withId('r-42').withTitle('Ratatouille').build();
    const getRecipe: GetRecipe = async () => recipe;
    const store = createTestStore({ getRecipe });

    const loaded = await store.dispatch(loadRecipeDetail('r-42'));

    expect(selectRecipeDetail(store.getState())).toEqual({
      status: 'success',
      recipe,
      error: null,
      latestRequestId: loaded.meta.requestId,
    });
  });

  it('pendant un loadRecipeDetail en vol, le status passe à loading', () => {
    const pending: GetRecipe = () => new Promise(() => {});
    const store = createTestStore({ getRecipe: pending });

    const inFlight = store.dispatch(loadRecipeDetail('r-1'));

    expect(selectRecipeDetail(store.getState())).toEqual({
      status: 'loading',
      recipe: null,
      error: null,
      latestRequestId: inFlight.requestId,
    });
  });

  // [guard] Dans le flux réel, pending précède toujours fulfilled/rejected, donc les
  // resets de recipe/error du pending ne meurent jamais seuls. On exerce le reducer
  // sur un état SALE (recette + erreur d'une consultation précédente) pour tuer
  // précisément ces mutants. Verrouille : « ouvrir une nouvelle recette repart d'un
  // écran de chargement propre, sans laisser voir l'ancienne recette ni l'erreur ».
  it('un nouveau chargement (pending) efface la recette et l’erreur périmées', () => {
    const stale = RecipeBuilder.aRecipe().withId('stale').withTitle('Ancienne').build();
    const dirty: RecipeDetailState = {
      status: 'error',
      recipe: stale,
      error: 'panne périmée',
      latestRequestId: null,
    };

    const next = recipeDetailReducer(dirty, loadRecipeDetail.pending('req-1', 'r-9'));

    expect(next).toEqual({
      status: 'loading',
      recipe: null,
      error: null,
      latestRequestId: 'req-1',
    });
  });

  it('loadRecipeDetail qui ne trouve pas la recette (undefined) passe en notFound, pas en success ni error', async () => {
    const getRecipe: GetRecipe = async () => undefined;
    const store = createTestStore({ getRecipe });

    const missing = await store.dispatch(loadRecipeDetail('inconnu'));

    expect(selectRecipeDetail(store.getState())).toEqual({
      status: 'notFound',
      recipe: null,
      error: null,
      latestRequestId: missing.meta.requestId,
    });
  });

  it('loadRecipeDetail en échec passe en error avec le message du use case', async () => {
    const getRecipe: GetRecipe = async () => {
      throw new Error('Firestore indisponible');
    };
    const store = createTestStore({ getRecipe });

    const failed = await store.dispatch(loadRecipeDetail('r-1'));

    expect(selectRecipeDetail(store.getState())).toEqual({
      status: 'error',
      recipe: null,
      error: 'Firestore indisponible',
      latestRequestId: failed.meta.requestId,
    });
  });

  // Trois issues à ne pas confondre : la recette n'existe pas (`notFound`), le serveur a
  // refusé (`error`), ou on n'a rien pu lire (`unavailable`). Sans ce troisième status,
  // l'écran affirme l'inexistence d'une recette qu'il n'a simplement pas pu charger.
  it('un chargement empêché par un dépôt injoignable prend un status distinct de error ET de notFound', async () => {
    const unavailable: GetRecipe = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({ getRecipe: unavailable });

    const refused = await store.dispatch(loadRecipeDetail('r-1'));

    expect(selectRecipeDetail(store.getState())).toEqual({
      status: 'unavailable',
      recipe: null,
      error: null,
      latestRequestId: refused.meta.requestId,
    });
  });

  // `error` doit RETOMBER à null, sinon un écran qui lit les deux champs afficherait le
  // constat hors-ligne à côté du message d'échec périmé de la consultation précédente.
  it('un dépôt injoignable efface l’erreur périmée au lieu de l’empiler', () => {
    const dirty: RecipeDetailState = {
      status: 'error',
      recipe: null,
      error: 'panne périmée',
      // La consultation dont on reçoit le rejet est bien la dernière lancée : ce test parle
      // de l'effacement de l'erreur, pas de la garde de fraîcheur.
      latestRequestId: 'req-1',
    };

    const next = recipeDetailReducer(
      dirty,
      loadRecipeDetail.rejected(RepositoryUnavailableError.create(), 'req-1', 'r-9'),
    );

    expect(next).toEqual({
      status: 'unavailable',
      recipe: null,
      error: null,
      latestRequestId: 'req-1',
    });
  });

  // LE scénario du cycle, atteignable sans navigation exotique : ouvrir une recette sur un
  // réseau qui rame, revenir au catalogue (le container se démonte, le thunk N'EST PAS
  // annulé), ouvrir une autre recette qui s'affiche vite. Le rejet tardif de la première
  // arrivait alors sur une recette fraîchement chargée. Aggravé par ce cycle : `unavailable`
  // ne propose aucun « Réessayer », l'utilisateur restait devant un mensonge sans issue.
  it('le rejet tardif d’une recette abandonnée ne remplace pas la recette affichée par un constat hors-ligne', async () => {
    const deux = RecipeBuilder.aRecipe().withId('r-2').withTitle('Recette Deux').build();
    const slow = deferred<Recipe | undefined>();
    const getRecipe: GetRecipe = (id) => (id === 'r-1' ? slow.promise : Promise.resolve(deux));
    const store = createTestStore({ getRecipe });

    const abandoned = store.dispatch(loadRecipeDetail('r-1'));
    const current = store.dispatch(loadRecipeDetail('r-2'));
    await current;
    // Le rejet arrive APRÈS que la recette courante s'est affichée : c'est tout l'enjeu.
    slow.reject(RepositoryUnavailableError.create());
    await abandoned;

    expect(selectRecipeDetail(store.getState())).toEqual({
      status: 'success',
      recipe: deux,
      error: null,
      latestRequestId: current.requestId,
    });
  });

  // Symétrique, et plus insidieux : un succès tardif afficherait l'ANCIENNE recette sous
  // l'URL de la nouvelle. L'écran serait faux sans rien signaler.
  it('le succès tardif d’une recette abandonnée n’affiche pas l’ancienne à la place de la nouvelle', async () => {
    const une = RecipeBuilder.aRecipe().withId('r-1').withTitle('Recette Une').build();
    const deux = RecipeBuilder.aRecipe().withId('r-2').withTitle('Recette Deux').build();
    const slow = deferred<Recipe | undefined>();
    const getRecipe: GetRecipe = (id) => (id === 'r-1' ? slow.promise : Promise.resolve(deux));
    const store = createTestStore({ getRecipe });

    const abandoned = store.dispatch(loadRecipeDetail('r-1'));
    const current = store.dispatch(loadRecipeDetail('r-2'));
    await current;
    slow.resolve(une);
    await abandoned;

    expect(selectRecipeDetail(store.getState())).toEqual({
      status: 'success',
      recipe: deux,
      error: null,
      latestRequestId: current.requestId,
    });
  });
});
