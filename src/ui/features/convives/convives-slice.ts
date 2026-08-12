import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { compareConvivesByName, type Convive } from '../../../domain/entities/convive';
import { isRepositoryUnavailable } from '../../../domain/errors/repository-unavailable-error';
import { type AddConviveInput } from '../../../domain/use-cases/add-convive';
import { type AppThunkApiConfig, type RootState } from '../../store/store';

// `unavailable` : le dépôt n'a pas répondu. Ni un foyer vide, ni un échec de chargement —
// les trois appellent trois constats différents à l'écran.
export type ConvivesStatus = 'idle' | 'loading' | 'success' | 'error' | 'unavailable';

// Cycle de vie de l'ajout, distinct de `status` qui reste celui du chargement de la
// liste : un ajout en cours ne doit pas faire disparaître les convives déjà affichés.
// `unconfirmed` : le serveur n'a pas acquitté l'écriture dans la borne. Troisième issue,
// qui n'affirme ni que la donnée est sauvegardée ni qu'elle est perdue.
export type ConviveAddStatus = 'idle' | 'adding' | 'error' | 'unconfirmed';

export type ConvivesState = {
  status: ConvivesStatus;
  convives: Convive[];
  error: string | null;
  addStatus: ConviveAddStatus;
  addError: string | null;
  /**
   * Prénom que le cycle de vie de l'ajout concerne. Il vit dans le STORE et non dans le
   * `useState` du container : après un remontage pendant un ajout en vol, le container
   * repart avec un champ vide et le constat ne saurait plus de quel ajout il parle.
   * Champ plat plutôt qu'objet imbriqué : les trois `add*` forment un seul cycle de vie et
   * se remettent à zéro ensemble, exactement aux mêmes conditions.
   */
  addSubjectName: string | null;
};

const initialState: ConvivesState = {
  status: 'idle',
  convives: [],
  error: null,
  addStatus: 'idle',
  addError: null,
  addSubjectName: null,
};

export const loadConvives = createAsyncThunk<Convive[], void, AppThunkApiConfig>(
  'convives/loadConvives',
  async (_, thunkApi) => {
    return await thunkApi.extra.listConvives();
  },
);

export const addConvive = createAsyncThunk<Convive, AddConviveInput, AppThunkApiConfig>(
  'convives/addConvive',
  async (input, thunkApi) => {
    return await thunkApi.extra.addConvive(input);
  },
);

/**
 * Repos du cycle de vie de l'ajout. Les trois champs `add*` se remettent à zéro ENSEMBLE et
 * nulle part ailleurs : un prénom orphelin ferait parler un constat d'un ajout qui n'existe
 * plus, et un constat sans prénom ne saurait pas se nommer. Un seul point de remise à zéro
 * rend la divergence impossible entre `conviveNameEdited`, `loadConvives.pending` et
 * `addConvive.fulfilled`.
 */
function restAddLifecycle(state: ConvivesState): void {
  state.addStatus = 'idle';
  state.addError = null;
  state.addSubjectName = null;
}

const convivesSlice = createSlice({
  name: 'convives',
  initialState,
  reducers: {
    /**
     * DÉCLENCHEUR PRINCIPAL de remise à zéro du constat d'ajout. Une action de
     * l'utilisateur, donc indépendante de tout cycle de montage — contrairement à
     * `loadConvives.pending`, dont le remontage n'est pas garanti (voir plus bas).
     * Même condition que partout : une écriture en vol ne se déverrouille pas.
     */
    conviveNameEdited(state) {
      if (state.addStatus === 'adding') return;
      restAddLifecycle(state);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadConvives.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        // Filet SECONDAIRE, pas le mécanisme de récupération. Il couvre le seul cas que la
        // saisie ne couvre pas : l'écran est ré-entré et relit le monde sans que
        // l'utilisateur ne tape rien — sinon un constat périmé s'afficherait à côté d'une
        // liste fraîche, la contradiction même qu'on corrige.
        // Il ne GARANTIT rien : `AccountSheet` garde son panneau monté pendant les 200 ms de
        // sa transition de sortie, donc une réouverture rapide n'entraîne aucun remontage et
        // ce thunk n'est jamais rejoué (mesuré : 80 ms → non, 700 ms → oui). C'est
        // `conviveNameEdited` qui porte la garantie.
        // SAUF si une écriture est en vol : fermer puis rouvrir la sheet pendant les 5 s de
        // la borne passe par ici, et réarmer le bouton à cet instant rendrait un second
        // appui possible — donc un second id, donc le doublon.
        if (state.addStatus !== 'adding') restAddLifecycle(state);
      })
      .addCase(loadConvives.fulfilled, (state, action) => {
        state.status = 'success';
        state.convives = action.payload;
        state.error = null;
      })
      .addCase(loadConvives.rejected, (state, action) => {
        // `action.error` est une copie plate (miniSerializeError) : le garde du domaine est
        // nominal précisément pour rester lisible ici.
        if (isRepositoryUnavailable(action.error)) {
          state.status = 'unavailable';
          state.error = null;
          return;
        }
        state.status = 'error';
        state.error = action.error.message ?? null;
      })
      .addCase(addConvive.pending, (state, action) => {
        state.addStatus = 'adding';
        // Mémorisé dès le départ, et conservé sur `rejected` : c'est le seul moment où le
        // prénom soumis est disponible côté store.
        state.addSubjectName = action.meta.arg.name;
      })
      .addCase(addConvive.fulfilled, (state, action) => {
        // Le convive rejoint sa place alphabétique tout de suite : sans ce tri il
        // resterait en bas de liste jusqu'au prochain chargement, qui lui l'ordonne.
        // Même comparateur que le use-case — la règle appartient au domaine.
        state.convives.push(action.payload);
        state.convives.sort(compareConvivesByName);
        restAddLifecycle(state);
      })
      .addCase(addConvive.rejected, (state, action) => {
        // Non acquitté ≠ échoué : la liste n'accueille pas le convive (rien ne prouve qu'il
        // est enregistré) et aucun message d'erreur n'est armé.
        if (isRepositoryUnavailable(action.error)) {
          state.addStatus = 'unconfirmed';
          state.addError = null;
          return;
        }
        state.addStatus = 'error';
        state.addError = action.error.message ?? null;
      });
  },
});

export const { conviveNameEdited } = convivesSlice.actions;

export const convivesReducer = convivesSlice.reducer;

export const selectConvives = (state: RootState): ConvivesState => state.convives;

/**
 * Verrou du CHAMP de saisie — délibérément distinct du verrou du bouton.
 * Le bouton se verrouille aussi en `unconfirmed` ; le champ, NON : c'est la frappe qui
 * efface le constat (`conviveNameEdited`). Verrouiller le champ sur le même critère que le
 * bouton tuerait le mécanisme de récupération et figerait l'écran définitivement.
 * Vit ici, et pas dans le container, pour que la mutation couvre la distinction.
 */
export const selectIsAddInFlight = (state: RootState): boolean =>
  state.convives.addStatus === 'adding';
