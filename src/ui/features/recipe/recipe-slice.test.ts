import { describe, it, expect } from 'vitest';

import { type Recipe } from '../../../domain/entities/recipe';
import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { type CreateRecipe, type CreateRecipeInput } from '../../../domain/use-cases/create-recipe';
import { type NewRecipeId } from '../../../domain/use-cases/new-recipe-id';
import { IngredientBuilder } from '../../../domain/test-builders/ingredient.builder';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../store/create-test-store';
import { deferred } from '../../test-utils/deferred';
import {
  createRecipe,
  recipeCreateNoticeOf,
  recipeFormScreenOpened,
  selectIsCreationLocked,
  selectRecipeCreation,
  type RecipeDraft,
} from './recipe-slice';

function anInput(): RecipeDraft {
  return {
    title: 'Poulet rôti',
    ingredients: [IngredientBuilder.anIngredient().build()],
    convivesReference: 4,
  };
}

// L'identifiant que le store de test pose à sa naissance : `StubIdGenerator` par défaut.
const ID_DU_STORE = 'generated-id-1';

// Un générateur qui rend un identifiant DIFFÉRENT à chaque appel — comme celui de production.
// Le stub par défaut, lui, rend toujours le même : il ne saurait pas distinguer « renouvelé »
// de « conservé », et c'est exactement la distinction que la moitié de ce fichier examine.
//
// `id-1` part à la NAISSANCE du store (`recipeInitialState`) : le premier formulaire ouvert
// porte donc `id-2`. Un store qui naît sans identifiant laisserait un envoi partir sans savoir
// où écrire, et c'est ce que ce décalage montre en creux.
function identifiantsSuccessifs(): NewRecipeId {
  let rang = 0;
  return () => `id-${++rang}`;
}

function unSucces(): CreateRecipe {
  return async () => RecipeBuilder.aRecipe().build();
}

const nonAcquitte: CreateRecipe = () => Promise.reject(RepositoryUnavailableError.create());

describe('recipe slice', () => {
  /**
   * Un store réel naît avec l'identifiant de son premier formulaire (`recipeInitialState`) :
   * aucun envoi ne peut donc partir sans identifiant, même si l'écran n'a rien signalé.
   */
  it('un store neuf est idle, et porte déjà un identifiant de brouillon', () => {
    const store = createTestStore();

    expect(selectRecipeCreation(store.getState())).toEqual({
      status: 'idle',
      draftId: ID_DU_STORE,
      // Aucun envoi n'est encore parti : il n'y a pas de verdict attendu.
      latestCreateRequestId: null,
    });
  });

  it('createRecipe réussi passe le store en success et forwarde l’input au use case injecté', async () => {
    let captured: CreateRecipeInput | undefined;
    const savedRecipe: Recipe = RecipeBuilder.aRecipe().build();
    const spy: CreateRecipe = async (input) => {
      captured = input;
      return savedRecipe;
    };
    const store = createTestStore({ createRecipe: spy });

    const input = anInput();
    const enregistrement = await store.dispatch(createRecipe(input));

    // L'identifiant n'est PAS dans ce que le formulaire envoie : il vient du brouillon ouvert,
    // et c'est le slice qui l'y joint. Un container ne saurait pas en inventer un.
    expect(captured).toEqual({ id: ID_DU_STORE, ...input });
    expect(selectRecipeCreation(store.getState())).toEqual({
      status: 'success',
      // `StubIdGenerator` rend toujours le même identifiant : le renouvellement posé par le
      // succès est examiné par les scénarios à générateur successif, plus bas.
      draftId: ID_DU_STORE,
      latestCreateRequestId: enregistrement.meta.requestId,
    });
  });

  it('createRecipe en échec passe le store en error', async () => {
    const failing: CreateRecipe = () => Promise.reject(new Error('Firestore indisponible'));
    const store = createTestStore({ createRecipe: failing });

    const enregistrement = await store.dispatch(createRecipe(anInput()));

    expect(selectRecipeCreation(store.getState())).toEqual({
      status: 'error',
      draftId: ID_DU_STORE,
      latestCreateRequestId: enregistrement.meta.requestId,
    });
  });

  it('pendant un createRecipe en vol, le status passe à saving', () => {
    const pending: CreateRecipe = () => new Promise<Recipe>(() => {});
    const store = createTestStore({ createRecipe: pending });

    const enVol = store.dispatch(createRecipe(anInput()));

    expect(selectRecipeCreation(store.getState())).toEqual({
      status: 'saving',
      draftId: ID_DU_STORE,
      // Mémorisé dès le DÉPART : c'est à l'arrivée qu'on saura si ce verdict est encore le bon.
      latestCreateRequestId: enVol.requestId,
    });
  });

  // Le statut d'enregistrement est un état transitoire dans un store qui, lui, est un singleton
  // de session : resté à 'success', il fait renavigüer le formulaire à peine rouvert (issue #27).
  // C'est le REDUCER qui décide d'appliquer la remise à zéro, pas le container : le slice est
  // muté par Stryker, le .tsx ne l'est pas.
  it('l’ouverture d’un formulaire remet à idle un enregistrement déjà réussi', async () => {
    const store = createTestStore({ createRecipe: unSucces() });
    await store.dispatch(createRecipe(anInput()));

    store.dispatch(recipeFormScreenOpened());

    expect(selectRecipeCreation(store.getState()).status).toBe('idle');
  });

  it('l’ouverture d’un formulaire remet à idle un enregistrement en échec', async () => {
    const failing: CreateRecipe = () => Promise.reject(new Error('Firestore indisponible'));
    const store = createTestStore({ createRecipe: failing });
    await store.dispatch(createRecipe(anInput()));

    store.dispatch(recipeFormScreenOpened());

    expect(selectRecipeCreation(store.getState()).status).toBe('idle');
  });

  it('l’ouverture d’un formulaire efface un constat non acquitté', async () => {
    const store = createTestStore({ createRecipe: nonAcquitte });
    await store.dispatch(createRecipe(anInput()));

    store.dispatch(recipeFormScreenOpened());

    expect(selectRecipeCreation(store.getState()).status).toBe('idle');
  });

  /**
   * UN formulaire, UN identifiant : sans renouvellement, la seconde recette de la session
   * écraserait la première — le doublon retourné en perte de donnée.
   */
  it('chaque ouverture de formulaire pose un identifiant NEUF', () => {
    const store = createTestStore({ newRecipeId: identifiantsSuccessifs() });

    store.dispatch(recipeFormScreenOpened());
    expect(selectRecipeCreation(store.getState()).draftId).toBe('id-2');

    store.dispatch(recipeFormScreenOpened());
    expect(selectRecipeCreation(store.getState()).draftId).toBe('id-3');
  });

  /**
   * Ce que le renouvellement protège, vu du dépôt : deux formulaires successifs écrivent DEUX
   * documents. C'est le risque de symétrie du geste — un identifiant conservé trop longtemps
   * fait de la seconde recette l'écrasement de la première.
   */
  it('deux formulaires successifs écrivent sous deux identifiants distincts', async () => {
    const ids: string[] = [];
    const spy: CreateRecipe = async (input) => {
      ids.push(input.id);
      return RecipeBuilder.aRecipe().build();
    };
    const store = createTestStore({ createRecipe: spy, newRecipeId: identifiantsSuccessifs() });

    store.dispatch(recipeFormScreenOpened());
    await store.dispatch(createRecipe(anInput()));
    store.dispatch(recipeFormScreenOpened());
    await store.dispatch(createRecipe(anInput()));

    // `id-3` est celui que le SUCCÈS du premier envoi a posé ; la réouverture, qui a lieu après,
    // en pose un quatrième. Deux documents distincts, ce que ce scénario examine.
    expect(ids).toEqual(['id-2', 'id-4']);
  });

  // Un thunk RTK n'est pas annulé par un démontage : ni le statut ni l'identifiant ne bougent
  // tant que l'écriture est en vol. Le 'fulfilled' à venir ressusciterait un succès sur un
  // formulaire déjà rouvert, et un identifiant neuf ferait du réenvoi le doublon qu'on vient
  // de rendre impossible.
  it('l’ouverture d’un formulaire ne touche pas à un enregistrement encore en vol', () => {
    const pending: CreateRecipe = () => new Promise<Recipe>(() => {});
    const store = createTestStore({ createRecipe: pending, newRecipeId: identifiantsSuccessifs() });
    store.dispatch(recipeFormScreenOpened());
    const enVol = store.dispatch(createRecipe(anInput()));

    store.dispatch(recipeFormScreenOpened());

    expect(selectRecipeCreation(store.getState())).toEqual({
      status: 'saving',
      draftId: 'id-2',
      latestCreateRequestId: enVol.requestId,
    });
  });

  /**
   * Le renouvellement que le garde ci-dessus REFUSE doit être rattrapé, sans quoi il n'est
   * jamais repris : `recipeFormOpened` est le seul point qui pose un identifiant. C'est donc au
   * SUCCÈS de le reposer — sinon la recette suivante part sous celui de la précédente et
   * l'ÉCRASE, `save` étant un `setDoc`.
   */
  it('après une ouverture refusée en vol, l’envoi suivant écrit sous un identifiant NEUF', async () => {
    const ids: string[] = [];
    const enVol = deferred<Recipe>();
    let appels = 0;
    const spy: CreateRecipe = (input) => {
      ids.push(input.id);
      appels += 1;
      return appels === 1 ? enVol.promise : Promise.resolve(RecipeBuilder.aRecipe().build());
    };
    const store = createTestStore({ createRecipe: spy, newRecipeId: identifiantsSuccessifs() });
    store.dispatch(recipeFormScreenOpened());

    const premier = store.dispatch(createRecipe(anInput()));
    // Le formulaire est rouvert PENDANT l'écriture : le garde refuse le renouvellement, et
    // `id-3`, tiré par le thunk d'ouverture, est jeté. D'où le trou dans la suite plus bas.
    store.dispatch(recipeFormScreenOpened());
    enVol.resolve(RecipeBuilder.aRecipe().build());
    await premier;

    await store.dispatch(createRecipe(anInput()));

    expect(ids).toEqual(['id-2', 'id-4']);
  });

  /**
   * Même garde de fraîcheur que l'ajout d'un convive, et pour la même raison : deux envois
   * peuvent se régler dans le désordre, et le succès de l'envoi ABANDONNÉ tournerait la page
   * d'un formulaire dont l'envoi courant vient à peine d'aboutir.
   */
  it('un succès tardif d’un envoi dépassé ne renouvelle pas l’identifiant du formulaire courant', async () => {
    const lent = deferred<Recipe>();
    let appels = 0;
    const spy: CreateRecipe = () => {
      appels += 1;
      return appels === 1 ? lent.promise : Promise.resolve(RecipeBuilder.aRecipe().build());
    };
    const store = createTestStore({ createRecipe: spy, newRecipeId: identifiantsSuccessifs() });

    const abandonne = store.dispatch(createRecipe(anInput()));
    const courant = store.dispatch(createRecipe(anInput()));
    await courant;
    // Le succès de l'envoi abandonné arrive APRÈS celui de l'envoi courant : c'est tout l'enjeu.
    lent.resolve(RecipeBuilder.aRecipe().build());
    await abandonne;

    expect(selectRecipeCreation(store.getState())).toEqual({
      status: 'success',
      // Posé par le succès COURANT, et non par le succès tardif qui aurait tiré `id-3`.
      draftId: 'id-2',
      latestCreateRequestId: courant.requestId,
    });
  });
  /**
   * Le pendant du garde ci-dessus, côté REJET, et le même que celui de l'ajout d'un convive :
   * l'échec de l'envoi ABANDONNÉ afficherait « aucune connexion » sur une recette que l'envoi
   * COURANT vient d'enregistrer — un constat qui ment, sur un formulaire dont la page est tournée.
   */
  it('un rejet tardif d’un envoi dépassé n’efface pas le succès de l’envoi courant', async () => {
    const lent = deferred<Recipe>();
    let appels = 0;
    const spy: CreateRecipe = () => {
      appels += 1;
      return appels === 1 ? lent.promise : Promise.resolve(RecipeBuilder.aRecipe().build());
    };
    const store = createTestStore({ createRecipe: spy, newRecipeId: identifiantsSuccessifs() });

    const abandonne = store.dispatch(createRecipe(anInput()));
    const courant = store.dispatch(createRecipe(anInput()));
    await courant;
    // Le rejet de l'envoi abandonné arrive APRÈS le succès de l'envoi courant : c'est tout l'enjeu.
    lent.reject(RepositoryUnavailableError.create());
    await abandonne;

    expect(selectRecipeCreation(store.getState())).toEqual({
      status: 'success',
      // Posé par le succès COURANT : le rejet tardif ne le reprend pas non plus.
      draftId: 'id-2',
      latestCreateRequestId: courant.requestId,
    });
  });

  /**
   * L'autre conséquence du même garde, et la plus coûteuse : le rejet tardif reçu pendant qu'un
   * AUTRE envoi est encore en vol lèverait le verrou d'envoi. Rien n'annule un thunk RTK — le
   * bouton se rouvrirait sur une écriture dont personne n'a le verdict.
   */
  it('un rejet tardif d’un envoi dépassé ne déverrouille pas l’envoi encore en vol', async () => {
    const lent = deferred<Recipe>();
    let appels = 0;
    const spy: CreateRecipe = () => {
      appels += 1;
      return appels === 1 ? lent.promise : new Promise<Recipe>(() => {});
    };
    const store = createTestStore({ createRecipe: spy });

    const abandonne = store.dispatch(createRecipe(anInput()));
    const courant = store.dispatch(createRecipe(anInput()));
    lent.reject(RepositoryUnavailableError.create());
    await abandonne;

    expect(selectRecipeCreation(store.getState())).toEqual({
      status: 'saving',
      draftId: ID_DU_STORE,
      latestCreateRequestId: courant.requestId,
    });
    expect(selectIsCreationLocked(store.getState())).toBe(true);
  });

  /**
   * Hors ligne, `setDoc` n'acquitte jamais : la borne de `withAckDeadline` rejette au bout de
   * 5 s alors que l'écriture est en FILE LOCALE et atterrira au retour du réseau. Un verdict
   * d'échec ferait retaper à l'utilisateur une recette qui est en route. Même vocabulaire que
   * les convives et le menu : une troisième issue, qui n'affirme ni que la recette est
   * enregistrée ni qu'elle est perdue.
   */
  it('le dépôt qui n’a pas répondu : l’enregistrement n’est pas confirmé, il n’a pas échoué', async () => {
    const store = createTestStore({ createRecipe: nonAcquitte });

    const enregistrement = await store.dispatch(createRecipe(anInput()));

    expect(selectRecipeCreation(store.getState())).toEqual({
      status: 'unconfirmed',
      draftId: ID_DU_STORE,
      latestCreateRequestId: enregistrement.meta.requestId,
    });
  });

  const SUCCES = { tone: 'success', message: 'Recette enregistrée.' };
  const PANNE = {
    tone: 'unconfirmed',
    message: 'Aucune connexion — l’enregistrement de la recette n’a pas pu être confirmé.',
  };
  const ECHEC = { tone: 'error', message: 'Impossible d’enregistrer la recette.' };

  function constat(store: ReturnType<typeof createTestStore>) {
    return recipeCreateNoticeOf(selectRecipeCreation(store.getState()));
  }

  /**
   * L'écriture est PARTIE : elle atterrira au retour du réseau. Le constat le dit, et n'exige
   * rien — l'envoi, lui, se réarme comme après n'importe quel verdict rendu.
   */
  it('un enregistrement non acquitté se constate poliment, et l’envoi se réarme', async () => {
    const store = createTestStore({ createRecipe: nonAcquitte });

    await store.dispatch(createRecipe(anInput()));

    expect(constat(store)).toEqual(PANNE);
    expect(selectIsCreationLocked(store.getState())).toBe(false);
  });

  /**
   * Ce qui rend le réarmement sans danger : le second envoi part sous le MÊME identifiant, donc
   * dans le MÊME document. La file locale de Firestore écoulera deux écritures d'une recette,
   * pas deux recettes. C'est le verrou d'envoi qui devient inutile, pas le constat.
   */
  it('un second envoi après un constat non acquitté réécrit le MÊME document', async () => {
    const ids: string[] = [];
    const spy: CreateRecipe = (input) => {
      ids.push(input.id);
      return Promise.reject(RepositoryUnavailableError.create());
    };
    const store = createTestStore({ createRecipe: spy, newRecipeId: identifiantsSuccessifs() });
    store.dispatch(recipeFormScreenOpened());

    await store.dispatch(createRecipe(anInput()));
    await store.dispatch(createRecipe(anInput()));

    expect(ids).toEqual(['id-2', 'id-2']);
  });

  // Le dépôt a bel et bien répondu, et il a refusé : rien n'est parti, l'envoi se réarme.
  it('un échec franc du dépôt : l’écran dit l’échec, et l’envoi se réarme', async () => {
    const failing: CreateRecipe = () => Promise.reject(new Error('Firestore indisponible'));
    const store = createTestStore({ createRecipe: failing });

    await store.dispatch(createRecipe(anInput()));

    expect(constat(store)).toEqual(ECHEC);
    expect(selectIsCreationLocked(store.getState())).toBe(false);
  });

  it('pendant l’enregistrement, l’envoi est verrouillé et l’écran ne constate rien encore', async () => {
    const enVol = deferred<Recipe>();
    const store = createTestStore({ createRecipe: () => enVol.promise });

    const enregistrement = store.dispatch(createRecipe(anInput()));

    expect(selectIsCreationLocked(store.getState())).toBe(true);
    expect(constat(store)).toBeNull();

    // GAGE des deux assertions ci-dessus : le verrou se lève et le constat paraît au règlement.
    // Sans lui, un verrou armé pour toujours et un écran définitivement muet passeraient aussi.
    enVol.resolve(RecipeBuilder.aRecipe().build());
    await enregistrement;
    expect(selectIsCreationLocked(store.getState())).toBe(false);
    expect(constat(store)).toEqual(SUCCES);
  });

  /**
   * Ce qui empêche le constat de PÉRIMER : le verdict suivant prend toute la place. Un envoi
   * réussi ne peut donc pas cohabiter avec le constat de panne de l'envoi précédent.
   */
  it('un envoi qui aboutit chasse le constat non acquitté du précédent', async () => {
    let enPanne = true;
    const spy: CreateRecipe = async () => {
      if (enPanne) throw RepositoryUnavailableError.create();
      return RecipeBuilder.aRecipe().build();
    };
    const store = createTestStore({ createRecipe: spy });
    await store.dispatch(createRecipe(anInput()));
    expect(constat(store)).toEqual(PANNE);

    enPanne = false;
    await store.dispatch(createRecipe(anInput()));

    expect(constat(store)).toEqual(SUCCES);
  });
});
