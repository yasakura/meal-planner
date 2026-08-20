import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { type Recipe } from '../../../domain/entities/recipe';
import { isRepositoryUnavailable } from '../../../domain/errors/repository-unavailable-error';
import { type CreateRecipeInput } from '../../../domain/use-cases/create-recipe';
import { type AppThunkApiConfig, type RootState } from '../../store/store';

/**
 * `unconfirmed` : le dépôt n'a pas acquitté l'écriture dans la borne (`withAckDeadline`). Hors
 * ligne, `setDoc` ne rejette pas — il met l'écriture en FILE LOCALE et n'acquitte qu'au serveur,
 * donc elle atterrira au retour du réseau. Troisième issue, qui n'affirme ni que la recette est
 * enregistrée ni qu'elle est perdue. Même vocabulaire que les convives et le menu : les trois
 * cycles posent la même question à l'écran — est-ce fait, est-ce refusé, ou ne sait-on pas ?
 *
 * La distinction n'est pas cosmétique : annoncer l'échec d'une écriture en file fait ressaisir,
 * et `createRecipeUseCase` génère alors un SECOND cuid — deux documents pour une seule recette.
 */
export type RecipeCreationStatus = 'idle' | 'saving' | 'success' | 'error' | 'unconfirmed';

export type RecipeState = {
  status: RecipeCreationStatus;
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

const initialState: RecipeState = {
  status: 'idle',
};

export const createRecipe = createAsyncThunk<Recipe, CreateRecipeInput, AppThunkApiConfig>(
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  // Les reducers matchent sur l’objet thunk, pas sur la chaîne — mutant équivalent.
  'recipe/createRecipe',
  async (input, thunkApi) => {
    return await thunkApi.extra.createRecipe(input);
  },
);

/**
 * Repos du cycle d'enregistrement. UN seul endroit, appelé par les deux gestes qui tournent la
 * page — l'ouverture du formulaire et la saisie —, pour que les deux ne puissent pas diverger.
 * Un enregistrement en vol n'est PAS annulé par le démontage du formulaire ni par une frappe :
 * le remettre à zéro déverrouillerait une opération encore en cours, donc un second cuid.
 *
 * Le garde est EMBARQUÉ ici, et aucun appelant n'en porte — l'inverse de l'homonyme
 * `restSaveLifecycle` (`menu-slice.ts`), inconditionnelle, dont le garde vit chez ses appelants.
 */
function restCreationLifecycle(state: RecipeState): void {
  if (state.status === 'saving') return;
  state.status = 'idle';
}

// Stryker disable next-line ObjectLiteral : vider la config de createSlice est un mutant
// équivalent — toute la logique de transition est couverte par ses propres tests.
const recipeSlice = createSlice({
  // Stryker disable next-line StringLiteral : nom de slice, boilerplate RTK — mutant équivalent.
  name: 'recipe',
  initialState,
  reducers: {
    // Le container SIGNALE qu'un formulaire s'ouvre ; c'est ici qu'on décide d'en tenir compte.
    recipeFormOpened(state) {
      restCreationLifecycle(state);
    },
    /**
     * DÉCLENCHEUR PRINCIPAL de remise à zéro du constat, repris des convives : c'est la SAISIE
     * qui efface le constat non acquitté et lève le verrou de l'envoi. Un geste de
     * l'utilisateur, donc indépendant de tout cycle de montage — quitter le formulaire pour le
     * rouvrir abandonnerait tout ce qui y a été tapé.
     */
    recipeFormEdited(state) {
      restCreationLifecycle(state);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createRecipe.pending, (state) => {
        state.status = 'saving';
      })
      .addCase(createRecipe.fulfilled, (state) => {
        state.status = 'success';
      })
      .addCase(createRecipe.rejected, (state, action) => {
        // Non acquitté ≠ échoué : `action.error` est une copie plate (miniSerializeError), et le
        // garde du domaine est nominal précisément pour rester lisible ici.
        state.status = isRepositoryUnavailable(action.error) ? 'unconfirmed' : 'error';
      });
  },
});

export const { recipeFormOpened, recipeFormEdited } = recipeSlice.actions;

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
 * Verrou de l'ENVOI — délibérément distinct des champs, qui ne se verrouillent jamais.
 * Il tient pendant l'écriture ET tant qu'elle n'est pas acquittée : dans les deux cas l'écriture
 * est partie, et un second appui produirait un second cuid, donc un doublon. Les CHAMPS, eux,
 * restent éditables : c'est la frappe qui efface le constat (`recipeFormEdited`), et les
 * verrouiller sur le même critère figerait l'écran définitivement.
 * Vit ici, et pas dans le container, pour que la mutation couvre la distinction.
 */
export const selectIsCreationLocked = (state: RootState): boolean =>
  state.recipe.status === 'saving' || state.recipe.status === 'unconfirmed';
