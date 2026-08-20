import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import {
  isBefore,
  parseIsoDate,
  toIsoDate,
  type CalendarDate,
} from '../../../domain/entities/calendar-date';
import { type Menu } from '../../../domain/entities/menu';
import { isRepositoryUnavailable } from '../../../domain/errors/repository-unavailable-error';
import { type Recipe } from '../../../domain/entities/recipe';
import { type AppThunk, type AppThunkApiConfig, type RootState } from '../../store/store';

export type MenuStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Cycle de vie de l'ENREGISTREMENT, distinct de `status` qui reste celui de la génération : un
 * enregistrement en cours ne doit pas faire disparaître le menu affiché.
 *
 * Même vocabulaire que les écritures du foyer (`ConviveAddStatus`) : `error` = le dépôt a refusé,
 * `unconfirmed` = il n'a pas répondu dans la borne — l'écriture est partie, rien ne dit qu'elle
 * est perdue. `saved` s'y ajoute parce qu'ici le succès n'a rien d'autre pour se voir : le menu à
 * l'écran est le même avant et après.
 */
export type MenuSaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'unconfirmed';

export type MenuState = {
  status: MenuStatus;
  menu: Menu | null;
  recipes: Recipe[] | null;
  error: string | null;
  // Fenêtre demandée par l'utilisateur. C'est une PRÉFÉRENCE, pas un état transitoire : elle
  // vit dans le store — comme le menu généré — pour que les deux ne puissent pas diverger au
  // gré des montages du container (issue #28). Aucune transition ne la remet à zéro.
  selectedDays: number;
  /**
   * Jour de début du menu, CHOISI par l'utilisateur. Préférence de même nature et de même durée
   * de vie que `selectedDays` : aucune transition ne la remet à zéro, et la fenêtre du menu se
   * lit « une date de début + une durée ». Le prochain lundi n'en est que la valeur par DÉFAUT.
   *
   * Le `| null` n'est PAS un état de l'application : `initialState` doit bien porter une valeur
   * statique, et aucune date ne peut être écrite en dur là. C'est `menuInitialState`, appelée à
   * la naissance du store avec le prochain lundi, qui la pose — tout store réel naît donc avec
   * sa date. Seul un appel NU au reducer (`menuReducer(undefined, …)`) peut voir le null.
   */
  startDate: CalendarDate | null;
  /**
   * Plancher du choix : AUJOURD'HUI, tel que la dernière lecture de l'horloge l'a vu. Un menu ne
   * peut pas démarrer dans le passé — la rétention glissante de deux mois est ancrée sur
   * aujourd'hui, donc un menu parti d'il y a trois mois serait enregistré puis purgé dans la
   * foulée, un succès qui ne conserve rien.
   *
   * Ne sert QUE l'affordance du champ natif (`min`) : le refus, lui, ne s'appuie jamais sur cette
   * valeur mémorisée, il relit l'horloge au moment de décider. Un plancher stocké peut dater
   * d'avant minuit ; une décision, jamais.
   *
   * Même `| null` que `startDate`, et pour la même raison : `initialState` est statique.
   */
  startDateFloor: CalendarDate | null;
  /**
   * Constat TRANSITOIRE : la dernière date proposée était derrière le plancher, elle n'a pas été
   * retenue. Sans lui, l'écran se contredirait — le champ natif garderait sous les yeux la date
   * saisie pendant que le store en conserve une autre, faute de rendu déclenché par un état qui
   * n'aurait pas bougé.
   *
   * Trois remises à zéro, une par façon de tourner la page : un choix RECEVABLE (la saisie est
   * corrigée), l'ARRIVÉE sur l'écran (le constat d'une visite précédente n'accuse plus rien) et
   * le DÉPART d'une génération (l'écran de chargement retire le champ ; le retrouver surmonté
   * d'un constat sur une saisie abandonnée ferait douter du menu qui vient d'être produit).
   */
  startDateRefused: boolean;
  /**
   * requestId de la DERNIÈRE lecture de recettes lancée. Plomberie de dispatch : aucun écran ne
   * le lit.
   *
   * Le `condition` de `refreshMenuRecipes` filtre le DÉPART d'une relecture, pas son ARRIVÉE :
   * un thunk RTK n'est pas annulé par le démontage de son container, donc deux lectures
   * peuvent être en vol et se régler dans le désordre. Sans cette mémoire, la réponse tardive
   * de la première écrase un catalogue à jour et fait revenir un titre périmé à l'écran —
   * exactement le défaut que la relecture venait de fermer.
   *
   * Une SEULE mémoire pour les DEUX producteurs de `recipes`, parce qu'ils écrivent le même
   * champ : une régénération doit invalider une relecture en vol, sinon le catalogue périmé
   * revient par-dessus celui que la régénération vient de poser, et les créneaux des recettes
   * créées entre-temps retombent sur « Recette inconnue » sur un menu qui vient de réussir.
   *
   * Volontairement PAS remis à null au règlement : le champ signifie « dernière lecture
   * lancée », pas « lecture en vol ». Le garde compare par `!==`, donc un champ à null ne
   * laisse passer AUCUNE réponse — il les rejette toutes, il n'en « accepte » pas. C'est de le
   * garder renseigné qui rend la comparaison discriminante : la réponse de la dernière lecture
   * lancée passe, toutes les autres sont jetées, quel que soit leur ordre d'arrivée.
   *
   * DÉPENDANCE IMPLICITE, à ne pas casser sans rouvrir la course fermée par la PR #42.
   * `generateMenu.fulfilled` n'est délibérément PAS gardé par cette mémoire : deux générations
   * qui se chevaucheraient se courraient après. Ce non-garde n'est sûr QUE parce que ce
   * chevauchement est inatteignable depuis l'interface, et il l'est par une seule ligne —
   * `state.menu = null` dans `generateMenu.pending`, quelques lignes plus bas. Elle produit
   * deux effets dont dépend toute la sûreté de l'ensemble :
   *
   * 1. le `condition` de `refreshMenuRecipes` (`getState().menu.menu !== null`) bloque, donc
   *    aucune relecture ne part pendant une génération, `useEffect` de remontage compris ;
   * 2. `MenuContainer` rend `{ status: 'loading' }`, donc ni « Générer », ni « Régénérer », ni
   *    « Réessayer » n'existent à l'écran — aucune seconde génération ne peut être lancée.
   *
   * Retirer ce blanchiment (évolution d'ergonomie parfaitement plausible : garder le menu
   * affiché pendant une régénération) fait de `generateMenu.fulfilled` un écrivain concurrent
   * non gardé, et AUCUN test ne le signalerait. Qui le retire doit, dans la même passe, garder
   * `generateMenu.fulfilled` par cette mémoire.
   */
  latestRecipesRequestId: string | null;
  /**
   * Constat TRANSITOIRE de l'enregistrement, et verrou du bouton pendant l'écriture. Il parle DU
   * MENU AFFICHÉ : dès que ce menu n'est plus celui-là, il n'a plus rien à dire.
   *
   * Deux remises à zéro, une par façon pour le constat de cesser de dire vrai :
   * — le DÉPART d'une génération, qui efface le menu affiché ; garder le constat ferait dire
   *   « Menu enregistré » au-dessus d'un menu que personne n'a jamais enregistré ;
   * — l'ARRIVÉE sur l'écran, parce qu'un constat acquitte un GESTE : celui d'une visite
   *   précédente n'acquitte plus rien, et hors ligne il accuserait un réseau peut-être revenu.
   *   Celle-ci, et elle seule, est CONDITIONNELLE : voir `menuOpened`.
   *
   * Ce champ ne fait PAS office d'aiguillage des verdicts : `saving` ne dit pas DE QUELLE
   * écriture on l'attend, et deux écritures peuvent être en vol — « Régénérer » n'est jamais
   * verrouillé. C'est `latestSaveRequestId` qui reconnaît le verdict attendu.
   */
  saveStatus: MenuSaveStatus;
  /**
   * requestId de la dernière écriture lancée DEPUIS LA DERNIÈRE REMISE AU REPOS.
   * Plomberie de dispatch : aucun écran ne le lit.
   *
   * Même raison d'être que `latestRecipesRequestId` — un thunk RTK n'est pas annulé — mais un
   * chemin de plus pour y arriver : enregistrer, régénérer (ce qui DÉSAVOUE l'écriture en vol
   * sans l'annuler), puis enregistrer le nouveau menu met deux écritures en l'air, à la souris.
   * Le verdict de la première se ferait alors passer pour celui de la seconde : « Menu
   * enregistré » sous un menu que personne n'a fini d'enregistrer, puis l'échec réel de la
   * seconde jeté parce que le cycle serait déjà retombé.
   *
   * Remis à `null` par `restSaveLifecycle`, et par lui SEUL — contrairement à son voisin des
   * recettes, qui n'est jamais remis à zéro. Après un verdict reconnu il garde donc son id
   * alors que plus rien n'est en vol : ce n'est PAS un prédicat « une écriture est en vol »,
   * et `latestSaveRequestId !== null` ne remplace pas le `saveStatus === 'saving'` qui garde
   * `menuOpened`. Le nullage sert au désaveu : après lui, aucun verdict ne correspond plus à
   * aucun id, donc tout ce qui revient d'une écriture désavouée est jeté.
   */
  latestSaveRequestId: string | null;
};

// Fenêtre par défaut : 2 semaines (14 jours).
const DEFAULT_DAYS = 14;

const initialState: MenuState = {
  status: 'idle',
  menu: null,
  recipes: null,
  error: null,
  selectedDays: DEFAULT_DAYS,
  startDate: null,
  startDateFloor: null,
  startDateRefused: false,
  latestRecipesRequestId: null,
  saveStatus: 'idle',
  latestSaveRequestId: null,
};

/**
 * État d'un store NEUF : le prochain lundi comme date de début, aujourd'hui comme plancher.
 *
 * La DATE DE DÉBUT est lue UNE fois par session, ici, et jamais au montage d'un écran : le port
 * `Clock` ne promet rien entre deux lectures — son double avance d'un jour à chaque appel — donc
 * une date par défaut relue à chaque arrivée sur /menu changerait de semaine au fil des
 * allers-retours, sans que l'utilisateur ait rien touché. Une lecture unique n'a pas besoin
 * d'être gardée : il n'y a pas de seconde lecture à empêcher.
 *
 * Le PLANCHER, lui, se relit — il dit « aujourd'hui », pas « le jour où la session a commencé ».
 * Cette lecture-ci ne fait que lui donner une valeur avant le premier rendu.
 */
export function menuInitialState(startDate: CalendarDate, today: CalendarDate): MenuState {
  return { ...initialState, startDate, startDateFloor: today };
}

/**
 * La date de début d'un store réel, jamais nulle (voir `MenuState.startDate`). Un seul endroit
 * porte cette affirmation, pour qu'il n'y en ait pas trois à réviser le jour où elle change.
 */
function startDateOf(state: MenuState): CalendarDate {
  return state.startDate as CalendarDate;
}

/**
 * Le menu AFFICHÉ, jamais nul là où on le lit : le `condition` de `saveMenu` refuse de partir
 * sans lui. Même forme que `startDateOf` — une seule affirmation, un seul endroit.
 */
function displayedMenuOf(state: MenuState): Menu {
  return state.menu as Menu;
}

/** Le plancher d'un store réel, jamais nul non plus (voir `MenuState.startDateFloor`). */
function startDateFloorOf(state: MenuState): CalendarDate {
  return state.startDateFloor as CalendarDate;
}

/** Une saisie qui ne désigne aucun jour n'est pas une date refusée : c'est l'absence de date. */
function choisiOuRien(iso: string): CalendarDate | null {
  try {
    return parseIsoDate(iso);
  } catch {
    return null;
  }
}

// Discriminant d'erreur métier : catalogue vide → pas de menu possible.
export const NO_RECIPES = 'no-recipes';

export const generateMenu = createAsyncThunk<
  { menu: Menu; recipes: Recipe[] },
  number,
  AppThunkApiConfig & { rejectValue: string }
>(
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  // Les reducers matchent sur l’objet thunk, pas sur la chaîne — mutant équivalent.
  'menu/generateMenu',
  async (days, thunkApi) => {
    // On récupère d'abord les recettes : elles servent à résoudre les titres ET à
    // distinguer explicitement le cas « catalogue vide » (message actionnable).
    const recipes = await thunkApi.extra.listRecipes();
    if (recipes.length === 0) {
      return thunkApi.rejectWithValue(NO_RECIPES);
    }
    // La date de début est LUE, pas déduite : c'est la préférence de l'utilisateur, prochain
    // lundi par défaut. La génération ne consulte plus l'horloge — deux générations d'affilée
    // partent du même jour tant que personne n'a touché au champ.
    const dateDebut = startDateOf(thunkApi.getState().menu);
    const menu = await thunkApi.extra.generateMenu({ days, dateDebut });
    return { menu, recipes };
  },
);

/**
 * Relecture du catalogue pour un menu DÉJÀ affiché. Le menu résout ses titres depuis les recettes
 * stockées à la génération : sans cette relecture, un titre modifié ailleurs y reste périmé
 * jusqu'à la prochaine génération.
 *
 * Le menu lui-même n'est pas retouché — mêmes repas, mêmes jours, seuls les noms changent.
 */
export const refreshMenuRecipes = createAsyncThunk<Recipe[], void, AppThunkApiConfig>(
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  'menu/refreshMenuRecipes',
  async (_arg, thunkApi) => thunkApi.extra.listRecipes(),
  {
    // Pas de menu affiché : il n'y a rien à rafraîchir, et aucune lecture ne part.
    condition: (_arg, { getState }) => getState().menu.menu !== null,
  },
);

/**
 * Enregistre le MENU AFFICHÉ. Aucun argument : le menu à enregistrer est celui que l'utilisateur
 * a sous les yeux, et le store le connaît déjà — le faire descendre par le container reviendrait
 * à laisser un fichier non muté choisir quel menu part au dépôt.
 *
 * La rétention (fenêtre glissante de deux mois) appartient au use-case, pas à ce thunk : le slice
 * demande « enregistre », le domaine décide de tout le reste.
 */
export const saveMenu = createAsyncThunk<void, void, AppThunkApiConfig>(
  // Stryker disable next-line StringLiteral : préfixe de type d'action, boilerplate RTK.
  'menu/saveMenu',
  async (_arg, thunkApi) => {
    await thunkApi.extra.saveMenu({ menu: displayedMenuOf(thunkApi.getState().menu) });
  },
  {
    // Pas de menu affiché : il n'y a rien à enregistrer, et aucune écriture ne part.
    condition: (_arg, { getState }) => getState().menu.menu !== null,
  },
);

/**
 * Repos du cycle d'enregistrement : plus rien à constater, le bouton se réarme, et plus aucun
 * verdict n'est attendu. UN seul endroit pour les deux remises à zéro — deux affectations
 * distinctes pourraient diverger.
 *
 * INCONDITIONNELLE : le garde vit chez l'APPELANT, et diffère de l'un à l'autre — `menuOpened`
 * en a un (`saveStatus !== 'saving'`), `generateMenu.pending` n'en a délibérément pas. Un
 * nouvel appelant doit donc décider du sien. À ne pas lire par analogie avec l'homonyme
 * `restCreationLifecycle` (`recipe-slice.ts`), qui EMBARQUE le sien.
 */
function restSaveLifecycle(state: MenuState): void {
  state.saveStatus = 'idle';
  state.latestSaveRequestId = null;
}

// Stryker disable next-line ObjectLiteral : vider la config de createSlice est un mutant
// équivalent — toute la logique de transition est couverte par ses propres tests.
const menuSlice = createSlice({
  // Stryker disable next-line StringLiteral : nom de slice, boilerplate RTK — mutant équivalent.
  name: 'menu',
  initialState,
  reducers: {
    menuWindowSelected(state, action: PayloadAction<number>) {
      state.selectedDays = action.payload;
    },
    /**
     * Le champ natif n'échange que des chaînes `AAAA-MM-JJ`, et rend la chaîne VIDE quand
     * l'utilisateur l'efface. Une chaîne qui ne désigne aucun jour ne remplace donc rien : la
     * préférence précédente reste, et le store ne part pas en exception au milieu d'un reducer.
     * La décision est ici, dans le slice qui est muté, et non dans le container qui ne l'est pas.
     *
     * `today` arrive dans l'action parce qu'un reducer ne peut pas lire l'horloge — et il arrive
     * à CHAQUE choix, jamais mémorisé : le plancher d'une décision est le jour de cette
     * décision-là. La comparaison est STRICTE, donc le jour même passe : un menu qui démarre
     * aujourd'hui reste légitime.
     */
    startDateChosen(state, action: PayloadAction<{ iso: string; today: CalendarDate }>) {
      const choisi = choisiOuRien(action.payload.iso);
      if (choisi === null) return;
      if (isBefore(choisi, action.payload.today)) {
        state.startDateRefused = true;
        return;
      }
      state.startDate = choisi;
      state.startDateRefused = false;
    },
    /** L'arrivée sur l'écran : le plancher est relu, et le constat de la visite précédente tombe. */
    menuOpened(state, action: PayloadAction<CalendarDate>) {
      state.startDateFloor = action.payload;
      state.startDateRefused = false;
      // SAUF si une écriture est en vol : un thunk RTK n'est pas annulé par un démontage, et
      // réarmer le bouton ici rendrait un second appui possible pendant la borne d'acquittement.
      // Pire, le verdict du premier ne serait plus reconnu (voir `saveMenu.fulfilled`) et
      // l'écran resterait muet sur un enregistrement pourtant abouti.
      if (state.saveStatus !== 'saving') restSaveLifecycle(state);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateMenu.pending, (state, action) => {
        // La génération lit le catalogue elle aussi : elle prend la main sur toute relecture
        // en vol, dont la réponse tardive ne dira plus rien du catalogue courant.
        state.latestRecipesRequestId = action.meta.requestId;
        state.status = 'loading';
        state.menu = null;
        state.recipes = null;
        state.error = null;
        // Le geste suivant tourne la page : le constat portait sur une saisie, pas sur ce menu.
        state.startDateRefused = false;
        // Le menu affiché s'efface : le constat d'enregistrement parlait de LUI. Inconditionnel,
        // contrairement à celui de `menuOpened` — un enregistrement en vol est ici DÉSAVOUÉ,
        // c'est le but : son verdict porterait sur un menu qui n'est plus à l'écran.
        restSaveLifecycle(state);
      })
      .addCase(generateMenu.fulfilled, (state, action) => {
        state.status = 'success';
        // Menu et Recipe sont deeply-readonly (invariants domaine) ; on les expose
        // tels quels dans le draft Immer via un cast vers le type du champ ciblé.
        state.menu = action.payload.menu as typeof state.menu;
        state.recipes = action.payload.recipes as typeof state.recipes;
        state.error = null;
      })
      .addCase(generateMenu.rejected, (state, action) => {
        state.status = 'error';
        // menu/recipes sont déjà à null (transition pending) : pas de reset redondant.
        // Erreur métier (rejectWithValue) → payload discriminant ; sinon message brut.
        state.error = action.payload ?? action.error.message ?? null;
      })
      // `pending` ne porte QUE la mémoire de fraîcheur : surtout pas de passage en `loading`,
      // l'écran ne doit pas clignoter en chargement pour une relecture que l'utilisateur n'a
      // pas demandée. Rien du tout pour `rejected` : la relecture échouée conserve le menu
      // affiché avec ses anciens titres, sans message d'erreur — il n'a rien demandé, on ne
      // lui montre pas de panne.
      .addCase(refreshMenuRecipes.pending, (state, action) => {
        state.latestRecipesRequestId = action.meta.requestId;
      })
      .addCase(refreshMenuRecipes.fulfilled, (state, action) => {
        // Une relecture périmée ne dit rien du catalogue courant : jetée avant tout examen.
        if (action.meta.requestId !== state.latestRecipesRequestId) return;
        state.recipes = action.payload as typeof state.recipes;
      })
      .addCase(saveMenu.pending, (state, action) => {
        state.saveStatus = 'saving';
        state.latestSaveRequestId = action.meta.requestId;
      })
      // Le verdict n'est reçu que si l'on attend encore CELUI-CI : une génération partie
      // entre-temps a remis le cycle au repos, et ce qui revient parle d'un menu qui n'est plus
      // à l'écran. Sans ce garde, « Menu enregistré » s'afficherait sur un menu jamais enregistré.
      .addCase(saveMenu.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestSaveRequestId) return;
        state.saveStatus = 'saved';
      })
      .addCase(saveMenu.rejected, (state, action) => {
        if (action.meta.requestId !== state.latestSaveRequestId) return;
        // Non acquitté ≠ refusé : `action.error` est une copie plate (miniSerializeError), et le
        // garde du domaine est nominal précisément pour rester lisible ici.
        state.saveStatus = isRepositoryUnavailable(action.error) ? 'unconfirmed' : 'error';
      });
  },
});

export const { menuWindowSelected } = menuSlice.actions;

// Actions NON exportées : elles portent un jour courant que seul un thunk sait lire. Les
// exposer laisserait poser un plancher arbitraire depuis n'importe où.
const { menuOpened, startDateChosen } = menuSlice.actions;

/**
 * Le choix d'une date de début. Un THUNK, et non une action nue : la décision a besoin
 * d'AUJOURD'HUI, qu'un reducer pur ne sait pas lire. Le thunk ne fait que la lecture — la
 * décision, elle, reste dans le reducer, qui est muté.
 *
 * L'horloge est relue à chaque choix, jamais figée à la naissance du store : celui-ci est un
 * singleton de session, et un plancher posé au démarrage refuserait la mauvaise journée dans une
 * session restée ouverte après minuit.
 */
export function menuStartDateSelected(iso: string): AppThunk {
  return (dispatch, _getState, extra) => {
    dispatch(startDateChosen({ iso, today: extra.clock.today() }));
  };
}

/** L'arrivée sur l'écran du menu, seul moment où le plancher affiché peut être remis à jour. */
export function menuScreenOpened(): AppThunk {
  return (dispatch, _getState, extra) => {
    dispatch(menuOpened(extra.clock.today()));
  };
}

export const menuReducer = menuSlice.reducer;

export const selectMenu = (state: RootState): MenuState => state.menu;

// La date de début telle que le champ natif la veut. La traduction appartient à `CalendarDate` ;
// ce sélecteur ne fait que l'appliquer, ici plutôt que dans un container non muté.
export const selectStartDateIso = (state: RootState): string => toIsoDate(startDateOf(state.menu));

// Le plancher au format du champ natif, pour son attribut `min`. Même traduction, même endroit :
// dans le slice muté, pas dans un container que la mutation ignore.
export const selectStartDateFloorIso = (state: RootState): string =>
  toIsoDate(startDateFloorOf(state.menu));

/**
 * Ce que l'écran dit de l'enregistrement, et rien d'autre. Trois tons pour trois issues : un
 * succès qui n'a que ce message pour se voir, un refus qui appelle une action, et une absence de
 * réponse qui ne demande rien. Le ton choisit le rôle ARIA côté rendu.
 * Un seul objet nullable plutôt que trois messages : au plus un constat à la fois, et l'état
 * « deux constats ensemble » devient irreprésentable.
 */
export type MenuSaveNotice = { tone: 'success' | 'error' | 'unconfirmed'; message: string };

/**
 * Projection PURE de l'état de tranche vers le constat affichable, ICI plutôt que dans un
 * container que la mutation ignore. Prend `MenuState` et non `RootState` : ce n'est pas un
 * sélecteur à passer à `useAppSelector` — il construit un objet neuf à chaque appel.
 */
export function menuSaveNoticeOf(state: MenuState): MenuSaveNotice | null {
  if (state.saveStatus === 'saved') return { tone: 'success', message: 'Menu enregistré' };
  if (state.saveStatus === 'unconfirmed') {
    return {
      tone: 'unconfirmed',
      message: 'Aucune connexion — l’enregistrement du menu n’a pas pu être confirmé.',
    };
  }
  if (state.saveStatus === 'error') {
    return { tone: 'error', message: 'Impossible d’enregistrer le menu.' };
  }
  return null;
}

/**
 * Verrou du bouton « Enregistrer » : pendant l'écriture SEULEMENT. Un échec, acquitté ou non,
 * laisse le bouton offert — l'écriture d'un menu est un upsert sur sa période, un second envoi
 * ne peut rien dupliquer, et le verrouiller ferait de l'écran une impasse.
 * Vit ici, et pas dans le container, pour que la mutation couvre la distinction.
 */
export const selectIsSaveInFlight = (state: RootState): boolean =>
  state.menu.saveStatus === 'saving';
