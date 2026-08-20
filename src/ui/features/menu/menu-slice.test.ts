import { describe, it, expect } from 'vitest';

import { createCalendarDate } from '../../../domain/entities/calendar-date';
import { createMenu, type Menu } from '../../../domain/entities/menu';
import { createRepas } from '../../../domain/entities/repas';
import { createSlot } from '../../../domain/entities/slot';
import { type Recipe } from '../../../domain/entities/recipe';
import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { type GenerateMenu } from '../../../domain/use-cases/generate-menu';
import { type ListRecipes } from '../../../domain/use-cases/list-recipes';
import { type SaveMenu } from '../../../domain/use-cases/save-menu';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../store/create-test-store';
import { deferred } from '../../test-utils/deferred';
import {
  generateMenu,
  menuReducer,
  menuSaveNoticeOf,
  menuScreenOpened,
  menuStartDateSelected,
  menuWindowSelected,
  refreshMenuRecipes,
  saveMenu,
  selectIsSaveInFlight,
  selectMenu,
  selectStartDateIso,
  type MenuState,
} from './menu-slice';

// Lundi 24 août 2026 : le prochain lundi vu depuis l'horloge de `createTestStore`, qui part
// d'un DIMANCHE (23 août). Une date de début égale à « aujourd'hui » ne pourrait pas passer.
const LUNDI_24_AOUT = createCalendarDate({ year: 2026, month: 8, day: 24 });

// Mercredi 2 septembre 2026 : ni le prochain lundi vu de l'horloge de test (24 août), ni celui
// de la lecture suivante (31 août). Une date de début qui vaut ce jour-là ne peut avoir été
// que CHOISIE.
const MERCREDI_2_SEPT = createCalendarDate({ year: 2026, month: 9, day: 2 });

function aMenu(): Menu {
  return createMenu({
    dateDebut: LUNDI_24_AOUT,
    repas: [
      createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] }),
      createRepas({ jour: 0, creneau: 'soir', slots: [createSlot({ recipeId: 'r2' })] }),
    ],
  });
}

function twoRecipes(): Recipe[] {
  return [
    RecipeBuilder.aRecipe().withId('r1').withTitle('Ratatouille').build(),
    RecipeBuilder.aRecipe().withId('r2').withTitle('Blanquette').build(),
  ];
}

// Menu dont un créneau porte une recette ABSENTE du catalogue d'origine : c'est elle qui
// retombe sur « Recette inconnue » si un catalogue périmé écrase le catalogue courant.
function aMenuAvecR3(): Menu {
  return createMenu({
    dateDebut: LUNDI_24_AOUT,
    repas: [
      createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r3' })] }),
      createRepas({ jour: 0, creneau: 'soir', slots: [createSlot({ recipeId: 'r2' })] }),
    ],
  });
}

function threeRecipes(): Recipe[] {
  return [...twoRecipes(), RecipeBuilder.aRecipe().withId('r3').withTitle('Tarte').build()];
}

describe('menu slice', () => {
  it('un store neuf est idle, sans menu ni recettes ni erreur', () => {
    const store = createTestStore();

    expect(selectMenu(store.getState())).toEqual({
      status: 'idle',
      menu: null,
      recipes: null,
      error: null,
      selectedDays: 14,
      // Préférence de même nature que la fenêtre : posée à la naissance du store, jamais
      // touchée par une transition du cycle de génération.
      startDate: LUNDI_24_AOUT,
      // Plancher posé à la naissance du store, par la lecture qui suit celle du prochain
      // lundi : l'horloge dérive d'un jour, et part du dimanche 23 août.
      startDateFloor: LUNDI_24_AOUT,
      // Aucune date n'a été refusée : il n'y a pas de constat à porter.
      startDateRefused: false,
      // Aucune lecture n'a été lancée : il n'y a pas de « dernière » à mémoriser.
      latestRecipesRequestId: null,
      // Aucun enregistrement n'a été lancé : il n'y a rien à constater.
      saveStatus: 'idle',
      // … et aucun verdict n'est attendu : rien à reconnaître.
      latestSaveRequestId: null,
    });
  });

  it('generateMenu réussi passe en success avec le menu et les recettes des deux use cases injectés', async () => {
    const menu = aMenu();
    const recipes = twoRecipes();
    const generate: GenerateMenu = async () => menu;
    const list: ListRecipes = async () => recipes;
    const store = createTestStore({ generateMenu: generate, listRecipes: list });

    // TROIS valeurs distinctes — défaut 14, préférence 7, argument du thunk 5 — parce que
    // l'assertion sur selectedDays porte DEUX promesses, et qu'une valeur partagée n'en gage
    // qu'une : `= DEFAULT_DAYS` dans fulfilled rendrait 14, `= action.meta.arg` rendrait 5.
    // Les deux tombent sur le 7 attendu, aucune ne peut se cacher derrière l'autre.
    store.dispatch(menuWindowSelected(7));

    const generated = await store.dispatch(generateMenu(5));

    expect(selectMenu(store.getState())).toEqual({
      status: 'success',
      menu,
      recipes,
      error: null,
      // Jamais touchée par le cycle de génération : la fenêtre choisie reste celle de départ,
      // et NON l'argument passé au thunk.
      selectedDays: 7,
      // Préférence de même nature que la fenêtre : posée à la naissance du store, jamais
      // touchée par une transition du cycle de génération.
      startDate: LUNDI_24_AOUT,
      // Plancher posé à la naissance du store, par la lecture qui suit celle du prochain
      // lundi : l'horloge dérive d'un jour, et part du dimanche 23 août.
      startDateFloor: LUNDI_24_AOUT,
      // Aucune date n'a été refusée : il n'y a pas de constat à porter.
      startDateRefused: false,
      // La génération lit le catalogue : c'est ELLE la dernière lecture lancée.
      latestRecipesRequestId: generated.meta.requestId,
      // `fulfilled` n'invente aucun enregistrement : le menu vient d'être produit, pas écrit.
      saveStatus: 'idle',
      latestSaveRequestId: null,
    });
  });

  it('generateMenu transmet le nombre de jours et la date de début au use case de génération', async () => {
    let received: { days: number; dateDebut: unknown } | null = null;
    const generate: GenerateMenu = async (input) => {
      received = input;
      return aMenu();
    };
    const store = createTestStore({
      generateMenu: generate,
      listRecipes: async () => twoRecipes(),
    });

    await store.dispatch(generateMenu(5));

    // La date de début n'est PAS choisie par l'écran : c'est le prochain lundi vu de
    // l'horloge. `createTestStore` part d'un dimanche 23 août 2026, d'où le lundi 24 — une
    // implémentation qui transmettrait « aujourd'hui » rendrait le 23.
    expect(received).toEqual({ days: 5, dateDebut: { year: 2026, month: 8, day: 24 } });
  });

  it('generateMenu en échec, depuis un menu déjà affiché, repart en error en effaçant menu/recettes et porte le message', async () => {
    const menu = aMenu();
    let failPhase = false;
    const generate: GenerateMenu = ({ days }) => {
      void days;
      if (failPhase) return Promise.reject(new Error('Boom firestore'));
      return Promise.resolve(menu);
    };
    const store = createTestStore({
      generateMenu: generate,
      listRecipes: async () => twoRecipes(),
    });

    // Fenêtre NON-défaut : sans ce gage, l'assertion sur selectedDays passerait aussi bien
    // si la transition rejected remettait le champ à sa valeur par défaut.
    store.dispatch(menuWindowSelected(7));

    await store.dispatch(generateMenu(7));
    // état peuplé : un menu et des recettes sont affichés
    expect(selectMenu(store.getState()).menu).not.toBeNull();

    failPhase = true;
    const failed = await store.dispatch(generateMenu(7));

    // le null vient de la transition (pending), pas de l'initialState : rejected ne reset pas.
    expect(selectMenu(store.getState())).toEqual({
      status: 'error',
      menu: null,
      recipes: null,
      error: 'Boom firestore',
      selectedDays: 7,
      // Préférence de même nature que la fenêtre : posée à la naissance du store, jamais
      // touchée par une transition du cycle de génération.
      startDate: LUNDI_24_AOUT,
      // Plancher posé à la naissance du store, par la lecture qui suit celle du prochain
      // lundi : l'horloge dérive d'un jour, et part du dimanche 23 août.
      startDateFloor: LUNDI_24_AOUT,
      // Aucune date n'a été refusée : il n'y a pas de constat à porter.
      startDateRefused: false,
      // La SECONDE génération, celle qui a échoué : la mémoire suit la dernière lancée.
      latestRecipesRequestId: failed.meta.requestId,
      saveStatus: 'idle',
      latestSaveRequestId: null,
    });
  });

  it('une génération en vol, depuis un menu déjà affiché, repart en loading en effaçant menu/recettes', async () => {
    const menu = aMenu();
    let pendingPhase = false;
    const generate: GenerateMenu = ({ days }) => {
      void days;
      if (pendingPhase) return new Promise<Menu>(() => {});
      return Promise.resolve(menu);
    };
    const store = createTestStore({
      generateMenu: generate,
      listRecipes: async () => twoRecipes(),
    });

    // TROIS valeurs distinctes — défaut 14, préférence 7, argument du thunk 5 — parce que
    // l'assertion sur selectedDays porte DEUX promesses, et qu'une valeur partagée n'en gage
    // qu'une : `= DEFAULT_DAYS` dans pending rendrait 14, `= action.meta.arg` rendrait 5.
    // Les deux tombent sur le 7 attendu, aucune ne peut se cacher derrière l'autre.
    store.dispatch(menuWindowSelected(7));

    await store.dispatch(generateMenu(5));
    // état peuplé
    expect(selectMenu(store.getState()).menu).not.toBeNull();

    pendingPhase = true;
    const inFlight = store.dispatch(generateMenu(5));

    expect(selectMenu(store.getState())).toEqual({
      status: 'loading',
      menu: null,
      recipes: null,
      error: null,
      selectedDays: 7,
      // Préférence de même nature que la fenêtre : posée à la naissance du store, jamais
      // touchée par une transition du cycle de génération.
      startDate: LUNDI_24_AOUT,
      // Plancher posé à la naissance du store, par la lecture qui suit celle du prochain
      // lundi : l'horloge dérive d'un jour, et part du dimanche 23 août.
      startDateFloor: LUNDI_24_AOUT,
      // Aucune date n'a été refusée : il n'y a pas de constat à porter.
      startDateRefused: false,
      latestRecipesRequestId: inFlight.requestId,
      saveStatus: 'idle',
      latestSaveRequestId: null,
    });
  });

  it('catalogue vide : rejette avec le discriminant « no-recipes » sans appeler la génération', async () => {
    let generateCalled = false;
    const generate: GenerateMenu = async () => {
      generateCalled = true;
      return aMenu();
    };
    const store = createTestStore({ generateMenu: generate, listRecipes: async () => [] });

    // Fenêtre NON-défaut : gage l'assertion sur selectedDays contre un reset en rejected.
    store.dispatch(menuWindowSelected(7));

    const refused = await store.dispatch(generateMenu(7));

    expect(selectMenu(store.getState())).toEqual({
      status: 'error',
      menu: null,
      recipes: null,
      error: 'no-recipes',
      selectedDays: 7,
      // Préférence de même nature que la fenêtre : posée à la naissance du store, jamais
      // touchée par une transition du cycle de génération.
      startDate: LUNDI_24_AOUT,
      // Plancher posé à la naissance du store, par la lecture qui suit celle du prochain
      // lundi : l'horloge dérive d'un jour, et part du dimanche 23 août.
      startDateFloor: LUNDI_24_AOUT,
      // Aucune date n'a été refusée : il n'y a pas de constat à porter.
      startDateRefused: false,
      latestRecipesRequestId: refused.meta.requestId,
      saveStatus: 'idle',
      latestSaveRequestId: null,
    });
    expect(generateCalled).toBe(false);
  });

  // [guard] tue le mutant `state.error = null` de la transition FULFILLED :
  // un menu regénéré avec succès efface l'erreur périmée d'une tentative précédente.
  it('generateMenu réussi depuis un état en erreur efface l’erreur périmée', () => {
    const menu = aMenu();
    const recipes = twoRecipes();
    const errored: MenuState = {
      status: 'error',
      menu: null,
      recipes: null,
      error: 'Impossible de générer un menu sans recette',
      selectedDays: 7,
      // Date de début NON-défaut : le lundi 24 août, qui EST le prochain lundi de
      // l’horloge de test, ne distinguerait pas « la préférence a survécu » de « le
      // défaut a été reposé ». Le mercredi 2 septembre, lui, ne peut venir que du store.
      startDate: MERCREDI_2_SEPT,
      // Plancher DISTINCT de la date de début : une transition qui écraserait l'un par l'autre
      // se verrait.
      startDateFloor: LUNDI_24_AOUT,
      // Constat POSÉ au départ : `fulfilled` n'a pas à y toucher — c'est `pending` qui tourne
      // la page, et il l'a déjà fait dans tout parcours réel.
      startDateRefused: true,
      latestRecipesRequestId: 'req-0',
      // Constat POSÉ au départ : c'est `pending` qui tourne la page, pas `fulfilled`.
      saveStatus: 'saved',
      // Écriture MÉMORISÉE au départ, comme le constat : `fulfilled` n'a pas à y toucher.
      latestSaveRequestId: 'save-0',
    };

    const next = menuReducer(errored, generateMenu.fulfilled({ menu, recipes }, 'req-1', 7));

    expect(next).toEqual({
      status: 'success',
      menu,
      recipes,
      error: null,
      selectedDays: 7,
      // Rendue INCHANGÉE : `fulfilled` ne repose pas le défaut par-dessus la préférence.
      startDate: MERCREDI_2_SEPT,
      // Inchangés eux aussi : `fulfilled` ne relit aucun plancher et n'efface aucun constat.
      startDateFloor: LUNDI_24_AOUT,
      startDateRefused: true,
      // `fulfilled` ne touche PAS la mémoire de fraîcheur : elle est posée au départ de la
      // lecture, pas à son arrivée. Elle reste donc sur 'req-0', pas sur l'id de cette action.
      latestRecipesRequestId: 'req-0',
      // Rendu INCHANGÉ : `fulfilled` ne constate rien de l'enregistrement.
      saveStatus: 'saved',
      // Rendu INCHANGÉ lui aussi : `fulfilled` n'attend ni ne désavoue aucune écriture.
      latestSaveRequestId: 'save-0',
    });
  });

  // [guard] tue les mutants de reset de la transition PENDING (`state.error = null`,
  // `state.menu = null`, `state.recipes = null`) : on part d'un état SALE peuplé
  // (erreur + menu + recettes non-null) ; une régénération efface tout avant de
  // repartir en chargement.
  it('une régénération (generateMenu.pending) efface l’erreur périmée, le menu et les recettes', () => {
    const dirty: MenuState = {
      status: 'error',
      menu: aMenu(),
      recipes: twoRecipes(),
      error: 'Impossible de générer un menu sans recette',
      selectedDays: 7,
      // Date de début NON-défaut : le lundi 24 août, qui EST le prochain lundi de
      // l’horloge de test, ne distinguerait pas « la préférence a survécu » de « le
      // défaut a été reposé ». Le mercredi 2 septembre, lui, ne peut venir que du store.
      startDate: MERCREDI_2_SEPT,
      // Plancher DISTINCT de la date de début : une transition qui écraserait l'un par l'autre
      // se verrait.
      startDateFloor: LUNDI_24_AOUT,
      // Constat POSÉ au départ : la génération est le geste qui tourne la page.
      startDateRefused: true,
      latestRecipesRequestId: 'req-0',
      // Constat POSÉ au départ : la génération est le geste qui efface le menu enregistré.
      saveStatus: 'saved',
      // Écriture MÉMORISÉE au départ : c'est la génération qui la désavoue.
      latestSaveRequestId: 'save-0',
    };

    const next = menuReducer(dirty, generateMenu.pending('req-1', 7));

    expect(next).toEqual({
      status: 'loading',
      menu: null,
      recipes: null,
      error: null,
      // La transition qui efface TOUT le reste n'efface ni la fenêtre choisie…
      selectedDays: 7,
      // … ni la date de début choisie, ni le plancher, qui ne se relit qu'à l'arrivée sur l'écran.
      startDate: MERCREDI_2_SEPT,
      startDateFloor: LUNDI_24_AOUT,
      // Le constat, LUI, tombe : il portait sur une saisie, pas sur le menu qui se génère.
      startDateRefused: false,
      // Le départ d'une génération PREND la main sur la lecture précédente ('req-0').
      latestRecipesRequestId: 'req-1',
      // Le constat d'enregistrement tombe LUI AUSSI : il parlait du menu qui vient d'être effacé.
      saveStatus: 'idle',
      // Et le verdict de l'écriture en vol cesse d'être attendu : il parlerait du menu effacé.
      latestSaveRequestId: null,
    });
  });

  it('la fenêtre choisie par défaut est « 2 semaines » (14 jours)', () => {
    const store = createTestStore();

    expect(selectMenu(store.getState()).selectedDays).toBe(14);
  });

  it('choisir une fenêtre met à jour la fenêtre choisie', () => {
    const store = createTestStore();

    store.dispatch(menuWindowSelected(7));

    expect(selectMenu(store.getState()).selectedDays).toBe(7);
  });

  /**
   * Règle au cœur de l'issue #28 : la fenêtre choisie est une PRÉFÉRENCE, pas un état
   * transitoire. Aucune transition du cycle de génération ne la remet à sa valeur par défaut —
   * ni `pending`, qui efface pourtant menu, recettes et erreur, ni `fulfilled`.
   */
  it('la fenêtre choisie survit à un cycle de génération complet (pending → fulfilled)', async () => {
    const menu = aMenu();
    const recipes = twoRecipes();
    let resolveGenerate!: (menu: Menu) => void;
    const generated = new Promise<Menu>((resolve) => {
      resolveGenerate = resolve;
    });
    const store = createTestStore({
      generateMenu: () => generated,
      listRecipes: async () => recipes,
    });

    store.dispatch(menuWindowSelected(7));
    const inFlight = store.dispatch(generateMenu(7));

    expect(selectMenu(store.getState())).toEqual({
      status: 'loading',
      menu: null,
      recipes: null,
      error: null,
      selectedDays: 7,
      // Préférence de même nature que la fenêtre : posée à la naissance du store, jamais
      // touchée par une transition du cycle de génération.
      startDate: LUNDI_24_AOUT,
      // Plancher posé à la naissance du store, par la lecture qui suit celle du prochain
      // lundi : l'horloge dérive d'un jour, et part du dimanche 23 août.
      startDateFloor: LUNDI_24_AOUT,
      // Aucune date n'a été refusée : il n'y a pas de constat à porter.
      startDateRefused: false,
      latestRecipesRequestId: inFlight.requestId,
      saveStatus: 'idle',
      latestSaveRequestId: null,
    });

    resolveGenerate(menu);
    await inFlight;

    expect(selectMenu(store.getState())).toEqual({
      status: 'success',
      menu,
      recipes,
      error: null,
      selectedDays: 7,
      // Préférence de même nature que la fenêtre : posée à la naissance du store, jamais
      // touchée par une transition du cycle de génération.
      startDate: LUNDI_24_AOUT,
      // Plancher posé à la naissance du store, par la lecture qui suit celle du prochain
      // lundi : l'horloge dérive d'un jour, et part du dimanche 23 août.
      startDateFloor: LUNDI_24_AOUT,
      // Aucune date n'a été refusée : il n'y a pas de constat à porter.
      startDateRefused: false,
      latestRecipesRequestId: inFlight.requestId,
      saveStatus: 'idle',
      latestSaveRequestId: null,
    });
  });
  /**
   * Le menu affichait un INSTANTANÉ des recettes, figé à la génération. En arrivant sur l'écran,
   * les recettes sont RELUES et les titres rafraîchis — sans toucher au menu lui-même : les mêmes
   * repas, aux mêmes jours, avec les bons noms.
   */
  it('rafraîchir les recettes met à jour les recettes sans toucher au menu ni à la fenêtre choisie', async () => {
    const menu = aMenu();
    let catalogue = twoRecipes();
    let generations = 0;
    const store = createTestStore({
      generateMenu: async () => {
        generations += 1;
        return menu;
      },
      listRecipes: async () => catalogue,
    });

    // Fenêtre NON-défaut : sans ce gage, l'assertion sur selectedDays passerait aussi bien si le
    // rafraîchissement remettait la fenêtre à sa valeur par défaut.
    store.dispatch(menuWindowSelected(7));
    await store.dispatch(generateMenu(7));

    // Le catalogue a changé sous les pieds du menu : c'est exactement le titre modifié ailleurs.
    catalogue = [
      RecipeBuilder.aRecipe().withId('r1').withTitle('Tian de légumes').build(),
      RecipeBuilder.aRecipe().withId('r2').withTitle('Blanquette').build(),
    ];

    const refreshed = await store.dispatch(refreshMenuRecipes());

    // Le double rend un menu STABLE : une implémentation qui régénérerait EN PLUS produirait un
    // état structurellement égal et passerait le `toEqual` ci-dessous. Seul le compte d'appels
    // tient la promesse du nom.
    expect(generations).toBe(1);
    expect(selectMenu(store.getState())).toEqual({
      status: 'success',
      // Le MÊME menu, intact : le rafraîchissement ne rejoue pas la génération.
      menu,
      recipes: catalogue,
      error: null,
      selectedDays: 7,
      // Préférence de même nature que la fenêtre : posée à la naissance du store, jamais
      // touchée par une transition du cycle de génération.
      startDate: LUNDI_24_AOUT,
      // Plancher posé à la naissance du store, par la lecture qui suit celle du prochain
      // lundi : l'horloge dérive d'un jour, et part du dimanche 23 août.
      startDateFloor: LUNDI_24_AOUT,
      // Aucune date n'a été refusée : il n'y a pas de constat à porter.
      startDateRefused: false,
      // La relecture a pris la main sur la génération qui la précède.
      latestRecipesRequestId: refreshed.meta.requestId,
      saveStatus: 'idle',
      latestSaveRequestId: null,
    });
  });

  /**
   * Décision produit : si la relecture ÉCHOUE (hors réseau en arrivant sur l'écran), le menu
   * affiché est CONSERVÉ avec ses anciens titres, sans message d'erreur. Un rafraîchissement que
   * l'utilisateur n'a pas demandé ne détruit pas un écran qui fonctionne, et ne lui affiche pas
   * une panne pour une action qu'il n'a pas faite.
   */
  it('un rafraîchissement en échec laisse le menu, les recettes et le statut inchangés', async () => {
    const menu = aMenu();
    const recipes = twoRecipes();
    let failPhase = false;
    let generations = 0;
    let lectures = 0;
    const store = createTestStore({
      generateMenu: async () => {
        generations += 1;
        return menu;
      },
      listRecipes: async () => {
        lectures += 1;
        if (failPhase) throw new Error('Boom firestore');
        return recipes;
      },
    });

    store.dispatch(menuWindowSelected(7));
    await store.dispatch(generateMenu(7));

    failPhase = true;
    const result = await store.dispatch(refreshMenuRecipes());

    // Ce test est l'UNIQUE gage de l'absence de cas `rejected`. Sans les deux lignes qui
    // suivent, il deviendrait vide en restant vert — une invariance après une action qui ne
    // fait rien : le compte de lectures prouve que la relecture est PARTIE (un `condition`
    // resserré la bloquerait sans que rien ne le signale), et le match prouve qu'elle a
    // REJETÉ (une lecture qui cesserait d'échouer rendrait l'invariance triviale).
    expect(lectures).toBe(2);
    expect(refreshMenuRecipes.rejected.match(result)).toBe(true);
    // Même gage que le test voisin : un rafraîchissement ne rejoue pas la génération.
    expect(generations).toBe(1);
    expect(selectMenu(store.getState())).toEqual({
      status: 'success',
      menu,
      recipes,
      // Pas de message d'erreur : l'utilisateur n'a rien demandé.
      error: null,
      selectedDays: 7,
      // Préférence de même nature que la fenêtre : posée à la naissance du store, jamais
      // touchée par une transition du cycle de génération.
      startDate: LUNDI_24_AOUT,
      // Plancher posé à la naissance du store, par la lecture qui suit celle du prochain
      // lundi : l'horloge dérive d'un jour, et part du dimanche 23 août.
      startDateFloor: LUNDI_24_AOUT,
      // Aucune date n'a été refusée : il n'y a pas de constat à porter.
      startDateRefused: false,
      // La relecture a bien pris la main au DÉPART, alors même qu'elle a échoué à l'arrivée.
      latestRecipesRequestId: result.meta.requestId,
      saveStatus: 'idle',
      latestSaveRequestId: null,
    });
  });

  it('sans menu à rafraîchir, aucune lecture du catalogue n’est déclenchée', async () => {
    let listCalls = 0;
    const store = createTestStore({
      listRecipes: async () => {
        listCalls += 1;
        return twoRecipes();
      },
    });

    await store.dispatch(refreshMenuRecipes());

    expect(listCalls).toBe(0);
    expect(selectMenu(store.getState())).toEqual({
      status: 'idle',
      menu: null,
      recipes: null,
      error: null,
      selectedDays: 14,
      // Préférence de même nature que la fenêtre : posée à la naissance du store, jamais
      // touchée par une transition du cycle de génération.
      startDate: LUNDI_24_AOUT,
      // Plancher posé à la naissance du store, par la lecture qui suit celle du prochain
      // lundi : l'horloge dérive d'un jour, et part du dimanche 23 août.
      startDateFloor: LUNDI_24_AOUT,
      // Aucune date n'a été refusée : il n'y a pas de constat à porter.
      startDateRefused: false,
      // Relecture bloquée au départ : `pending` n'a pas tourné, rien n'est mémorisé.
      latestRecipesRequestId: null,
      saveStatus: 'idle',
      latestSaveRequestId: null,
    });
  });
  /**
   * Le `condition` filtre le DÉPART d'une relecture, jamais son ARRIVÉE : deux lectures peuvent
   * être en vol et se régler dans le désordre. Arriver sur /menu (relecture lente), filer au
   * catalogue renommer une recette, revenir (seconde relecture, qui se règle en premier) — la
   * réponse tardive de la première remettait l'ANCIEN titre à l'écran, soit exactement le défaut
   * que ce cycle vient de fermer, revenu par la fenêtre.
   */
  it('la relecture tardive d’un écran quitté ne fait pas revenir un ancien titre', async () => {
    const menu = aMenu();
    const ancien = twoRecipes();
    const aJour = [
      RecipeBuilder.aRecipe().withId('r1').withTitle('Tian de légumes').build(),
      RecipeBuilder.aRecipe().withId('r2').withTitle('Blanquette').build(),
    ];
    const lente = deferred<Recipe[]>();
    let lectures = 0;
    const list: ListRecipes = () => {
      lectures += 1;
      if (lectures === 1) return Promise.resolve(ancien);
      if (lectures === 2) return lente.promise;
      return Promise.resolve(aJour);
    };
    const store = createTestStore({ generateMenu: async () => menu, listRecipes: list });

    // Fenêtre NON-défaut : gage l'assertion sur selectedDays contre un reset.
    store.dispatch(menuWindowSelected(7));
    await store.dispatch(generateMenu(7));

    const abandonnee = store.dispatch(refreshMenuRecipes());
    const courante = store.dispatch(refreshMenuRecipes());
    await courante;
    // Deux lectures RÉELLEMENT en vol, réglées dans le désordre : la tardive porte l'ANCIEN
    // catalogue et arrive APRÈS que la courante a rendu les titres à jour.
    lente.resolve(ancien);
    await abandonnee;

    expect(selectMenu(store.getState())).toEqual({
      status: 'success',
      menu,
      recipes: aJour,
      error: null,
      selectedDays: 7,
      // Préférence de même nature que la fenêtre : posée à la naissance du store, jamais
      // touchée par une transition du cycle de génération.
      startDate: LUNDI_24_AOUT,
      // Plancher posé à la naissance du store, par la lecture qui suit celle du prochain
      // lundi : l'horloge dérive d'un jour, et part du dimanche 23 août.
      startDateFloor: LUNDI_24_AOUT,
      // Aucune date n'a été refusée : il n'y a pas de constat à porter.
      startDateRefused: false,
      latestRecipesRequestId: courante.requestId,
      saveStatus: 'idle',
      latestSaveRequestId: null,
    });
  });

  /**
   * Deux producteurs écrivent `recipes` : la relecture ET la génération. Une régénération relit
   * un catalogue à jour et pose menu + recettes COHÉRENTS ; si la relecture périmée se règle
   * après, elle rend un catalogue amputé de la recette créée entre-temps, et les créneaux de
   * celle-ci retombent sur « Recette inconnue » sur un menu qui vient pourtant de réussir.
   */
  it('la relecture tardive ne remplace pas le catalogue d’une régénération plus récente', async () => {
    const menu = aMenu();
    const menuAvecR3 = aMenuAvecR3();
    const ancien = twoRecipes();
    const aJour = threeRecipes();
    const lente = deferred<Recipe[]>();
    let lectures = 0;
    const list: ListRecipes = () => {
      lectures += 1;
      if (lectures === 1) return Promise.resolve(ancien);
      if (lectures === 2) return lente.promise;
      return Promise.resolve(aJour);
    };
    let rendu = menu;
    const store = createTestStore({ generateMenu: async () => rendu, listRecipes: list });

    store.dispatch(menuWindowSelected(7));
    await store.dispatch(generateMenu(7));

    const abandonnee = store.dispatch(refreshMenuRecipes());
    // R3 a été créée entre-temps : la régénération la fait entrer au menu ET au catalogue.
    rendu = menuAvecR3;
    const regeneration = await store.dispatch(generateMenu(7));
    lente.resolve(ancien);
    await abandonnee;

    expect(selectMenu(store.getState())).toEqual({
      status: 'success',
      menu: menuAvecR3,
      recipes: aJour,
      error: null,
      selectedDays: 7,
      // Préférence de même nature que la fenêtre : posée à la naissance du store, jamais
      // touchée par une transition du cycle de génération.
      startDate: LUNDI_24_AOUT,
      // Plancher posé à la naissance du store, par la lecture qui suit celle du prochain
      // lundi : l'horloge dérive d'un jour, et part du dimanche 23 août.
      startDateFloor: LUNDI_24_AOUT,
      // Aucune date n'a été refusée : il n'y a pas de constat à porter.
      startDateRefused: false,
      latestRecipesRequestId: regeneration.meta.requestId,
      saveStatus: 'idle',
      latestSaveRequestId: null,
    });
  });
});

/**
 * La date de début cesse d'être déduite à chaque génération : elle devient une PRÉFÉRENCE, de
 * même nature et de même durée de vie que la fenêtre (issue #28). Le prochain lundi n'en est
 * plus que la valeur par DÉFAUT, posée une fois à la naissance du store.
 *
 * Toutes les dates choisies dans ce bloc sont le MERCREDI 2 septembre 2026 : ni le prochain
 * lundi vu de l'horloge de test (24 août), ni celui de la lecture suivante (31 août). Une
 * implémentation qui recalculerait le défaut au lieu de lire la préférence ne peut pas le rendre.
 */
describe('menu slice — date de début', () => {
  const MERCREDI_2_SEPT = '2026-09-02';

  it('un store neuf part du prochain lundi vu de l’horloge', () => {
    const store = createTestStore();

    expect(selectMenu(store.getState()).startDate).toEqual({ year: 2026, month: 8, day: 24 });
  });

  it('offre la date de début au format du champ natif', () => {
    const store = createTestStore();

    expect(selectStartDateIso(store.getState())).toBe('2026-08-24');
  });

  it('choisir une date de début remplace la préférence', () => {
    const store = createTestStore();

    store.dispatch(menuStartDateSelected(MERCREDI_2_SEPT));

    expect(selectMenu(store.getState()).startDate).toEqual({ year: 2026, month: 9, day: 2 });
    expect(selectStartDateIso(store.getState())).toBe(MERCREDI_2_SEPT);
  });

  /**
   * Le champ natif rend une chaîne VIDE quand l'utilisateur l'efface — c'est le cas réel, pas
   * une hypothèse. Il n'y a alors aucune date à choisir : la préférence précédente reste, et
   * surtout le store ne part pas en exception au milieu d'un reducer.
   */
  it.each([
    ['le champ effacé', ''],
    ['un jour qui n’existe pas', '2026-02-30'],
    ['du texte', 'demain'],
  ])('%s laisse la date de début inchangée', (_label, saisie) => {
    const store = createTestStore();
    store.dispatch(menuStartDateSelected(MERCREDI_2_SEPT));

    store.dispatch(menuStartDateSelected(saisie));

    expect(selectMenu(store.getState()).startDate).toEqual({ year: 2026, month: 9, day: 2 });
  });

  it('generateMenu transmet la date de début CHOISIE au use case de génération', async () => {
    let received: { days: number; dateDebut: unknown } | null = null;
    const generate: GenerateMenu = async (input) => {
      received = input;
      return aMenu();
    };
    const store = createTestStore({
      generateMenu: generate,
      listRecipes: async () => twoRecipes(),
    });

    store.dispatch(menuStartDateSelected(MERCREDI_2_SEPT));
    await store.dispatch(generateMenu(5));

    expect(received).toEqual({ days: 5, dateDebut: { year: 2026, month: 9, day: 2 } });
  });

  /**
   * REMPLACE « recalcule la date de début à CHAQUE génération » : c'est exactement la règle
   * inverse. L'horloge de test dérive d'un jour par lecture ; relue à la troisième génération,
   * elle rendrait le lundi 31 août et le menu changerait de semaine sans que l'utilisateur ait
   * touché à quoi que ce soit. Elle n'est plus lue qu'une fois, à la naissance du store.
   */
  it('ne recalcule PAS la date de début d’une génération à l’autre', async () => {
    const dates: unknown[] = [];
    const generate: GenerateMenu = async (input) => {
      dates.push(input.dateDebut);
      return aMenu();
    };
    const store = createTestStore({
      generateMenu: generate,
      listRecipes: async () => twoRecipes(),
    });

    await store.dispatch(generateMenu(7));
    await store.dispatch(generateMenu(7));
    await store.dispatch(generateMenu(7));

    expect(dates).toEqual([
      { year: 2026, month: 8, day: 24 },
      { year: 2026, month: 8, day: 24 },
      { year: 2026, month: 8, day: 24 },
    ]);
  });

  /**
   * Même règle que pour la fenêtre : aucune transition du cycle de génération ne remet la date
   * de début à son défaut — ni `pending`, qui efface pourtant menu, recettes et erreur, ni
   * `fulfilled`. Le mercredi 2 septembre le prouve ; le lundi 24 août, qui EST le défaut, ne
   * distinguerait pas « la préférence a survécu » de « le défaut a été reposé ».
   */
  it('la date de début choisie survit à un cycle de génération complet (pending → fulfilled)', async () => {
    const menu = aMenu();
    let resolveGenerate!: (menu: Menu) => void;
    const generated = new Promise<Menu>((resolve) => {
      resolveGenerate = resolve;
    });
    const store = createTestStore({
      generateMenu: () => generated,
      listRecipes: async () => twoRecipes(),
    });

    store.dispatch(menuStartDateSelected(MERCREDI_2_SEPT));
    const inFlight = store.dispatch(generateMenu(7));

    expect(selectMenu(store.getState()).startDate).toEqual({ year: 2026, month: 9, day: 2 });

    resolveGenerate(menu);
    await inFlight;

    expect(selectMenu(store.getState()).startDate).toEqual({ year: 2026, month: 9, day: 2 });
  });
});

/**
 * TRANCHE 4b — le PLANCHER. Un menu ne peut pas démarrer dans le passé : la rétention glissante
 * de deux mois est ancrée sur aujourd'hui, donc un menu parti d'il y a trois mois serait écrit
 * puis purgé dans la foulée — un enregistrement qui réussit sans rien conserver.
 *
 * « Aujourd'hui » est relu AU MOMENT DE LA DÉCISION, jamais figé à la naissance du store : le
 * store est un singleton de session, et un plancher figé refuserait la mauvaise journée dans une
 * session restée ouverte après minuit. L'horloge de `createTestStore` DÉRIVE d'un jour par
 * lecture, ce qui rend cette relecture observable — et voici le compte des lectures, dont tout
 * ce bloc dépend :
 *
 *   lecture 0 → dimanche 23 août  (naissance du store, `nextMonday` → lundi 24 août)
 *   lecture 1 → lundi 24 août     (naissance du store, plancher initial)
 *   lecture 2 → mardi 25 août     (1er `menuStartDateSelected`)
 *   lecture 3 → mercredi 26 août  (2e), lecture 4 → jeudi 27 août (3e), etc.
 */
describe('menu slice — plancher de la date de début', () => {
  const MERCREDI_2_SEPT = '2026-09-02';

  it('une date de début ANTÉRIEURE à aujourd’hui est refusée : la préférence précédente reste', () => {
    const store = createTestStore();
    // Lecture 2 → aujourd'hui = 25 août : le 2 septembre est à venir, il passe.
    store.dispatch(menuStartDateSelected(MERCREDI_2_SEPT));

    // Lecture 3 → aujourd'hui = 26 août : le 20 août est derrière.
    store.dispatch(menuStartDateSelected('2026-08-20'));

    expect(selectMenu(store.getState()).startDate).toEqual({ year: 2026, month: 9, day: 2 });
    expect(selectMenu(store.getState()).startDateRefused).toBe(true);
  });

  /**
   * Le plancher est AUJOURD'HUI, pas demain : un menu qui démarre le jour même reste légitime.
   * Le 25 août n'est pas la date de début de départ (le lundi 24) — l'acceptation se voit donc
   * à un champ qui a bougé, et non à un champ qu'on aurait laissé tel quel.
   */
  it('une date de début ÉGALE à aujourd’hui est acceptée', () => {
    const store = createTestStore();

    // Lecture 2 → aujourd'hui = 25 août, et c'est exactement le jour choisi.
    store.dispatch(menuStartDateSelected('2026-08-25'));

    expect(selectMenu(store.getState()).startDate).toEqual({ year: 2026, month: 8, day: 25 });
    expect(selectMenu(store.getState()).startDateRefused).toBe(false);
  });

  /**
   * LA preuve que l'horloge est RELUE à chaque décision. Le MÊME jour — le 26 août — est proposé
   * deux fois : accepté la première (il est alors demain), refusé la seconde (il est alors hier).
   * Un plancher lu une fois pour toutes à la naissance du store (24 août) les accepterait TOUS
   * LES DEUX, et la date de début finirait sur le 26 au lieu du 2 septembre.
   */
  it('relit l’horloge à CHAQUE choix : un jour accepté aujourd’hui est refusé plus tard', () => {
    const store = createTestStore();
    const LE_26_AOUT = '2026-08-26';

    // Lecture 2 → aujourd'hui = 25 août : le 26 est demain.
    store.dispatch(menuStartDateSelected(LE_26_AOUT));
    expect(selectMenu(store.getState()).startDate).toEqual({ year: 2026, month: 8, day: 26 });
    expect(selectMenu(store.getState()).startDateRefused).toBe(false);

    // Lecture 3 → aujourd'hui = 26 août : le 2 septembre passe, et pose une préférence
    // DISTINCTE du 26, sans quoi le refus qui suit ne se distinguerait pas d'une acceptation.
    store.dispatch(menuStartDateSelected(MERCREDI_2_SEPT));

    // Lecture 4 → aujourd'hui = 27 août : le 26 est désormais derrière.
    store.dispatch(menuStartDateSelected(LE_26_AOUT));

    expect(selectMenu(store.getState()).startDate).toEqual({ year: 2026, month: 9, day: 2 });
    expect(selectMenu(store.getState()).startDateRefused).toBe(true);
  });

  it('choisir une date recevable efface le constat de refus', () => {
    const store = createTestStore();
    // Lecture 2 → aujourd'hui = 25 août : le 20 est refusé.
    store.dispatch(menuStartDateSelected('2026-08-20'));
    expect(selectMenu(store.getState()).startDateRefused).toBe(true);

    // Lecture 3 → aujourd'hui = 26 août : le 2 septembre passe.
    store.dispatch(menuStartDateSelected(MERCREDI_2_SEPT));

    expect(selectMenu(store.getState()).startDate).toEqual({ year: 2026, month: 9, day: 2 });
    expect(selectMenu(store.getState()).startDateRefused).toBe(false);
  });

  /**
   * Le champ effacé n'est pas une date REFUSÉE : c'est l'absence de date. Accuser l'utilisateur
   * d'avoir choisi un jour passé alors qu'il a vidé le champ serait un constat faux.
   */
  it('le champ effacé ne pose PAS le constat de refus', () => {
    const store = createTestStore();

    store.dispatch(menuStartDateSelected(''));

    expect(selectMenu(store.getState()).startDateRefused).toBe(false);
    expect(selectMenu(store.getState()).startDate).toEqual({ year: 2026, month: 8, day: 24 });
  });

  /**
   * Le constat porte sur la SAISIE, pas sur le menu. Lancer une génération est le geste suivant :
   * l'écran de chargement retire le champ, et le retrouver au retour surmonté d'un constat sur
   * une saisie abandonnée deux gestes plus tôt ferait douter du menu qui vient d'être produit.
   */
  it('lancer une génération efface le constat de refus', async () => {
    const store = createTestStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => twoRecipes(),
    });
    store.dispatch(menuStartDateSelected('2026-08-20'));
    expect(selectMenu(store.getState()).startDateRefused).toBe(true);

    await store.dispatch(generateMenu(7));

    expect(selectMenu(store.getState()).startDateRefused).toBe(false);
  });
});

/**
 * TRANCHE 4a — le menu affiché s'ENREGISTRE. Le constat qui s'ensuit est TRANSITOIRE : il parle
 * du menu affiché, et n'a plus rien à dire dès que ce menu n'est plus celui-là.
 */
describe('menu slice — enregistrement du menu', () => {
  const SUCCES = { tone: 'success', message: 'Menu enregistré' };
  const PANNE = {
    tone: 'unconfirmed',
    message: 'Aucune connexion — l’enregistrement du menu n’a pas pu être confirmé.',
  };
  const ECHEC = { tone: 'error', message: 'Impossible d’enregistrer le menu.' };

  // Un menu À L'ÉCRAN : l'enregistrement n'a de sens que là, et tout part de cet état.
  async function storeAvecMenuAffiche(overrides?: { saveMenu?: SaveMenu }) {
    const store = createTestStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => twoRecipes(),
      ...overrides,
    });
    await store.dispatch(generateMenu(7));
    return store;
  }

  function constat(store: ReturnType<typeof createTestStore>) {
    return menuSaveNoticeOf(selectMenu(store.getState()));
  }

  it('enregistre le menu AFFICHÉ, et l’écran le constate', async () => {
    const menusRecus: unknown[] = [];
    const save: SaveMenu = async ({ menu }) => {
      menusRecus.push(menu);
    };
    const store = await storeAvecMenuAffiche({ saveMenu: save });

    await store.dispatch(saveMenu());

    // Le menu transmis est celui de l'écran, pas un menu reconstruit : mêmes repas, même date.
    expect(menusRecus).toEqual([aMenu()]);
    expect(constat(store)).toEqual(SUCCES);
  });

  it('pendant l’enregistrement, le verrou est armé et l’écran ne constate rien encore', async () => {
    const enVol = deferred<void>();
    const store = await storeAvecMenuAffiche({ saveMenu: () => enVol.promise });

    const enregistrement = store.dispatch(saveMenu());

    expect(selectIsSaveInFlight(store.getState())).toBe(true);
    expect(constat(store)).toBeNull();

    // GAGE des deux assertions ci-dessus : le verrou se lève et le constat paraît au règlement.
    // Sans lui, un verrou armé pour toujours et un écran définitivement muet passeraient aussi.
    enVol.resolve();
    await enregistrement;
    expect(selectIsSaveInFlight(store.getState())).toBe(false);
    expect(constat(store)).toEqual(SUCCES);
  });

  /**
   * Dépôt qui n'a pas répondu : l'écriture est partie, rien ne dit qu'elle est perdue. Même
   * vocabulaire que les convives — un constat qui n'accuse ni ne rassure, et qui ne demande
   * rien à l'utilisateur.
   */
  it('le dépôt indisponible : l’enregistrement n’est pas confirmé, et le verrou retombe', async () => {
    const save: SaveMenu = () => Promise.reject(RepositoryUnavailableError.create());
    const store = await storeAvecMenuAffiche({ saveMenu: save });

    await store.dispatch(saveMenu());

    expect(constat(store)).toEqual(PANNE);
    // Pas d'impasse : le bouton se réarme, un nouvel essai reste possible.
    expect(selectIsSaveInFlight(store.getState())).toBe(false);
  });

  it('un échec franc du dépôt : l’écran dit que l’enregistrement a échoué', async () => {
    const save: SaveMenu = () => Promise.reject(new Error('Boom'));
    const store = await storeAvecMenuAffiche({ saveMenu: save });

    await store.dispatch(saveMenu());

    expect(constat(store)).toEqual(ECHEC);
    expect(selectIsSaveInFlight(store.getState())).toBe(false);
  });

  it('sans menu affiché, aucun enregistrement ne part', async () => {
    let appels = 0;
    const store = createTestStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => twoRecipes(),
      saveMenu: async () => {
        appels += 1;
      },
    });

    await store.dispatch(saveMenu());

    expect(appels).toBe(0);
    expect(constat(store)).toBeNull();

    // TÉMOIN : le MÊME compteur monte dès qu'un menu est à l'écran. Sans lui, un zéro serait
    // tout aussi vrai d'un use-case qu'on aurait oublié de câbler.
    await store.dispatch(generateMenu(7));
    await store.dispatch(saveMenu());
    expect(appels).toBe(1);
  });

  it('un nouvel essai réussi ne laisse aucune trace du constat d’échec', async () => {
    let premier = true;
    const save: SaveMenu = async () => {
      if (premier) {
        premier = false;
        throw new Error('Boom');
      }
    };
    const store = await storeAvecMenuAffiche({ saveMenu: save });

    await store.dispatch(saveMenu());
    expect(constat(store)).toEqual(ECHEC);

    await store.dispatch(saveMenu());

    expect(constat(store)).toEqual(SUCCES);
  });

  /**
   * PREMIÈRE remise à zéro : le départ d'une génération. Le constat parlait du menu affiché, que
   * `pending` vient d'effacer — le garder ferait dire « Menu enregistré » au-dessus d'un menu que
   * personne n'a jamais enregistré.
   *
   * Enregistrement fait par la dépendance PAR DÉFAUT du store de test : c'est le seul scénario
   * qui exerce le câblage du use-case sur son dépôt in-memory.
   */
  it('le départ d’une génération efface le constat d’enregistrement', async () => {
    const store = await storeAvecMenuAffiche();

    await store.dispatch(saveMenu());
    expect(constat(store)).toEqual(SUCCES);

    await store.dispatch(generateMenu(7));

    expect(constat(store)).toBeNull();
  });

  /**
   * Le corollaire de la même règle, sur l'écriture EN VOL. Un thunk RTK n'est pas annulé : le
   * verdict d'un enregistrement parti avant la génération arriverait par-dessus un menu qui n'est
   * plus le sien, et afficherait « Menu enregistré » sur un menu jamais enregistré — un faux
   * signal de succès.
   */
  it('le verdict d’un enregistrement DÉSAVOUÉ par une génération ne dit rien du menu affiché', async () => {
    const enVol = deferred<void>();
    const store = await storeAvecMenuAffiche({ saveMenu: () => enVol.promise });

    const enregistrement = store.dispatch(saveMenu());
    await store.dispatch(generateMenu(7));
    enVol.resolve();
    await enregistrement;

    expect(constat(store)).toBeNull();
  });

  /**
   * Le SYMÉTRIQUE, sur le verdict d'échec — révélé par un mutant survivant (le garde de
   * `saveMenu.rejected` n'était couvert par aucun scénario). Un rejet tardif afficherait
   * « Aucune connexion » sous un menu qu'on n'a jamais tenté d'enregistrer : un constat qui
   * accuse au lieu de rassurer, mais tout aussi faux.
   */
  it('le REJET d’un enregistrement DÉSAVOUÉ par une génération n’accuse pas le menu affiché', async () => {
    const enVol = deferred<void>();
    const store = await storeAvecMenuAffiche({ saveMenu: () => enVol.promise });

    const enregistrement = store.dispatch(saveMenu());
    await store.dispatch(generateMenu(7));
    enVol.reject(RepositoryUnavailableError.create());
    await enregistrement;

    expect(constat(store)).toBeNull();
  });

  /**
   * SECONDE remise à zéro : l'arrivée sur l'écran. Le constat acquitte un GESTE ; celui d'une
   * visite précédente n'acquitte plus rien, et hors ligne il accuserait un réseau peut-être
   * revenu depuis.
   */
  it('l’arrivée sur l’écran efface le constat d’enregistrement', async () => {
    const store = await storeAvecMenuAffiche();

    await store.dispatch(saveMenu());
    expect(constat(store)).toEqual(SUCCES);

    store.dispatch(menuScreenOpened());

    expect(constat(store)).toBeNull();
  });

  /**
   * … mais JAMAIS pendant une écriture en vol. Déverrouiller le bouton à cet instant rendrait un
   * second appui possible sur un enregistrement déjà parti, et le règlement du premier ne serait
   * plus reconnu — l'écran resterait muet sur une écriture pourtant aboutie.
   */
  it('l’arrivée sur l’écran ne déverrouille pas un enregistrement en vol', async () => {
    const enVol = deferred<void>();
    const store = await storeAvecMenuAffiche({ saveMenu: () => enVol.promise });

    const enregistrement = store.dispatch(saveMenu());
    expect(selectIsSaveInFlight(store.getState())).toBe(true);

    store.dispatch(menuScreenOpened());

    expect(selectIsSaveInFlight(store.getState())).toBe(true);
    // Et le verdict, quand il arrive, est toujours reconnu.
    enVol.resolve();
    await enregistrement;
    expect(constat(store)).toEqual(SUCCES);
  });
});
