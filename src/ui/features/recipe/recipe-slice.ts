import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { type Recipe } from '../../../domain/entities/recipe';
import { isRepositoryUnavailable } from '../../../domain/errors/repository-unavailable-error';
import { type CreateRecipeInput } from '../../../domain/use-cases/create-recipe';
import { type AppThunk, type AppThunkApiConfig, type RootState } from '../../store/store';

/**
 * `unconfirmed` : le dépôt n'a pas acquitté l'écriture dans la borne (`withAckDeadline`). Hors
 * ligne, `setDoc` ne rejette pas — il met l'écriture en FILE LOCALE et n'acquitte qu'au serveur,
 * donc elle atterrira au retour du réseau. Troisième issue, qui n'affirme ni que la recette est
 * enregistrée ni qu'elle est perdue. Même vocabulaire que les convives et le menu : les trois
 * cycles posent la même question à l'écran — est-ce fait, est-ce refusé, ou ne sait-on pas ?
 *
 * La distinction n'est pas cosmétique : « impossible d'enregistrer » ferait retaper une recette
 * qui est en route. Le constat, lui, n'exige RIEN — c'est tout ce qui reste de la gestion du
 * hors ligne ici, et le réenvoi éventuel est sans danger puisqu'il vise le même document.
 */
export type RecipeCreationStatus = 'idle' | 'saving' | 'success' | 'error' | 'unconfirmed';

export type RecipeState = {
  status: RecipeCreationStatus;
  /**
   * L'identifiant du document que le formulaire OUVERT écrira. Posé à son ouverture et conservé
   * jusqu'à la suivante : deux envois du même formulaire visent le même document, deux
   * formulaires successifs en visent deux — sans quoi la seconde recette écraserait la première.
   *
   * `| null` comme la date de début du menu, et pour la même raison : `initialState` est
   * statique et ne peut appeler aucun port. C'est `recipeInitialState`, appelée à la naissance
   * du store, qui le pose — seul un appel NU au reducer peut voir le null.
   */
  draftId: string | null;
  /**
   * requestId du DERNIER envoi lancé. Deux envois peuvent se régler dans le désordre, et le
   * verdict de celui qu'on a ABANDONNÉ — succès comme rejet — parlerait d'un formulaire dont la
   * page est déjà tournée. Même mémoire, et même usage, que `latestAddRequestId` des convives.
   *
   * N'est remis à zéro par RIEN : ce n'est pas un constat destiné à l'utilisateur, c'est un
   * aiguillage. Après un verdict reconnu il garde son id alors que plus rien n'est en vol, et
   * `latestCreateRequestId !== null` n'est donc PAS un prédicat « une écriture est en vol ».
   */
  latestCreateRequestId: string | null;
};

/**
 * Ce que l'écran dit de l'enregistrement, et rien d'autre. Trois tons pour trois issues : un
 * succès, un refus qui appelle une action, et une absence de réponse qui ne demande rien. Le ton
 * choisit le rôle ARIA côté rendu.
 * Un seul objet nullable plutôt que trois messages : au plus un constat à la fois, et l'état
 * « deux constats ensemble » devient irreprésentable.
 *
 * PARTAGÉ avec la modification (`recipe-edit-slice`), comme l'écran l'est : c'est le même geste,
 * et les deux formulaires le nomment déjà du même mot. Le partage porte sur le VOCABULAIRE, pas
 * sur l'état — les deux statuts restent délibérément séparés.
 */
export type RecipeFormNotice = { tone: 'success' | 'error' | 'unconfirmed'; message: string };

export const RECIPE_SAVE_UNCONFIRMED =
  'Aucune connexion — l’enregistrement de la recette n’a pas pu être confirmé.';
export const RECIPE_SAVE_FAILED = 'Impossible d’enregistrer la recette.';

/**
 * Ce que le FORMULAIRE a à dire : sa saisie, et rien de plus. L'identifiant n'en fait pas
 * partie — il vient du brouillon ouvert, et c'est le thunk qui l'y joint. Un écran ne fabrique
 * pas d'identifiant.
 */
export type RecipeDraft = Omit<CreateRecipeInput, 'id'>;

/**
 * La recette écrite, ET l'identifiant que le formulaire SUIVANT visera. Le second voyage avec le
 * succès pour que le reducer — muté, contrairement au thunk — décide seul de le poser, et
 * seulement si le succès est encore d'actualité. Même forme que `ConviveAdded`, et pour la même
 * raison : l'ouverture du formulaire est le seul AUTRE point qui renouvelle l'identifiant, et
 * elle se retire devant une écriture en vol.
 */
export type RecipeCreated = { recipe: Recipe; nextDraftId: string };

const initialState: RecipeState = {
  status: 'idle',
  draftId: null,
  latestCreateRequestId: null,
};

/**
 * L'état d'un store RÉEL : il naît avec l'identifiant du premier formulaire à venir. Un reducer
 * ne peut appeler aucun port, et la naissance du store est le seul moment où l'on dispose à la
 * fois de ses dépendances et de son état de départ — exactement comme la date du menu.
 */
export function recipeInitialState(draftId: string): RecipeState {
  return { ...initialState, draftId };
}

/**
 * L'identifiant de brouillon d'un store réel, jamais nul là où on le lit (voir
 * `RecipeState.draftId`). Une seule affirmation, un seul endroit.
 */
function draftIdOf(state: RecipeState): string {
  return state.draftId as string;
}

export const createRecipe = createAsyncThunk<RecipeCreated, RecipeDraft, AppThunkApiConfig>(
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  // Les reducers matchent sur l’objet thunk, pas sur la chaîne — mutant équivalent.
  'recipe/createRecipe',
  async (draft, thunkApi) => {
    // OÙ écrire est une décision du slice, qui est muté ; le container, lui, ne l'est pas et ne
    // connaît aucun identifiant.
    const recipe = await thunkApi.extra.createRecipe({
      id: draftIdOf(thunkApi.getState().recipe),
      ...draft,
    });
    return { recipe, nextDraftId: thunkApi.extra.newRecipeId() };
  },
);

// Stryker disable next-line ObjectLiteral : vider la config de createSlice est un mutant
// équivalent — toute la logique de transition est couverte par ses propres tests.
const recipeSlice = createSlice({
  // Stryker disable next-line StringLiteral : nom de slice, boilerplate RTK — mutant équivalent.
  name: 'recipe',
  initialState,
  reducers: {
    /**
     * Le container SIGNALE qu'un formulaire s'ouvre ; c'est ici qu'on décide d'en tenir compte.
     * Un formulaire neuf, c'est un cycle au repos ET un identifiant neuf — le constat de la
     * visite précédente ne parle plus de rien, et la recette à venir n'est pas la précédente.
     *
     * SAUF si une écriture est en vol : un thunk RTK n'est pas annulé par le démontage du
     * formulaire. Remettre le statut à zéro déverrouillerait l'envoi d'une opération en cours,
     * et lui donner un identifiant neuf ferait du réenvoi le doublon qu'on vient précisément de
     * rendre impossible.
     */
    recipeFormOpened(state, action: PayloadAction<string>) {
      if (state.status === 'saving') return;
      state.status = 'idle';
      state.draftId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createRecipe.pending, (state, action) => {
        state.latestCreateRequestId = action.meta.requestId;
        state.status = 'saving';
      })
      .addCase(createRecipe.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestCreateRequestId) return;
        state.status = 'success';
        // Le formulaire suivant vise un AUTRE document. C'est ICI, et non à l'ouverture, que le
        // renouvellement a lieu quand l'écriture était encore en vol : `recipeFormOpened` se
        // retire dans ce cas, et rien ne le rattrapait — la recette suivante repartait sous
        // l'identifiant de la précédente, et `save` étant un `setDoc`, elle l'écrasait.
        state.draftId = action.payload.nextDraftId;
      })
      .addCase(createRecipe.rejected, (state, action) => {
        // Même garde de fraîcheur que `fulfilled`, et pour les mêmes deux raisons : un verdict
        // périmé n'affiche pas son constat sur un enregistrement qui, lui, a abouti, et ne
        // déverrouille pas l'envoi encore en vol qui l'a dépassé.
        if (action.meta.requestId !== state.latestCreateRequestId) return;
        // Non acquitté ≠ échoué : `action.error` est une copie plate (miniSerializeError), et le
        // garde du domaine est nominal précisément pour rester lisible ici.
        state.status = isRepositoryUnavailable(action.error) ? 'unconfirmed' : 'error';
      });
  },
});

// Action NON exportée : elle porte un identifiant que seul le domaine sait produire. L'exposer
// laisserait n'importe quel écran en inventer un.
const { recipeFormOpened } = recipeSlice.actions;

/**
 * L'ouverture du formulaire de création, seul moment où un identifiant neuf est posé. Un THUNK,
 * et non une action nue : le reducer ne peut pas appeler le domaine. Il ne fait que la lecture —
 * la décision d'en tenir compte, elle, reste dans le reducer, qui est muté.
 */
export function recipeFormScreenOpened(): AppThunk {
  return (dispatch, _getState, extra) => {
    dispatch(recipeFormOpened(extra.newRecipeId()));
  };
}

export const recipeReducer = recipeSlice.reducer;

export const selectRecipeCreation = (state: RootState): RecipeState => state.recipe;

/**
 * Projection PURE de l'état de tranche vers le constat affichable, ICI plutôt que dans un
 * container que la mutation ignore. Prend `RecipeState` et non `RootState` : ce n'est pas un
 * sélecteur à passer à `useAppSelector` — il construit un objet neuf à chaque appel.
 */
export function recipeCreateNoticeOf(state: RecipeState): RecipeFormNotice | null {
  if (state.status === 'success') return { tone: 'success', message: 'Recette enregistrée.' };
  if (state.status === 'unconfirmed') {
    return { tone: 'unconfirmed', message: RECIPE_SAVE_UNCONFIRMED };
  }
  if (state.status === 'error') return { tone: 'error', message: RECIPE_SAVE_FAILED };
  return null;
}

/**
 * Verrou de l'ENVOI : le temps de l'écriture, et rien de plus. Il empêche le double envoi d'un
 * geste dont on n'a pas encore le verdict ; dès qu'un verdict tombe — succès, refus, ou absence
 * de réponse — le bouton se réarme. Un enregistrement non acquitté ne verrouille RIEN : son
 * écriture est partie avec l'identifiant du formulaire, et un second envoi la réécrit au même
 * endroit. Les champs, eux, ne se verrouillent jamais.
 * Vit ici, et pas dans le container, pour que la mutation couvre la décision.
 */
export const selectIsCreationLocked = (state: RootState): boolean =>
  state.recipe.status === 'saving';
