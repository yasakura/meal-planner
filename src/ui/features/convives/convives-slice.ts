import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { compareConvivesByName, type Convive } from '../../../domain/entities/convive';
import { isRepositoryUnavailable } from '../../../domain/errors/repository-unavailable-error';
import { type AddConviveInput } from '../../../domain/use-cases/add-convive';
import { type RemoveConviveInput } from '../../../domain/use-cases/remove-convive';
import { type RenameConviveInput } from '../../../domain/use-cases/rename-convive';
import { type AppThunk, type AppThunkApiConfig, type RootState } from '../../store/store';
import { elidedDe } from './french-elision';

// `unavailable` : le dépôt n'a pas répondu. Ni un foyer vide, ni un échec de chargement —
// les trois appellent trois constats différents à l'écran.
export type ConvivesStatus = 'idle' | 'loading' | 'success' | 'error' | 'unavailable';

// Cycle de vie de l'ajout, distinct de `status` qui reste celui du chargement de la
// liste : un ajout en cours ne doit pas faire disparaître les convives déjà affichés.
// `unconfirmed` : le serveur n'a pas acquitté l'écriture dans la borne. Troisième issue,
// qui n'affirme ni que la donnée est sauvegardée ni qu'elle est perdue.
export type ConviveAddStatus = 'idle' | 'adding' | 'error' | 'unconfirmed';

// Mêmes issues que l'ajout, sur les deux autres écritures. Le vocabulaire est délibérément
// identique : les trois cycles de vie posent la même question à l'écran — est-ce fait, est-ce
// refusé, ou ne sait-on pas ?
export type ConviveRenameStatus = 'idle' | 'renaming' | 'error' | 'unconfirmed';
export type ConviveRemoveStatus = 'idle' | 'removing' | 'error' | 'unconfirmed';

export type RowNotice = { tone: 'error' | 'unconfirmed'; message: string };

/**
 * Ligne de foyer prête à afficher. TOUTES les décisions de ligne (mode d'affichage, constat,
 * verrous) sont calculées ici, dans un `.ts` que la mutation couvre — et non dans le
 * container, que Stryker ne mute pas. Le container n'a plus qu'à passer le plat.
 */
export type ConviveRow = {
  id: string;
  name: string;
  mode: 'idle' | 'editing' | 'confirming-removal';
  notice: RowNotice | null;
  /**
   * Verrou des actions d'une ligne AU REPOS pendant qu'une AUTRE porte une écriture en vol.
   *
   * Une seule raison, et elle dure le temps de l'écriture : `conviveEditRequested` et
   * `conviveRemovalRequested` refusent de déplacer un cycle en vol, donc laisser ces boutons
   * actionnables donnerait des clics sans effet. Un constat, lui, ne verrouille plus rien —
   * retenir l'utilisateur sur sa ligne pour qu'il le lise était une chorégraphie de reprise.
   */
  actionsDisabled: boolean;
  saveDisabled: boolean;
  editInputDisabled: boolean;
  confirmDisabled: boolean;
};

export type ConvivesState = {
  status: ConvivesStatus;
  convives: Convive[];
  error: string | null;
  /**
   * requestId du DERNIER chargement lancé. Plomberie de dispatch : aucun écran ne le lit.
   *
   * Un thunk RTK n'est PAS annulé par le démontage de son container — la sheet le démontre
   * chaque fois qu'elle se ferme. Fermer pendant un chargement lent puis rouvrir en relance
   * un second : sans cette mémoire, le rejet tardif du premier écrase le foyer qui vient de
   * s'afficher, et l'affiche « Aucune connexion » sans bouton pour en sortir.
   *
   * Volontairement PAS remis à null au règlement : le champ signifie « dernière requête
   * lancée », pas « requête en vol ». Le remettre à null rouvrirait le trou — une réponse
   * tardive arrivant après le règlement du chargement courant ne correspondrait plus à rien
   * et serait acceptée.
   *
   * SÉPARÉ de `latestAddRequestId` : les deux thunks ont des cycles de vie indépendants. Une
   * mémoire unique ferait qu'un rechargement invaliderait l'ajout en vol (l'écriture partie
   * n'apparaîtrait jamais dans la liste) et réciproquement.
   */
  latestLoadRequestId: string | null;
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
  /**
   * L'identifiant du document que la saisie EN COURS écrira. Posé à l'ouverture du formulaire et
   * conservé jusqu'à la suivante : deux envois de la même saisie visent le même document, deux
   * saisies successives en visent deux — sans quoi le second convive écraserait le premier.
   *
   * Propre à l'AJOUT, qui crée un document. Le renommage et le retrait reçoivent un identifiant
   * qui existe déjà et n'ont rien à mémoriser.
   *
   * `| null` comme la date de début du menu, et pour la même raison : `initialState` est
   * statique et ne peut appeler aucun port. C'est `convivesInitialState`, appelée à la naissance
   * du store, qui le pose — seul un appel NU au reducer peut voir le null.
   */
  draftConviveId: string | null;
  /**
   * requestId du DERNIER ajout lancé. Même rôle que `latestLoadRequestId`, sur l'autre cycle
   * de vie. Enjeu propre à l'ajout : un rejet tardif afficherait « aucune connexion » sur un
   * ajout qui, lui, vient d'aboutir.
   *
   * N'est PAS remis à zéro par `restAddLifecycle` : ce n'est pas un constat destiné à
   * l'utilisateur, c'est un aiguillage. Le mêler au cycle du constat le rendrait
   * réinitialisable par un geste sans aucun rapport avec la fraîcheur d'une réponse en vol.
   */
  latestAddRequestId: string | null;
  renameStatus: ConviveRenameStatus;
  /**
   * Texte en cours de saisie dans la ligne éditée. Vit ICI et non dans le `useState` du
   * container, parce qu'un container se démonte et que le store, lui, est un singleton de
   * session : quand la sheet se referme pendant une écriture en vol, l'édition reste ouverte
   * (on ne déverrouille pas une écriture partie) et le brouillon doit rester avec elle.
   * Sinon la ligne se réaffiche en édition avec un champ vide et désactivé — un formulaire
   * mort, sans le moindre indice que la saisie est toujours en vol.
   * Corollaire : la décision « avec quoi pré-remplir » tombe sous la mutation.
   */
  renameDraft: string;
  /**
   * Convive dont la ligne est ouverte en édition. Vit dans le STORE et non dans le `useState`
   * du container pour deux raisons : c'est une DÉCISION (quand l'édition s'ouvre, quand elle
   * se referme), donc elle doit tomber sous la mutation ; et elle doit se remettre à zéro au
   * même endroit que le constat qu'elle porte, sinon une ligne resterait ouverte en édition
   * avec un constat effacé, ou l'inverse.
   * Survit au rejet : la ligne reste ouverte pour que l'utilisateur puisse corriger.
   */
  editingConviveId: string | null;
  /** Même rôle que `latestAddRequestId`, sur le cycle du renommage. */
  latestRenameRequestId: string | null;
  removeStatus: ConviveRemoveStatus;
  /**
   * Convive dont le retrait attend confirmation. La suppression est DÉFINITIVE et sans undo :
   * aucun tap unique ne doit effacer une personne.
   */
  pendingRemovalId: string | null;
  /** Même rôle que `latestAddRequestId`, sur le cycle du retrait. */
  latestRemoveRequestId: string | null;
};

const initialState: ConvivesState = {
  status: 'idle',
  convives: [],
  error: null,
  latestLoadRequestId: null,
  addStatus: 'idle',
  addError: null,
  addSubjectName: null,
  draftConviveId: null,
  latestAddRequestId: null,
  renameStatus: 'idle',
  renameDraft: '',
  editingConviveId: null,
  latestRenameRequestId: null,
  removeStatus: 'idle',
  pendingRemovalId: null,
  latestRemoveRequestId: null,
};

/**
 * L'état d'un store RÉEL : il naît avec l'identifiant du premier formulaire d'ajout à venir. Un
 * reducer ne peut appeler aucun port, et la naissance du store est le seul moment où l'on dispose
 * à la fois de ses dépendances et de son état de départ — exactement comme la date du menu.
 */
export function convivesInitialState(draftConviveId: string): ConvivesState {
  return { ...initialState, draftConviveId };
}

/**
 * L'identifiant de brouillon d'un store réel, jamais nul là où on le lit (voir
 * `ConvivesState.draftConviveId`). Une seule affirmation, un seul endroit.
 */
function draftIdOf(state: ConvivesState): string {
  return state.draftConviveId as string;
}

export const loadConvives = createAsyncThunk<Convive[], void, AppThunkApiConfig>(
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  // Les reducers matchent sur l’objet thunk, pas sur la chaîne — mutant équivalent.
  'convives/loadConvives',
  async (_, thunkApi) => {
    return await thunkApi.extra.listConvives();
  },
);

/**
 * Ce que le FORMULAIRE a à dire : sa saisie, et rien de plus. L'identifiant n'en fait pas
 * partie — il vient du brouillon ouvert, et c'est le thunk qui l'y joint. Un écran ne fabrique
 * pas d'identifiant.
 */
export type ConviveDraft = Omit<AddConviveInput, 'id'>;

/**
 * Le convive écrit, ET l'identifiant que la saisie SUIVANTE visera. Le second voyage avec le
 * succès pour que le reducer — muté, contrairement au thunk — décide seul de le poser, et
 * seulement si le succès est encore d'actualité.
 */
export type ConviveAdded = { convive: Convive; nextDraftId: string };

export const addConvive = createAsyncThunk<ConviveAdded, ConviveDraft, AppThunkApiConfig>(
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  // Les reducers matchent sur l’objet thunk, pas sur la chaîne — mutant équivalent.
  'convives/addConvive',
  async (draft, thunkApi) => {
    // OÙ écrire est une décision du slice, qui est muté ; le container, lui, ne l'est pas et ne
    // connaît aucun identifiant.
    const convive = await thunkApi.extra.addConvive({
      id: draftIdOf(thunkApi.getState().convives),
      ...draft,
    });
    return { convive, nextDraftId: thunkApi.extra.newConviveId() };
  },
);

export const renameConvive = createAsyncThunk<Convive, RenameConviveInput, AppThunkApiConfig>(
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  // Les reducers matchent sur l’objet thunk, pas sur la chaîne — mutant équivalent.
  'convives/renameConvive',
  async (input, thunkApi) => {
    return await thunkApi.extra.renameConvive(input);
  },
);

export const removeConvive = createAsyncThunk<void, RemoveConviveInput, AppThunkApiConfig>(
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  // Les reducers matchent sur l’objet thunk, pas sur la chaîne — mutant équivalent.
  'convives/removeConvive',
  async (input, thunkApi) => {
    await thunkApi.extra.removeConvive(input);
  },
);

/**
 * Repos du cycle de vie de l'ajout. Les trois champs `add*` se remettent à zéro ENSEMBLE et
 * nulle part ailleurs : un prénom orphelin ferait parler un constat d'un ajout qui n'existe
 * plus, et un constat sans prénom ne saurait pas se nommer. Un seul point de remise à zéro
 * rend la divergence impossible entre `loadConvives.pending` et `addConvive.fulfilled`.
 */
function restAddLifecycle(state: ConvivesState): void {
  state.addStatus = 'idle';
  state.addError = null;
  state.addSubjectName = null;
}

/**
 * Repos du cycle de vie du renommage. Le statut ET la ligne ouverte se remettent à zéro
 * ENSEMBLE : une ligne ouverte sans constat perdrait le motif de sa réouverture, et un
 * constat sans ligne ouverte n'aurait nulle part où s'afficher.
 * Contrairement à l'ajout, aucun prénom n'est mémorisé — la ligne le porte déjà, et
 * `selectConviveRows` va le chercher là.
 */
function restRenameLifecycle(state: ConvivesState): void {
  state.renameStatus = 'idle';
  state.renameDraft = '';
  state.editingConviveId = null;
}

/** Symétrique, sur le cycle du retrait : le statut et la confirmation ouverte vont de pair. */
function restRemoveLifecycle(state: ConvivesState): void {
  state.removeStatus = 'idle';
  state.pendingRemovalId = null;
}

// Stryker disable next-line ObjectLiteral : vider la config de createSlice est un mutant
// équivalent — toute la logique de transition est couverte par ses propres tests.
const convivesSlice = createSlice({
  // Stryker disable next-line StringLiteral : nom de slice, boilerplate RTK — mutant équivalent.
  name: 'convives',
  initialState,
  reducers: {
    /**
     * Le container SIGNALE qu'un formulaire d'ajout s'ouvre ; c'est ici qu'on décide d'en tenir
     * compte. Un formulaire neuf, c'est un convive neuf — le container repart d'un champ vide,
     * et ce qui y sera tapé n'est pas ce que la visite précédente visait.
     *
     * SAUF si une écriture est en vol : un thunk RTK n'est pas annulé par le démontage de la
     * sheet. Lui donner un identifiant neuf ferait du réenvoi le doublon qu'on vient précisément
     * de rendre impossible.
     */
    conviveFormOpened(state, action: PayloadAction<string>) {
      if (state.addStatus === 'adding') return;
      state.draftConviveId = action.payload;
    },
    /**
     * Ouvre l'édition d'une ligne. Repart d'un constat propre : le précédent parlait d'un
     * renommage qui n'est plus celui qu'on entreprend.
     * Même garde que partout : une écriture en vol ne se laisse pas déplacer.
     */
    conviveEditRequested(state, action: PayloadAction<string>) {
      if (state.renameStatus === 'renaming') return;
      state.renameStatus = 'idle';
      state.editingConviveId = action.payload;
      // Pré-rempli avec le prénom affiché : corriger une faute de frappe est le cas courant.
      // Le store connaît la liste, il n'a besoin de personne pour le retrouver — c'est
      // exactement ce que le container faisait, et faisait diverger.
      state.renameDraft =
        state.convives.find((convive) => convive.id === action.payload)?.name ?? '';
    },
    conviveEditCancelled(state) {
      if (state.renameStatus === 'renaming') return;
      restRenameLifecycle(state);
    },
    /**
     * La saisie, et RIEN d'autre : elle ne chasse aucun constat et ne lève aucun verrou.
     * Le constat de renommage part avec le verdict suivant (`renameConvive.pending`), avec la
     * fermeture de l'édition, ou avec la réouverture de l'écran.
     */
    renameDraftEdited(state, action: PayloadAction<string>) {
      state.renameDraft = action.payload;
    },
    conviveRemovalRequested(state, action: PayloadAction<string>) {
      if (state.removeStatus === 'removing') return;
      state.removeStatus = 'idle';
      state.pendingRemovalId = action.payload;
    },
    conviveRemovalCancelled(state) {
      if (state.removeStatus === 'removing') return;
      restRemoveLifecycle(state);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadConvives.pending, (state, action) => {
        // Le dernier chargement lancé prend la main : c'est celui que l'utilisateur attend.
        state.latestLoadRequestId = action.meta.requestId;
        state.status = 'loading';
        state.error = null;
        // La RÉOUVERTURE de l'écran est l'un des deux déclencheurs qui chassent le constat,
        // l'autre étant le verdict suivant. Elle couvre le cas où l'écran est ré-entré et
        // relit le monde : sinon un constat périmé s'afficherait à côté d'une liste fraîche,
        // la contradiction même qu'on corrige.
        // Elle ne GARANTIT rien : `AccountSheet` garde son panneau monté pendant les 200 ms de
        // sa transition de sortie, donc une réouverture rapide n'entraîne aucun remontage et
        // ce thunk n'est jamais rejoué (mesuré : 80 ms → non, 700 ms → oui).
        // SAUF si une écriture est en vol : fermer puis rouvrir la sheet pendant les 5 s de
        // la borne passe par ici, et remettre le cycle à zéro à cet instant déverrouillerait
        // une opération qui n'est pas annulée par le démontage.
        if (state.addStatus !== 'adding') restAddLifecycle(state);
        // Même geste et même exception pour les deux autres cycles : ré-entrer dans l'écran
        // ne doit pas y retrouver une ligne ouverte en édition sur un brouillon vide (le
        // container repart avec un `useState` neuf), ni une confirmation de suppression
        // ouverte que personne n'a demandée.
        if (state.renameStatus !== 'renaming') restRenameLifecycle(state);
        if (state.removeStatus !== 'removing') restRemoveLifecycle(state);
      })
      .addCase(loadConvives.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestLoadRequestId) return;
        state.status = 'success';
        state.convives = action.payload;
        state.error = null;
      })
      .addCase(loadConvives.rejected, (state, action) => {
        // Un échec périmé ne dit rien de l'état courant : il est jeté avant tout examen.
        if (action.meta.requestId !== state.latestLoadRequestId) return;
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
        // Aiguillage propre à l'ajout, indépendant de `latestLoadRequestId` : un
        // rechargement concurrent ne doit pas invalider cette écriture.
        state.latestAddRequestId = action.meta.requestId;
        state.addStatus = 'adding';
        // Mémorisé dès le départ, et conservé sur `rejected` : c'est le seul moment où le
        // prénom soumis est disponible côté store.
        state.addSubjectName = action.meta.arg.name;
      })
      .addCase(addConvive.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestAddRequestId) return;
        // Le convive rejoint sa place alphabétique tout de suite : sans ce tri il
        // resterait en bas de liste jusqu'au prochain chargement, qui lui l'ordonne.
        // Même comparateur que le use-case — la règle appartient au domaine.
        state.convives.push(action.payload.convive);
        state.convives.sort(compareConvivesByName);
        // La saisie suivante vise un AUTRE document. Sous le garde de fraîcheur : un succès
        // dépassé ne tourne pas la page du formulaire courant.
        state.draftConviveId = action.payload.nextDraftId;
        restAddLifecycle(state);
      })
      .addCase(addConvive.rejected, (state, action) => {
        // Un échec périmé n'affiche pas son constat sur un ajout qui, lui, a abouti.
        if (action.meta.requestId !== state.latestAddRequestId) return;
        // Non acquitté ≠ échoué : la liste n'accueille pas le convive (rien ne prouve qu'il
        // est enregistré) et aucun message d'erreur n'est armé.
        if (isRepositoryUnavailable(action.error)) {
          state.addStatus = 'unconfirmed';
          state.addError = null;
          return;
        }
        state.addStatus = 'error';
        state.addError = action.error.message ?? null;
      })
      .addCase(renameConvive.pending, (state, action) => {
        state.latestRenameRequestId = action.meta.requestId;
        state.renameStatus = 'renaming';
      })
      .addCase(renameConvive.fulfilled, (state, action) => {
        // Un renommage n'est PAS monotone : appliquer un succès périmé écraserait une valeur
        // plus fraîche par une plus ancienne. Contrairement au retrait, la liste est donc
        // laissée intacte — le prochain chargement resynchronise depuis le serveur.
        if (action.meta.requestId !== state.latestRenameRequestId) return;
        // Remplacement par projection, sans branche : un convive disparu de la liste
        // entre-temps (supprimé par l'autre compte, puis rechargement) n'est simplement
        // remplacé nulle part — il n'a pas à ressusciter ici.
        state.convives = state.convives.map((convive) =>
          convive.id === action.payload.id ? action.payload : convive,
        );
        // Même comparateur que le use-case : renommer déplace le convive dans l'ordre du
        // foyer, sinon la liste cesse d'être triée jusqu'au prochain chargement.
        state.convives.sort(compareConvivesByName);
        restRenameLifecycle(state);
      })
      .addCase(renameConvive.rejected, (state, action) => {
        if (action.meta.requestId !== state.latestRenameRequestId) return;
        // Non acquitté ≠ refusé : la liste garde l'ancien prénom (rien ne prouve que le
        // nouveau est enregistré) et le constat n'arme aucune alerte.
        state.renameStatus = isRepositoryUnavailable(action.error) ? 'unconfirmed' : 'error';
      })
      .addCase(removeConvive.pending, (state, action) => {
        state.latestRemoveRequestId = action.meta.requestId;
        state.removeStatus = 'removing';
      })
      .addCase(removeConvive.fulfilled, (state, action) => {
        // Hors garde de fraîcheur, DÉLIBÉRÉMENT : un retrait est monotone — une fois effacé
        // du serveur, le convive ne redevient jamais présent. Ignorer un succès périmé
        // laisserait dans la liste quelqu'un qui n'existe plus, jusqu'au rechargement.
        state.convives = state.convives.filter((convive) => convive.id !== action.meta.arg.id);
        // Le CONSTAT, lui, appartient au retrait courant : un retrait périmé n'a pas à
        // refermer la confirmation ouverte pour un autre convive.
        if (action.meta.requestId !== state.latestRemoveRequestId) return;
        restRemoveLifecycle(state);
      })
      .addCase(removeConvive.rejected, (state, action) => {
        if (action.meta.requestId !== state.latestRemoveRequestId) return;
        state.removeStatus = isRepositoryUnavailable(action.error) ? 'unconfirmed' : 'error';
      });
  },
});

// Action NON exportée : elle porte un identifiant que seul le domaine sait produire. L'exposer
// laisserait n'importe quel écran en inventer un.
const { conviveFormOpened } = convivesSlice.actions;

/**
 * L'ouverture du formulaire d'ajout, seul moment où un identifiant neuf est posé sans qu'une
 * écriture ait abouti. Un THUNK, et non une action nue : le reducer ne peut pas appeler le
 * domaine. Il ne fait que la lecture — la décision d'en tenir compte, elle, reste dans le
 * reducer, qui est muté.
 */
export function conviveFormScreenOpened(): AppThunk {
  return (dispatch, _getState, extra) => {
    dispatch(conviveFormOpened(extra.newConviveId()));
  };
}

export const {
  conviveEditRequested,
  conviveEditCancelled,
  renameDraftEdited,
  conviveRemovalRequested,
  conviveRemovalCancelled,
} = convivesSlice.actions;

export const convivesReducer = convivesSlice.reducer;

export const selectConvives = (state: RootState): ConvivesState => state.convives;

/**
 * Verrou de l'ajout : le temps de l'écriture, et rien de plus. Il tient le champ — sans quoi
 * une saisie préparée pendant l'attente serait effacée sans un mot par le vidage de l'ajout qui
 * aboutit — et il tient le bouton, contre un second appui dont on n'a pas encore le verdict.
 * Un ajout non acquitté ne verrouille RIEN : son écriture est partie avec l'identifiant du
 * brouillon, et un second envoi la réécrit au même endroit.
 * Vit ici, et pas dans le container, pour que la mutation couvre la décision.
 */
export const selectIsAddInFlight = (state: RootState): boolean =>
  state.convives.addStatus === 'adding';

/**
 * Constat porté par UNE ligne. Le prénom est lu sur la ligne elle-même, jamais mémorisé au
 * moment de la soumission : c'est l'ANCIEN prénom qui doit être nommé — le renommage n'a
 * rien changé, et c'est celui que l'écran affiche encore.
 * Messages sobres, sans détail technique, et deux tons : `error` appelle une action de
 * l'utilisateur, `unconfirmed` ne lui demande rien (le ton choisit le rôle ARIA côté rendu).
 */
function rowNotice(state: ConvivesState, convive: Convive): RowNotice | null {
  if (state.editingConviveId === convive.id) {
    if (state.renameStatus === 'error') {
      return { tone: 'error', message: 'Impossible de renommer le convive.' };
    }
    if (state.renameStatus === 'unconfirmed') {
      return {
        tone: 'unconfirmed',
        message: `Aucune connexion — le renommage ${elidedDe(convive.name)} n’a pas pu être confirmé.`,
      };
    }
  }
  if (state.pendingRemovalId === convive.id) {
    if (state.removeStatus === 'error') {
      return { tone: 'error', message: 'Impossible de retirer le convive.' };
    }
    if (state.removeStatus === 'unconfirmed') {
      return {
        tone: 'unconfirmed',
        message: `Aucune connexion — le retrait ${elidedDe(convive.name)} n’a pas pu être confirmé.`,
      };
    }
  }
  return null;
}

/**
 * Projection PURE de l'état de tranche vers les lignes affichables. Prend `ConvivesState` et
 * non `RootState` : ce n'est pas un sélecteur à passer à `useAppSelector` — il construit un
 * tableau neuf à chaque appel, et react-redux re-rendrait en boucle. Le container l'appelle
 * dans un `useMemo`, sur la référence stable de la tranche.
 */
export function conviveRowsOf(convives: ConvivesState): ConviveRow[] {
  // Le verrou des AUTRES lignes tient le temps de l'écriture, et rien de plus. Il couvre le
  // seul défaut qui subsiste : pendant une écriture en vol, `conviveEditRequested` et
  // `conviveRemovalRequested` refusent de se déplacer, donc un bouton actionnable ne ferait
  // rien — un écran qui ment. Un constat, lui, ne retient plus personne : le lire est un
  // droit, pas un péage.
  const writeInFlight =
    convives.renameStatus === 'renaming' || convives.removeStatus === 'removing';
  return convives.convives.map((convive) => {
    const editing = convives.editingConviveId === convive.id;
    const confirmingRemoval = convives.pendingRemovalId === convive.id;
    const draft = convives.renameDraft.trim();
    return {
      id: convive.id,
      name: convive.name,
      mode: editing ? 'editing' : confirmingRemoval ? 'confirming-removal' : 'idle',
      notice: rowNotice(convives, convive),
      actionsDisabled: !editing && !confirmingRemoval && writeInFlight,
      // Verrouillé sur le prénom actuel : renommer « Lionel » en « Lionel » n'est pas un
      // renommage. L'écriture partirait pour rien et, hors ligne, produirait un constat
      // d'échec pour une opération qui ne changeait rien. Trimé comme le fait le domaine ;
      // la casse, elle, est un vrai changement.
      // Le temps de l'écriture, et rien de plus : un renommage non acquitté ne verrouille RIEN.
      // Il vise un identifiant qui EXISTE déjà — un second envoi est le même upsert, il ne peut
      // rien dupliquer.
      saveDisabled:
        !editing || draft === '' || draft === convive.name || convives.renameStatus === 'renaming',
      // Le CHAMP se verrouille exactement comme le bouton : le temps de l'écriture.
      editInputDisabled: editing && convives.renameStatus === 'renaming',
      confirmDisabled: confirmingRemoval && convives.removeStatus === 'removing',
    };
  });
}
