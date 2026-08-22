import { describe, it, expect } from 'vitest';

import { createCalendarDate, type CalendarDate } from '../../../domain/entities/calendar-date';
import { createMenu, type Menu } from '../../../domain/entities/menu';
import { createRepas } from '../../../domain/entities/repas';
import { createSlot } from '../../../domain/entities/slot';
import { type Recipe } from '../../../domain/entities/recipe';
import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { type BrowseMenus, type MenuNavigation } from '../../../domain/use-cases/browse-menus';
import { type GenerateMenu } from '../../../domain/use-cases/generate-menu';
import { type ListRecipes } from '../../../domain/use-cases/list-recipes';
import { type SaveMenu } from '../../../domain/use-cases/save-menu';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../store/create-test-store';
import { deferred } from '../../test-utils/deferred';
import {
  generateMenu,
  loadSavedMenus,
  menuConsultationOf,
  menuErrorMessage,
  menuInitialState,
  menuReducer,
  menuSaveNoticeOf,
  menuScreenOpened,
  menuStartDateSelected,
  menuWindowSelected,
  newMenuRequested,
  nextMenuSelected,
  NO_RECIPES,
  previousMenuSelected,
  refreshMenuRecipes,
  SAVED_MENUS_UNREADABLE,
  saveMenu,
  selectIsSaveInFlight,
  selectMenu,
  selectStartDateIso,
  type MenuState,
} from './menu-slice';

const LUNDI_24_AOUT = createCalendarDate({ year: 2026, month: 8, day: 24 });

const MARDI_25_AOUT = createCalendarDate({ year: 2026, month: 8, day: 25 });

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
      startDate: LUNDI_24_AOUT,
      startDateFloor: LUNDI_24_AOUT,
      startDateRefused: false,
      latestRecipesRequestId: null,
      saveStatus: 'idle',
      latestSaveRequestId: null,
      mode: 'consultation',
      menus: [],
      index: null,
    });
  });

  it('generateMenu réussi passe en success avec le menu et les recettes des deux use cases injectés', async () => {
    const menu = aMenu();
    const recipes = twoRecipes();
    const generate: GenerateMenu = async () => menu;
    const list: ListRecipes = async () => recipes;
    const store = createTestStore({ generateMenu: generate, listRecipes: list });

    store.dispatch(menuWindowSelected(7));

    const generated = await store.dispatch(generateMenu(5));

    expect(selectMenu(store.getState())).toEqual({
      status: 'success',
      menu,
      recipes,
      error: null,
      selectedDays: 7,
      startDate: LUNDI_24_AOUT,
      startDateFloor: LUNDI_24_AOUT,
      startDateRefused: false,
      latestRecipesRequestId: generated.meta.requestId,
      saveStatus: 'idle',
      latestSaveRequestId: null,
      mode: 'consultation',
      menus: [],
      index: null,
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

    store.dispatch(menuWindowSelected(7));

    await store.dispatch(generateMenu(7));
    expect(selectMenu(store.getState()).menu).not.toBeNull();

    failPhase = true;
    const failed = await store.dispatch(generateMenu(7));

    expect(selectMenu(store.getState())).toEqual({
      status: 'error',
      menu: null,
      recipes: null,
      error: 'Boom firestore',
      selectedDays: 7,
      startDate: LUNDI_24_AOUT,
      startDateFloor: LUNDI_24_AOUT,
      startDateRefused: false,
      latestRecipesRequestId: failed.meta.requestId,
      saveStatus: 'idle',
      latestSaveRequestId: null,
      mode: 'consultation',
      menus: [],
      index: null,
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

    store.dispatch(menuWindowSelected(7));

    await store.dispatch(generateMenu(5));
    expect(selectMenu(store.getState()).menu).not.toBeNull();

    pendingPhase = true;
    const inFlight = store.dispatch(generateMenu(5));

    expect(selectMenu(store.getState())).toEqual({
      status: 'loading',
      menu: null,
      recipes: null,
      error: null,
      selectedDays: 7,
      startDate: LUNDI_24_AOUT,
      startDateFloor: LUNDI_24_AOUT,
      startDateRefused: false,
      latestRecipesRequestId: inFlight.requestId,
      saveStatus: 'idle',
      latestSaveRequestId: null,
      mode: 'consultation',
      menus: [],
      index: null,
    });
  });

  it('catalogue vide : rejette avec le discriminant « no-recipes » sans appeler la génération', async () => {
    let generateCalled = false;
    const generate: GenerateMenu = async () => {
      generateCalled = true;
      return aMenu();
    };
    const store = createTestStore({ generateMenu: generate, listRecipes: async () => [] });

    store.dispatch(menuWindowSelected(7));

    const refused = await store.dispatch(generateMenu(7));

    expect(selectMenu(store.getState())).toEqual({
      status: 'error',
      menu: null,
      recipes: null,
      error: 'no-recipes',
      selectedDays: 7,
      startDate: LUNDI_24_AOUT,
      startDateFloor: LUNDI_24_AOUT,
      startDateRefused: false,
      latestRecipesRequestId: refused.meta.requestId,
      saveStatus: 'idle',
      latestSaveRequestId: null,
      mode: 'consultation',
      menus: [],
      index: null,
    });
    expect(generateCalled).toBe(false);
  });

  it('le dépôt indisponible : la génération bascule l’écran sur le constat, sans message', async () => {
    const store = createTestStore({
      generateMenu: async () => aMenu(),
      listRecipes: () => Promise.reject(RepositoryUnavailableError.create()),
    });

    store.dispatch(menuWindowSelected(7));

    const refuse = await store.dispatch(generateMenu(7));

    expect(selectMenu(store.getState())).toEqual({
      status: 'unavailable',
      menu: null,
      recipes: null,
      error: null,
      selectedDays: 7,
      startDate: LUNDI_24_AOUT,
      startDateFloor: LUNDI_24_AOUT,
      startDateRefused: false,
      latestRecipesRequestId: refuse.meta.requestId,
      saveStatus: 'idle',
      latestSaveRequestId: null,
      mode: 'consultation',
      menus: [],
      index: null,
    });
  });

  it('après une génération empêchée par le réseau, revenir sur l’écran rend l’offre de générer', async () => {
    const store = createTestStore({
      generateMenu: async () => aMenu(),
      listRecipes: () => Promise.reject(RepositoryUnavailableError.create()),
    });

    store.dispatch(menuWindowSelected(7));
    const refuse = await store.dispatch(generateMenu(7));
    expect(selectMenu(store.getState()).status).toBe('unavailable');

    await store.dispatch(menuScreenOpened());

    expect(selectMenu(store.getState())).toEqual({
      status: 'idle',
      menu: null,
      recipes: null,
      error: null,
      selectedDays: 7,
      startDate: LUNDI_24_AOUT,
      startDateFloor: MARDI_25_AOUT,
      startDateRefused: false,
      latestRecipesRequestId: refuse.meta.requestId,
      saveStatus: 'idle',
      latestSaveRequestId: null,
      mode: 'consultation',
      menus: [],
      index: null,
    });
  });

  it('l’arrivée sur l’écran ne lève pas le constat quand un menu attend sa relecture', async () => {
    let failPhase = false;
    const store = createTestStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => {
        if (failPhase) throw RepositoryUnavailableError.create();
        return twoRecipes();
      },
    });

    await store.dispatch(generateMenu(7));
    failPhase = true;
    await store.dispatch(refreshMenuRecipes());
    expect(selectMenu(store.getState()).status).toBe('unavailable');
    expect(selectMenu(store.getState()).menu).not.toBeNull();

    store.dispatch(menuScreenOpened());

    expect(selectMenu(store.getState()).status).toBe('unavailable');
  });

  it('l’arrivée sur l’écran conserve le constat de catalogue vide', async () => {
    const store = createTestStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => [],
    });

    await store.dispatch(generateMenu(7));
    expect(selectMenu(store.getState()).error).toBe('no-recipes');

    store.dispatch(menuScreenOpened());

    expect(selectMenu(store.getState()).status).toBe('error');
    expect(selectMenu(store.getState()).error).toBe('no-recipes');
  });

  it('generateMenu réussi depuis un état en erreur efface l’erreur périmée', () => {
    const menu = aMenu();
    const recipes = twoRecipes();
    const errored: MenuState = {
      status: 'error',
      menu: null,
      recipes: null,
      error: 'Impossible de générer un menu sans recette',
      selectedDays: 7,
      startDate: MERCREDI_2_SEPT,
      startDateFloor: LUNDI_24_AOUT,
      startDateRefused: true,
      latestRecipesRequestId: 'req-0',
      saveStatus: 'saved',
      latestSaveRequestId: 'save-0',
      mode: 'generation',
      menus: [aMenu()],
      index: 0,
    };

    const next = menuReducer(errored, generateMenu.fulfilled({ menu, recipes }, 'req-1', 7));

    expect(next).toEqual({
      status: 'success',
      menu,
      recipes,
      error: null,
      selectedDays: 7,
      startDate: MERCREDI_2_SEPT,
      startDateFloor: LUNDI_24_AOUT,
      startDateRefused: true,
      latestRecipesRequestId: 'req-0',
      saveStatus: 'saved',
      latestSaveRequestId: 'save-0',
      mode: 'generation',
      menus: [aMenu()],
      index: 0,
    });
  });

  it('une régénération (generateMenu.pending) efface l’erreur périmée, le menu et les recettes', () => {
    const dirty: MenuState = {
      status: 'error',
      menu: aMenu(),
      recipes: twoRecipes(),
      error: 'Impossible de générer un menu sans recette',
      selectedDays: 7,
      startDate: MERCREDI_2_SEPT,
      startDateFloor: LUNDI_24_AOUT,
      startDateRefused: true,
      latestRecipesRequestId: 'req-0',
      saveStatus: 'saved',
      latestSaveRequestId: 'save-0',
      mode: 'generation',
      menus: [aMenu()],
      index: 0,
    };

    const next = menuReducer(dirty, generateMenu.pending('req-1', 7));

    expect(next).toEqual({
      status: 'loading',
      menu: null,
      recipes: null,
      error: null,
      selectedDays: 7,
      startDate: MERCREDI_2_SEPT,
      startDateFloor: LUNDI_24_AOUT,
      startDateRefused: false,
      latestRecipesRequestId: 'req-1',
      saveStatus: 'idle',
      latestSaveRequestId: null,
      mode: 'generation',
      menus: [aMenu()],
      index: 0,
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
      startDate: LUNDI_24_AOUT,
      startDateFloor: LUNDI_24_AOUT,
      startDateRefused: false,
      latestRecipesRequestId: inFlight.requestId,
      saveStatus: 'idle',
      latestSaveRequestId: null,
      mode: 'consultation',
      menus: [],
      index: null,
    });

    resolveGenerate(menu);
    await inFlight;

    expect(selectMenu(store.getState())).toEqual({
      status: 'success',
      menu,
      recipes,
      error: null,
      selectedDays: 7,
      startDate: LUNDI_24_AOUT,
      startDateFloor: LUNDI_24_AOUT,
      startDateRefused: false,
      latestRecipesRequestId: inFlight.requestId,
      saveStatus: 'idle',
      latestSaveRequestId: null,
      mode: 'consultation',
      menus: [],
      index: null,
    });
  });
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

    store.dispatch(menuWindowSelected(7));
    await store.dispatch(generateMenu(7));

    catalogue = [
      RecipeBuilder.aRecipe().withId('r1').withTitle('Tian de légumes').build(),
      RecipeBuilder.aRecipe().withId('r2').withTitle('Blanquette').build(),
    ];

    const refreshed = await store.dispatch(refreshMenuRecipes());

    expect(generations).toBe(1);
    expect(selectMenu(store.getState())).toEqual({
      status: 'success',
      menu,
      recipes: catalogue,
      error: null,
      selectedDays: 7,
      startDate: LUNDI_24_AOUT,
      startDateFloor: LUNDI_24_AOUT,
      startDateRefused: false,
      latestRecipesRequestId: refreshed.meta.requestId,
      saveStatus: 'idle',
      latestSaveRequestId: null,
      mode: 'consultation',
      menus: [],
      index: null,
    });
  });

  it('une relecture échouée bascule l’écran sur le constat, sans effacer le menu du store', async () => {
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
        if (failPhase) throw RepositoryUnavailableError.create();
        return recipes;
      },
    });

    store.dispatch(menuWindowSelected(7));
    await store.dispatch(generateMenu(7));

    failPhase = true;
    const result = await store.dispatch(refreshMenuRecipes());

    expect(lectures).toBe(2);
    expect(refreshMenuRecipes.rejected.match(result)).toBe(true);
    expect(generations).toBe(1);
    expect(selectMenu(store.getState())).toEqual({
      status: 'unavailable',
      menu,
      recipes,
      error: null,
      selectedDays: 7,
      startDate: LUNDI_24_AOUT,
      startDateFloor: LUNDI_24_AOUT,
      startDateRefused: false,
      latestRecipesRequestId: result.meta.requestId,
      saveStatus: 'idle',
      latestSaveRequestId: null,
      mode: 'consultation',
      menus: [],
      index: null,
    });
  });

  it('une relecture REFUSÉE par le dépôt bascule l’écran sur l’échec, pas sur le constat hors ligne', async () => {
    const menu = aMenu();
    const recipes = twoRecipes();
    let failPhase = false;
    let lectures = 0;
    const store = createTestStore({
      generateMenu: async () => menu,
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

    expect(lectures).toBe(2);
    expect(refreshMenuRecipes.rejected.match(result)).toBe(true);
    expect(selectMenu(store.getState())).toEqual({
      status: 'error',
      menu,
      recipes,
      error: null,
      selectedDays: 7,
      startDate: LUNDI_24_AOUT,
      startDateFloor: LUNDI_24_AOUT,
      startDateRefused: false,
      latestRecipesRequestId: result.meta.requestId,
      saveStatus: 'idle',
      latestSaveRequestId: null,
      mode: 'consultation',
      menus: [],
      index: null,
    });
  });

  it('après le constat, une relecture qui aboutit remet le menu à l’écran, titres à jour', async () => {
    const menu = aMenu();
    let catalogue = twoRecipes();
    let failPhase = false;
    const store = createTestStore({
      generateMenu: async () => menu,
      listRecipes: async () => {
        if (failPhase) throw RepositoryUnavailableError.create();
        return catalogue;
      },
    });

    store.dispatch(menuWindowSelected(7));
    await store.dispatch(generateMenu(7));

    failPhase = true;
    await store.dispatch(refreshMenuRecipes());
    expect(selectMenu(store.getState()).status).toBe('unavailable');

    failPhase = false;
    catalogue = [
      RecipeBuilder.aRecipe().withId('r1').withTitle('Tian de légumes').build(),
      RecipeBuilder.aRecipe().withId('r2').withTitle('Blanquette').build(),
    ];
    const revenue = await store.dispatch(refreshMenuRecipes());

    expect(selectMenu(store.getState())).toEqual({
      status: 'success',
      menu,
      recipes: catalogue,
      error: null,
      selectedDays: 7,
      startDate: LUNDI_24_AOUT,
      startDateFloor: LUNDI_24_AOUT,
      startDateRefused: false,
      latestRecipesRequestId: revenue.meta.requestId,
      saveStatus: 'idle',
      latestSaveRequestId: null,
      mode: 'consultation',
      menus: [],
      index: null,
    });
  });

  it('le rejet tardif d’une relecture abandonnée ne bascule pas l’écran sur le constat', async () => {
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

    store.dispatch(menuWindowSelected(7));
    await store.dispatch(generateMenu(7));

    const abandonnee = store.dispatch(refreshMenuRecipes());
    const courante = store.dispatch(refreshMenuRecipes());
    await courante;
    lente.reject(RepositoryUnavailableError.create());
    await abandonnee;

    expect(selectMenu(store.getState())).toEqual({
      status: 'success',
      menu,
      recipes: aJour,
      error: null,
      selectedDays: 7,
      startDate: LUNDI_24_AOUT,
      startDateFloor: LUNDI_24_AOUT,
      startDateRefused: false,
      latestRecipesRequestId: courante.requestId,
      saveStatus: 'idle',
      latestSaveRequestId: null,
      mode: 'consultation',
      menus: [],
      index: null,
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
      startDate: LUNDI_24_AOUT,
      startDateFloor: LUNDI_24_AOUT,
      startDateRefused: false,
      latestRecipesRequestId: null,
      saveStatus: 'idle',
      latestSaveRequestId: null,
      mode: 'consultation',
      menus: [],
      index: null,
    });
  });
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

    store.dispatch(menuWindowSelected(7));
    await store.dispatch(generateMenu(7));

    const abandonnee = store.dispatch(refreshMenuRecipes());
    const courante = store.dispatch(refreshMenuRecipes());
    await courante;
    lente.resolve(ancien);
    await abandonnee;

    expect(selectMenu(store.getState())).toEqual({
      status: 'success',
      menu,
      recipes: aJour,
      error: null,
      selectedDays: 7,
      startDate: LUNDI_24_AOUT,
      startDateFloor: LUNDI_24_AOUT,
      startDateRefused: false,
      latestRecipesRequestId: courante.requestId,
      saveStatus: 'idle',
      latestSaveRequestId: null,
      mode: 'consultation',
      menus: [],
      index: null,
    });
  });

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
      startDate: LUNDI_24_AOUT,
      startDateFloor: LUNDI_24_AOUT,
      startDateRefused: false,
      latestRecipesRequestId: regeneration.meta.requestId,
      saveStatus: 'idle',
      latestSaveRequestId: null,
      mode: 'consultation',
      menus: [],
      index: null,
    });
  });
});

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

describe('menu slice — plancher de la date de début', () => {
  const MERCREDI_2_SEPT = '2026-09-02';

  it('une date de début ANTÉRIEURE à aujourd’hui est refusée : la préférence précédente reste', () => {
    const store = createTestStore();
    store.dispatch(menuStartDateSelected(MERCREDI_2_SEPT));

    store.dispatch(menuStartDateSelected('2026-08-20'));

    expect(selectMenu(store.getState()).startDate).toEqual({ year: 2026, month: 9, day: 2 });
    expect(selectMenu(store.getState()).startDateRefused).toBe(true);
  });

  it('une date de début ÉGALE à aujourd’hui est acceptée', () => {
    const store = createTestStore();

    store.dispatch(menuStartDateSelected('2026-08-25'));

    expect(selectMenu(store.getState()).startDate).toEqual({ year: 2026, month: 8, day: 25 });
    expect(selectMenu(store.getState()).startDateRefused).toBe(false);
  });

  it('relit l’horloge à CHAQUE choix : un jour accepté aujourd’hui est refusé plus tard', () => {
    const store = createTestStore();
    const LE_26_AOUT = '2026-08-26';

    store.dispatch(menuStartDateSelected(LE_26_AOUT));
    expect(selectMenu(store.getState()).startDate).toEqual({ year: 2026, month: 8, day: 26 });
    expect(selectMenu(store.getState()).startDateRefused).toBe(false);

    store.dispatch(menuStartDateSelected(MERCREDI_2_SEPT));

    store.dispatch(menuStartDateSelected(LE_26_AOUT));

    expect(selectMenu(store.getState()).startDate).toEqual({ year: 2026, month: 9, day: 2 });
    expect(selectMenu(store.getState()).startDateRefused).toBe(true);
  });

  it('choisir une date recevable efface le constat de refus', () => {
    const store = createTestStore();
    store.dispatch(menuStartDateSelected('2026-08-20'));
    expect(selectMenu(store.getState()).startDateRefused).toBe(true);

    store.dispatch(menuStartDateSelected(MERCREDI_2_SEPT));

    expect(selectMenu(store.getState()).startDate).toEqual({ year: 2026, month: 9, day: 2 });
    expect(selectMenu(store.getState()).startDateRefused).toBe(false);
  });

  it('le champ effacé ne pose PAS le constat de refus', () => {
    const store = createTestStore();

    store.dispatch(menuStartDateSelected(''));

    expect(selectMenu(store.getState()).startDateRefused).toBe(false);
    expect(selectMenu(store.getState()).startDate).toEqual({ year: 2026, month: 8, day: 24 });
  });

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

describe('menu slice — enregistrement du menu', () => {
  const SUCCES = { tone: 'success', message: 'Menu enregistré' };
  const PANNE = {
    tone: 'unconfirmed',
    message: 'Aucune connexion — l’enregistrement du menu n’a pas pu être confirmé.',
  };
  const ECHEC = { tone: 'error', message: 'Impossible d’enregistrer le menu.' };

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

    expect(menusRecus).toEqual([aMenu()]);
    expect(constat(store)).toEqual(SUCCES);
  });

  it('pendant l’enregistrement, le verrou est armé et l’écran ne constate rien encore ; au règlement, le verrou se lève et le constat paraît', async () => {
    const enVol = deferred<void>();
    const store = await storeAvecMenuAffiche({ saveMenu: () => enVol.promise });

    const enregistrement = store.dispatch(saveMenu());

    expect(selectIsSaveInFlight(store.getState())).toBe(true);
    expect(constat(store)).toBeNull();

    enVol.resolve();
    await enregistrement;
    expect(selectIsSaveInFlight(store.getState())).toBe(false);
    expect(constat(store)).toEqual(SUCCES);
  });

  it('le dépôt indisponible : l’enregistrement n’est pas confirmé, et le verrou retombe', async () => {
    const save: SaveMenu = () => Promise.reject(RepositoryUnavailableError.create());
    const store = await storeAvecMenuAffiche({ saveMenu: save });

    await store.dispatch(saveMenu());

    expect(constat(store)).toEqual(PANNE);
    expect(selectIsSaveInFlight(store.getState())).toBe(false);
  });

  it('un échec franc du dépôt : l’écran dit que l’enregistrement a échoué', async () => {
    const save: SaveMenu = () => Promise.reject(new Error('Boom'));
    const store = await storeAvecMenuAffiche({ saveMenu: save });

    await store.dispatch(saveMenu());

    expect(constat(store)).toEqual(ECHEC);
    expect(selectIsSaveInFlight(store.getState())).toBe(false);
  });

  it('sans menu affiché, aucun enregistrement ne part — et il part dès qu’un menu est à l’écran', async () => {
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

  it('le départ d’une génération efface le constat d’enregistrement', async () => {
    const store = await storeAvecMenuAffiche();

    await store.dispatch(saveMenu());
    expect(constat(store)).toEqual(SUCCES);

    await store.dispatch(generateMenu(7));

    expect(constat(store)).toBeNull();
  });

  it('le verdict d’un enregistrement DÉSAVOUÉ par une génération ne dit rien du menu affiché', async () => {
    const enVol = deferred<void>();
    const store = await storeAvecMenuAffiche({ saveMenu: () => enVol.promise });

    const enregistrement = store.dispatch(saveMenu());
    await store.dispatch(generateMenu(7));
    enVol.resolve();
    await enregistrement;

    expect(constat(store)).toBeNull();
  });

  it('le REJET d’un enregistrement DÉSAVOUÉ par une génération n’accuse pas le menu affiché', async () => {
    const enVol = deferred<void>();
    const store = await storeAvecMenuAffiche({ saveMenu: () => enVol.promise });

    const enregistrement = store.dispatch(saveMenu());
    await store.dispatch(generateMenu(7));
    enVol.reject(RepositoryUnavailableError.create());
    await enregistrement;

    expect(constat(store)).toBeNull();
  });

  it('l’arrivée sur l’écran efface le constat d’enregistrement', async () => {
    const store = await storeAvecMenuAffiche();

    await store.dispatch(saveMenu());
    expect(constat(store)).toEqual(SUCCES);

    store.dispatch(menuScreenOpened());

    expect(constat(store)).toBeNull();
  });

  it('l’arrivée sur l’écran ne déverrouille pas un enregistrement en vol', async () => {
    const enVol = deferred<void>();
    const store = await storeAvecMenuAffiche({ saveMenu: () => enVol.promise });

    const enregistrement = store.dispatch(saveMenu());
    expect(selectIsSaveInFlight(store.getState())).toBe(true);

    store.dispatch(menuScreenOpened());

    expect(selectIsSaveInFlight(store.getState())).toBe(true);
    enVol.resolve();
    await enregistrement;
    expect(constat(store)).toEqual(SUCCES);
  });
});

describe('menu slice — consultation des menus enregistrés', () => {
  const LUNDI_31_AOUT = createCalendarDate({ year: 2026, month: 8, day: 31 });
  const LUNDI_7_SEPT = createCalendarDate({ year: 2026, month: 9, day: 7 });

  function menuDeLaSemaine(dateDebut: CalendarDate): Menu {
    return createMenu({
      dateDebut,
      repas: [
        createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] }),
        createRepas({ jour: 6, creneau: 'soir', slots: [createSlot({ recipeId: 'r2' })] }),
      ],
    });
  }

  function browsing(menus: Menu[], indexInitial: number | null): BrowseMenus {
    return async () => ({ menus, indexInitial });
  }

  const TROIS_SEMAINES = [
    menuDeLaSemaine(LUNDI_24_AOUT),
    menuDeLaSemaine(LUNDI_31_AOUT),
    menuDeLaSemaine(LUNDI_7_SEPT),
  ];

  async function storeEnConsultation(menus: Menu[], indexInitial: number | null) {
    const store = createTestStore({
      browseMenus: browsing(menus, indexInitial),
      listRecipes: async () => twoRecipes(),
    });
    await store.dispatch(menuScreenOpened());
    return store;
  }

  function consultation(store: ReturnType<typeof createTestStore>) {
    return menuConsultationOf(selectMenu(store.getState()));
  }

  it('à l’arrivée, la liste des menus enregistrés et le curseur viennent du domaine, sans retri', async () => {
    const store = await storeEnConsultation(TROIS_SEMAINES, 1);

    expect(selectMenu(store.getState()).menus).toEqual(TROIS_SEMAINES);
    expect(selectMenu(store.getState()).index).toBe(1);
  });

  it('l’arrivée lit les menus enregistrés PUIS les titres du catalogue', async () => {
    const appels: string[] = [];
    const store = createTestStore({
      browseMenus: async () => {
        appels.push('menus');
        return { menus: TROIS_SEMAINES, indexInitial: 1 };
      },
      listRecipes: async () => {
        appels.push('recettes');
        return twoRecipes();
      },
    });

    await store.dispatch(menuScreenOpened());

    expect(appels).toEqual(['menus', 'recettes']);
  });

  it('sans menu enregistré ni menu généré, l’arrivée ne lit pas le catalogue', async () => {
    let lectures = 0;
    const store = createTestStore({
      browseMenus: browsing([], null),
      listRecipes: async () => {
        lectures += 1;
        return twoRecipes();
      },
    });

    await store.dispatch(menuScreenOpened());

    expect(lectures).toBe(0);
  });

  it('l’écran consulte le menu désigné : sa période, ses jours, ses créneaux et ses liens', async () => {
    const store = await storeEnConsultation(TROIS_SEMAINES, 1);

    expect(consultation(store)?.periodLabel).toBe('31 août – 6 sept.');
    expect(consultation(store)?.days.map((jour) => jour.label)).toEqual([
      'lundi 31 août',
      'dimanche 6 septembre',
    ]);
    expect(consultation(store)?.days.at(0)?.slots).toEqual([
      {
        key: '0-midi',
        creneauLabel: 'Midi',
        title: 'Ratatouille',
        recipe: 'known',
        href: '/catalogue/r1?depuis=menu',
      },
    ]);
  });

  it('le curseur recule d’un menu, et avance d’un menu', async () => {
    const store = await storeEnConsultation(TROIS_SEMAINES, 1);

    store.dispatch(previousMenuSelected());
    expect(consultation(store)?.periodLabel).toBe('24 – 30 août');

    store.dispatch(nextMenuSelected());
    expect(consultation(store)?.periodLabel).toBe('31 août – 6 sept.');

    store.dispatch(nextMenuSelected());
    expect(consultation(store)?.periodLabel).toBe('7 – 13 sept.');
  });

  it('sur le plus ancien, seule la flèche de gauche est verrouillée', async () => {
    const store = await storeEnConsultation(TROIS_SEMAINES, 0);

    expect(consultation(store)?.previousDisabled).toBe(true);
    expect(consultation(store)?.nextDisabled).toBe(false);
  });

  it('sur le plus récent, seule la flèche de droite est verrouillée', async () => {
    const store = await storeEnConsultation(TROIS_SEMAINES, 2);

    expect(consultation(store)?.previousDisabled).toBe(false);
    expect(consultation(store)?.nextDisabled).toBe(true);
  });

  it('entre deux menus, aucune flèche n’est verrouillée', async () => {
    const store = await storeEnConsultation(TROIS_SEMAINES, 1);

    expect(consultation(store)?.previousDisabled).toBe(false);
    expect(consultation(store)?.nextDisabled).toBe(false);
  });

  it('un seul menu enregistré verrouille les deux flèches', async () => {
    const store = await storeEnConsultation([menuDeLaSemaine(LUNDI_24_AOUT)], 0);

    expect(consultation(store)?.previousDisabled).toBe(true);
    expect(consultation(store)?.nextDisabled).toBe(true);
  });

  it('aucun menu enregistré : l’écran ne consulte rien, même une fois un menu généré', async () => {
    const store = createTestStore({
      browseMenus: browsing([], null),
      listRecipes: async () => twoRecipes(),
      generateMenu: async () => aMenu(),
    });
    await store.dispatch(menuScreenOpened());

    await store.dispatch(generateMenu(7));

    expect(selectMenu(store.getState()).status).toBe('success');
    expect(selectMenu(store.getState()).mode).toBe('consultation');
    expect(consultation(store)).toBeNull();
  });

  it('tant que les titres ne sont pas lus, l’écran ne consulte rien', async () => {
    const store = createTestStore({
      browseMenus: browsing(TROIS_SEMAINES, 1),
      listRecipes: async () => twoRecipes(),
    });

    await store.dispatch(loadSavedMenus());

    expect(selectMenu(store.getState()).index).toBe(1);
    expect(consultation(store)).toBeNull();
  });

  it('hors ligne, le constat l’emporte sur la consultation', async () => {
    const store = createTestStore({
      browseMenus: browsing(TROIS_SEMAINES, 1),
      listRecipes: () => Promise.reject(RepositoryUnavailableError.create()),
    });

    await store.dispatch(menuScreenOpened());

    expect(selectMenu(store.getState()).status).toBe('unavailable');
    expect(consultation(store)).toBeNull();
  });

  it('une relecture des titres qui échoue ne retire pas de l’écran le menu consulté', async () => {
    let enPanne = false;
    const store = createTestStore({
      browseMenus: browsing(TROIS_SEMAINES, 1),
      listRecipes: async () => {
        if (enPanne) throw new Error('Boom firestore');
        return twoRecipes();
      },
    });
    await store.dispatch(menuScreenOpened());
    expect(consultation(store)).not.toBeNull();

    enPanne = true;
    await store.dispatch(menuScreenOpened());

    expect(selectMenu(store.getState()).status).toBe('error');
    expect(consultation(store)?.periodLabel).toBe('31 août – 6 sept.');
    expect(consultation(store)?.days.at(0)?.slots.at(0)?.title).toBe('Ratatouille');
  });

  it('un dépôt injoignable pendant la relecture des titres ne retire pas de l’écran le menu consulté', async () => {
    let enPanne = false;
    const store = createTestStore({
      browseMenus: browsing(TROIS_SEMAINES, 1),
      listRecipes: async () => {
        if (enPanne) throw RepositoryUnavailableError.create();
        return twoRecipes();
      },
    });
    await store.dispatch(menuScreenOpened());
    expect(consultation(store)).not.toBeNull();

    enPanne = true;
    await store.dispatch(menuScreenOpened());

    expect(selectMenu(store.getState()).status).toBe('unavailable');
    expect(consultation(store)?.periodLabel).toBe('31 août – 6 sept.');
    expect(consultation(store)?.days.at(0)?.slots.at(0)?.title).toBe('Ratatouille');
  });

  it('le curseur déplacé revient au menu désigné par le domaine à chaque arrivée sur l’écran', async () => {
    const store = await storeEnConsultation(TROIS_SEMAINES, 1);
    store.dispatch(previousMenuSelected());
    expect(selectMenu(store.getState()).index).toBe(0);

    await store.dispatch(menuScreenOpened());

    expect(selectMenu(store.getState()).index).toBe(1);
  });

  it('« + Nouveau menu » quitte la consultation pour un formulaire vierge, sans le dernier menu généré', async () => {
    const store = createTestStore({
      browseMenus: browsing(TROIS_SEMAINES, 1),
      listRecipes: async () => twoRecipes(),
      generateMenu: async () => aMenu(),
    });
    await store.dispatch(menuScreenOpened());
    await store.dispatch(generateMenu(7));
    expect(selectMenu(store.getState()).menu).not.toBeNull();

    store.dispatch(newMenuRequested());

    expect(consultation(store)).toBeNull();
    expect(selectMenu(store.getState()).mode).toBe('generation');
    expect(selectMenu(store.getState()).status).toBe('idle');
    expect(selectMenu(store.getState()).menu).toBeNull();
  });

  it('« + Nouveau menu » efface le constat de l’enregistrement précédent', async () => {
    const enregistre = menuDeLaSemaine(LUNDI_24_AOUT);
    const store = createTestStore({
      browseMenus: browsing([enregistre], 0),
      listRecipes: async () => twoRecipes(),
      generateMenu: async () => enregistre,
      saveMenu: async () => {},
    });
    await store.dispatch(generateMenu(7));
    await store.dispatch(saveMenu());
    expect(menuSaveNoticeOf(selectMenu(store.getState()))).not.toBeNull();

    store.dispatch(newMenuRequested());

    expect(menuSaveNoticeOf(selectMenu(store.getState()))).toBeNull();
  });

  it('un enregistrement réussi ramène en consultation, sur le menu enregistré et non sur celui du jour', async () => {
    const duJour = menuDeLaSemaine(LUNDI_24_AOUT);
    const nouveau = menuDeLaSemaine(LUNDI_7_SEPT);
    const store = createTestStore({
      browseMenus: browsing([duJour, nouveau], 0),
      listRecipes: async () => twoRecipes(),
      generateMenu: async () => nouveau,
      saveMenu: async () => {},
    });
    await store.dispatch(generateMenu(7));

    await store.dispatch(saveMenu());

    expect(selectMenu(store.getState()).index).toBe(1);
    expect(consultation(store)?.periodLabel).toBe('7 – 13 sept.');
  });

  it('après l’enregistrement, la consultation porte encore le constat « Menu enregistré »', async () => {
    const enregistre = menuDeLaSemaine(LUNDI_24_AOUT);
    const store = createTestStore({
      browseMenus: browsing([enregistre], 0),
      listRecipes: async () => twoRecipes(),
      generateMenu: async () => enregistre,
      saveMenu: async () => {},
    });
    await store.dispatch(generateMenu(7));

    await store.dispatch(saveMenu());

    expect(consultation(store)?.saveNotice).toEqual({
      tone: 'success',
      message: 'Menu enregistré',
    });
  });

  it('un enregistrement réussi que la relecture ne retrouve pas laisse l’écran sur le générateur', async () => {
    const duJour = menuDeLaSemaine(LUNDI_24_AOUT);
    const nouveau = menuDeLaSemaine(LUNDI_7_SEPT);
    const store = createTestStore({
      browseMenus: browsing([duJour], 0),
      listRecipes: async () => twoRecipes(),
      generateMenu: async () => nouveau,
      saveMenu: async () => {},
    });
    await store.dispatch(menuScreenOpened());
    store.dispatch(newMenuRequested());
    await store.dispatch(generateMenu(7));

    await store.dispatch(saveMenu());

    expect(selectMenu(store.getState()).mode).toBe('generation');
    expect(consultation(store)).toBeNull();
    expect(menuSaveNoticeOf(selectMenu(store.getState()))).toEqual({
      tone: 'success',
      message: 'Menu enregistré',
    });
  });

  it('un enregistrement désavoué par une génération ne ramène pas en consultation', async () => {
    const enregistre = menuDeLaSemaine(LUNDI_24_AOUT);
    const enVol = deferred<void>();
    const store = createTestStore({
      browseMenus: browsing([enregistre], 0),
      listRecipes: async () => twoRecipes(),
      generateMenu: async () => enregistre,
      saveMenu: () => enVol.promise,
    });
    await store.dispatch(menuScreenOpened());
    store.dispatch(newMenuRequested());
    await store.dispatch(generateMenu(7));

    const enregistrement = store.dispatch(saveMenu());
    await store.dispatch(generateMenu(7));
    enVol.resolve();
    await enregistrement;

    expect(selectMenu(store.getState()).mode).toBe('generation');
    expect(consultation(store)).toBeNull();
  });

  it('reculer d’un menu efface le constat de l’enregistrement précédent', async () => {
    const duJour = menuDeLaSemaine(LUNDI_24_AOUT);
    const nouveau = menuDeLaSemaine(LUNDI_7_SEPT);
    const store = createTestStore({
      browseMenus: browsing([duJour, nouveau], 0),
      listRecipes: async () => twoRecipes(),
      generateMenu: async () => nouveau,
      saveMenu: async () => {},
    });
    await store.dispatch(menuScreenOpened());
    store.dispatch(newMenuRequested());
    await store.dispatch(generateMenu(7));
    await store.dispatch(saveMenu());
    expect(consultation(store)?.saveNotice).toEqual({
      tone: 'success',
      message: 'Menu enregistré',
    });

    store.dispatch(previousMenuSelected());

    expect(consultation(store)?.periodLabel).toBe('24 – 30 août');
    expect(consultation(store)?.saveNotice).toBeNull();
  });

  it('avancer d’un menu efface le constat de l’enregistrement précédent', async () => {
    const duJour = menuDeLaSemaine(LUNDI_24_AOUT);
    const nouveau = menuDeLaSemaine(LUNDI_7_SEPT);
    const store = createTestStore({
      browseMenus: browsing([duJour, nouveau], 1),
      listRecipes: async () => twoRecipes(),
      generateMenu: async () => duJour,
      saveMenu: async () => {},
    });
    await store.dispatch(menuScreenOpened());
    store.dispatch(newMenuRequested());
    await store.dispatch(generateMenu(7));
    await store.dispatch(saveMenu());
    expect(consultation(store)?.saveNotice).toEqual({
      tone: 'success',
      message: 'Menu enregistré',
    });

    store.dispatch(nextMenuSelected());

    expect(consultation(store)?.periodLabel).toBe('7 – 13 sept.');
    expect(consultation(store)?.saveNotice).toBeNull();
  });

  it('naviguer pendant un enregistrement EN VOL ne le déverrouille pas, et son verdict paraît au règlement', async () => {
    const duJour = menuDeLaSemaine(LUNDI_24_AOUT);
    const nouveau = menuDeLaSemaine(LUNDI_7_SEPT);
    const enVol = deferred<void>();
    const store = createTestStore({
      browseMenus: browsing([duJour, nouveau], 1),
      listRecipes: async () => twoRecipes(),
      generateMenu: async () => nouveau,
      saveMenu: () => enVol.promise,
    });
    await store.dispatch(menuScreenOpened());
    store.dispatch(newMenuRequested());
    await store.dispatch(generateMenu(7));

    const enregistrement = store.dispatch(saveMenu());
    store.dispatch(previousMenuSelected());

    expect(selectIsSaveInFlight(store.getState())).toBe(true);

    enVol.resolve();
    await enregistrement;

    expect(menuSaveNoticeOf(selectMenu(store.getState()))).toEqual({
      tone: 'success',
      message: 'Menu enregistré',
    });
  });

  it('à l’arrivée, l’écran charge tant que les menus enregistrés ne sont pas lus', async () => {
    const lente = deferred<MenuNavigation>();
    const store = createTestStore({
      browseMenus: () => lente.promise,
      listRecipes: async () => twoRecipes(),
    });

    const arrivee = store.dispatch(menuScreenOpened());

    expect(selectMenu(store.getState()).status).toBe('loading');
    expect(consultation(store)).toBeNull();

    lente.resolve({ menus: TROIS_SEMAINES, indexInitial: 1 });
    await arrivee;

    expect(selectMenu(store.getState()).status).toBe('success');
    expect(consultation(store)?.periodLabel).toBe('31 août – 6 sept.');
  });

  it('le chargement couvre aussi la lecture des titres : aucun générateur entre les deux', async () => {
    const store = createTestStore({
      browseMenus: browsing(TROIS_SEMAINES, 1),
      listRecipes: async () => twoRecipes(),
    });

    await store.dispatch(loadSavedMenus());

    expect(selectMenu(store.getState()).status).toBe('loading');
    expect(consultation(store)).toBeNull();
  });

  it('sans aucun menu enregistré, le chargement rend la main au générateur', async () => {
    const store = createTestStore({
      browseMenus: browsing([], null),
      listRecipes: async () => twoRecipes(),
    });

    await store.dispatch(menuScreenOpened());

    expect(selectMenu(store.getState()).status).toBe('idle');
  });

  it('l’arrivée ne recouvre pas d’un chargement le menu déjà à l’écran', async () => {
    const lente = deferred<MenuNavigation>();
    const store = createTestStore({
      browseMenus: () => lente.promise,
      listRecipes: async () => twoRecipes(),
      generateMenu: async () => aMenu(),
    });
    await store.dispatch(generateMenu(7));
    expect(selectMenu(store.getState()).status).toBe('success');

    void store.dispatch(menuScreenOpened());

    expect(selectMenu(store.getState()).status).toBe('success');
  });

  it('l’arrivée relue jusqu’au bout n’efface pas le constat d’un catalogue vide', async () => {
    const store = createTestStore({
      browseMenus: browsing([], null),
      generateMenu: async () => aMenu(),
      listRecipes: async () => [],
    });
    await store.dispatch(generateMenu(7));
    expect(selectMenu(store.getState()).error).toBe(NO_RECIPES);

    await store.dispatch(menuScreenOpened());

    expect(selectMenu(store.getState()).status).toBe('error');
    expect(menuErrorMessage(selectMenu(store.getState()))).toBe(
      "Ajoute d'abord des recettes pour générer un menu.",
    );
  });

  it('les menus enregistrés illisibles : l’écran accuse les menus, pas la génération', async () => {
    const store = createTestStore({
      browseMenus: () => Promise.reject(new Error('Boom firestore')),
    });

    await store.dispatch(menuScreenOpened());

    expect(selectMenu(store.getState()).status).toBe('error');
    expect(menuErrorMessage(selectMenu(store.getState()))).toBe(
      'Impossible de charger tes menus enregistrés.',
    );
  });

  it('le dépôt indisponible à l’arrivée porte le constat hors ligne, sans message d’échec', async () => {
    const store = createTestStore({
      browseMenus: () => Promise.reject(RepositoryUnavailableError.create()),
    });

    await store.dispatch(menuScreenOpened());

    expect(selectMenu(store.getState()).status).toBe('unavailable');
    expect(selectMenu(store.getState()).error).toBeNull();
  });
});

describe('menu slice — ce que l’écran dit quand ça échoue', () => {
  function etatEnErreur(error: string | null): MenuState {
    return { ...menuInitialState(LUNDI_24_AOUT, LUNDI_24_AOUT), status: 'error', error };
  }

  it('le catalogue vide invite à ajouter des recettes', () => {
    expect(menuErrorMessage(etatEnErreur(NO_RECIPES))).toBe(
      "Ajoute d'abord des recettes pour générer un menu.",
    );
  });

  it('les menus enregistrés illisibles nomment les menus enregistrés', () => {
    expect(menuErrorMessage(etatEnErreur(SAVED_MENUS_UNREADABLE))).toBe(
      'Impossible de charger tes menus enregistrés.',
    );
  });

  it('tout autre échec reste sur le message générique de génération', () => {
    expect(menuErrorMessage(etatEnErreur('Boom firestore'))).toBe('Impossible de générer le menu.');
  });
});
