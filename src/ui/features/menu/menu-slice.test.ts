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
import { ConviveBuilder } from '../../../domain/test-builders/convive.builder';
import { createTestStore } from '../../../test/create-test-store';
import { recipesObserved } from '../catalogue/catalogue-slice';
import { convivesObserved } from '../convives/convives-slice';
import { deferred } from '../../test-utils/deferred';
import {
  generateMenu,
  menuCreationViewOf,
  menuSaveHonored,
  menuErrorMessage,
  menuInitialState,
  menuReducer,
  menuSaveNoticeOf,
  menuCreateScreenOpened,
  menuStartDateSelected,
  menuWindowSelected,
  NO_CONVIVES,
  NO_RECIPES,
  slotRecipeChosen,
  inviteAdded,
  inviteRemoved,
  menuCreationViewWithPresence,
  repasPresenceToggled,
  saveMenu,
  isSaveInFlight,
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
      saveStatus: 'idle',
      latestSaveRequestId: null,
    });
  });

  it('generateMenu réussi passe en success avec le menu et les recettes des deux use cases injectés', async () => {
    const menu = aMenu();
    const recipes = twoRecipes();
    const generate: GenerateMenu = async () => menu;
    const list: ListRecipes = async () => recipes;
    const store = createTestStore({ generateMenu: generate, listRecipes: list });

    store.dispatch(menuWindowSelected(7));

    await store.dispatch(generateMenu(5));

    expect(selectMenu(store.getState())).toEqual({
      status: 'success',
      menu,
      recipes,
      error: null,
      selectedDays: 7,
      startDate: LUNDI_24_AOUT,
      startDateFloor: LUNDI_24_AOUT,
      startDateRefused: false,
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
    await store.dispatch(generateMenu(7));

    expect(selectMenu(store.getState())).toEqual({
      status: 'error',
      menu: null,
      recipes: null,
      error: 'Boom firestore',
      selectedDays: 7,
      startDate: LUNDI_24_AOUT,
      startDateFloor: LUNDI_24_AOUT,
      startDateRefused: false,
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

    store.dispatch(menuWindowSelected(7));

    await store.dispatch(generateMenu(5));
    expect(selectMenu(store.getState()).menu).not.toBeNull();

    pendingPhase = true;
    store.dispatch(generateMenu(5));

    expect(selectMenu(store.getState())).toEqual({
      status: 'loading',
      menu: null,
      recipes: null,
      error: null,
      selectedDays: 7,
      startDate: LUNDI_24_AOUT,
      startDateFloor: LUNDI_24_AOUT,
      startDateRefused: false,
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

    store.dispatch(menuWindowSelected(7));

    await store.dispatch(generateMenu(7));

    expect(selectMenu(store.getState())).toEqual({
      status: 'error',
      menu: null,
      recipes: null,
      error: 'no-recipes',
      selectedDays: 7,
      startDate: LUNDI_24_AOUT,
      startDateFloor: LUNDI_24_AOUT,
      startDateRefused: false,
      saveStatus: 'idle',
      latestSaveRequestId: null,
    });
    expect(generateCalled).toBe(false);
  });

  it('le dépôt indisponible : la génération bascule l’écran sur le constat, sans message', async () => {
    const store = createTestStore({
      generateMenu: async () => aMenu(),
      listRecipes: () => Promise.reject(RepositoryUnavailableError.create()),
    });

    store.dispatch(menuWindowSelected(7));

    await store.dispatch(generateMenu(7));

    expect(selectMenu(store.getState())).toEqual({
      status: 'unavailable',
      menu: null,
      recipes: null,
      error: null,
      selectedDays: 7,
      startDate: LUNDI_24_AOUT,
      startDateFloor: LUNDI_24_AOUT,
      startDateRefused: false,
      saveStatus: 'idle',
      latestSaveRequestId: null,
    });
  });

  it('après une génération empêchée par le réseau, revenir sur l’écran rend l’offre de générer', async () => {
    const store = createTestStore({
      generateMenu: async () => aMenu(),
      listRecipes: () => Promise.reject(RepositoryUnavailableError.create()),
    });

    store.dispatch(menuWindowSelected(7));
    await store.dispatch(generateMenu(7));
    expect(selectMenu(store.getState()).status).toBe('unavailable');

    await store.dispatch(menuCreateScreenOpened());

    expect(selectMenu(store.getState())).toEqual({
      status: 'idle',
      menu: null,
      recipes: null,
      error: null,
      selectedDays: 7,
      startDate: LUNDI_24_AOUT,
      startDateFloor: MARDI_25_AOUT,
      startDateRefused: false,
      saveStatus: 'idle',
      latestSaveRequestId: null,
    });
  });

  it('l’arrivée sur l’écran conserve le constat de catalogue vide', async () => {
    const store = createTestStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => [],
    });

    await store.dispatch(generateMenu(7));
    expect(selectMenu(store.getState()).error).toBe('no-recipes');

    store.dispatch(menuCreateScreenOpened());

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
      saveStatus: 'saved',
      latestSaveRequestId: 'save-0',
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
      saveStatus: 'saved',
      latestSaveRequestId: 'save-0',
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
      saveStatus: 'saved',
      latestSaveRequestId: 'save-0',
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
      saveStatus: 'idle',
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
      startDate: LUNDI_24_AOUT,
      startDateFloor: LUNDI_24_AOUT,
      startDateRefused: false,
      saveStatus: 'idle',
      latestSaveRequestId: null,
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

  it('une émission du canal met à jour les titres du brouillon, sans toucher au menu ni à la fenêtre choisie', async () => {
    const store = await storeAvecMenuAffiche();
    store.dispatch(menuWindowSelected(7));
    const aJour = [
      RecipeBuilder.aRecipe().withId('r1').withTitle('Tian de légumes').build(),
      RecipeBuilder.aRecipe().withId('r2').withTitle('Blanquette').build(),
    ];

    store.dispatch(recipesObserved(aJour));

    expect(selectMenu(store.getState()).recipes).toEqual(aJour);
    expect(selectMenu(store.getState()).menu).toEqual(aMenu());
    expect(selectMenu(store.getState()).selectedDays).toBe(7);
  });

  it('sans brouillon, une émission du canal ne remplit pas les recettes du menu, là où un brouillon les prend', async () => {
    const sansBrouillon = createTestStore();

    sansBrouillon.dispatch(recipesObserved(twoRecipes()));

    expect(selectMenu(sansBrouillon.getState()).recipes).toBeNull();

    const aJour = [RecipeBuilder.aRecipe().withId('r1').withTitle('Tian de légumes').build()];
    const avecBrouillon = await storeAvecMenuAffiche();
    avecBrouillon.dispatch(recipesObserved(aJour));

    expect(selectMenu(avecBrouillon.getState()).recipes).toEqual(aJour);
  });

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

    expect(isSaveInFlight(selectMenu(store.getState()))).toBe(true);
    expect(constat(store)).toBeNull();

    enVol.resolve();
    await enregistrement;
    expect(isSaveInFlight(selectMenu(store.getState()))).toBe(false);
    expect(constat(store)).toEqual(SUCCES);
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

  it('l’arrivée sur l’écran efface le constat d’enregistrement', async () => {
    const store = await storeAvecMenuAffiche();

    await store.dispatch(saveMenu());
    expect(constat(store)).toEqual(SUCCES);

    store.dispatch(menuCreateScreenOpened());

    expect(constat(store)).toBeNull();
  });

  it('l’arrivée sur l’écran ne déverrouille pas un enregistrement en vol', async () => {
    const enVol = deferred<void>();
    const store = await storeAvecMenuAffiche({ saveMenu: () => enVol.promise });

    const enregistrement = store.dispatch(saveMenu());
    expect(isSaveInFlight(selectMenu(store.getState()))).toBe(true);

    store.dispatch(menuCreateScreenOpened());

    expect(isSaveInFlight(selectMenu(store.getState()))).toBe(true);
    enVol.resolve();
    await enregistrement;
    expect(constat(store)).toEqual(SUCCES);
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

  it('le foyer vide invite à ajouter un convive', () => {
    expect(menuErrorMessage(etatEnErreur(NO_CONVIVES))).toBe(
      "Ajoute d'abord un convive pour générer un menu.",
    );
  });

  it('tout autre échec reste sur le message générique de génération', () => {
    expect(menuErrorMessage(etatEnErreur('Boom firestore'))).toBe('Impossible de générer le menu.');
  });
});

describe('menu slice — ce que la vue de génération montre', () => {
  async function storeAvecBrouillon(overrides?: { listRecipes?: ListRecipes }) {
    const store = createTestStore({
      generateMenu: async () => aMenu(),
      listRecipes: overrides?.listRecipes ?? (async () => twoRecipes()),
    });
    await store.dispatch(generateMenu(7));
    return store;
  }

  function vue(store: ReturnType<typeof createTestStore>) {
    return menuCreationViewOf(selectMenu(store.getState()), []);
  }

  it('un store neuf montre le formulaire, sans constat', () => {
    const store = createTestStore();

    expect(vue(store)).toEqual({ status: 'form', saveNotice: null });
  });

  it('une génération en vol montre le chargement', () => {
    const store = createTestStore({
      generateMenu: () => new Promise<Menu>(() => {}),
      listRecipes: async () => twoRecipes(),
    });

    void store.dispatch(generateMenu(7));

    expect(vue(store).status).toBe('loading');
  });

  it('le menu généré est montré avec ses titres', async () => {
    const store = await storeAvecBrouillon();

    const montree = vue(store);

    expect(montree.status).toBe('draft');
    expect(montree.status === 'draft' && montree.days.map((jour) => jour.label)).toEqual([
      'lundi 24 août',
    ]);
  });

  it('sans brouillon, le dépôt injoignable porte le constat hors ligne', async () => {
    const store = createTestStore({
      generateMenu: async () => aMenu(),
      listRecipes: () => Promise.reject(RepositoryUnavailableError.create()),
    });

    await store.dispatch(generateMenu(7));

    expect(vue(store)).toEqual({
      status: 'unavailable',
      message: 'Aucune connexion — le menu n’a pas pu être chargé.',
    });
  });

  it('sans brouillon, le catalogue vide invite à ajouter des recettes', async () => {
    const store = createTestStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => [],
    });

    await store.dispatch(generateMenu(7));

    expect(vue(store)).toEqual({
      status: 'error',
      message: "Ajoute d'abord des recettes pour générer un menu.",
    });
  });

  it('un foyer reçu et vide refuse la génération, là où le même appel avec un convive rend un brouillon', async () => {
    const store = createTestStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => twoRecipes(),
    });
    store.dispatch(convivesObserved([]));

    await store.dispatch(generateMenu(7));

    expect(vue(store)).toEqual({
      status: 'error',
      message: "Ajoute d'abord un convive pour générer un menu.",
    });

    store.dispatch(convivesObserved([ConviveBuilder.aConvive().build()]));
    await store.dispatch(generateMenu(7));

    expect(vue(store).status).toBe('draft');
  });

  it('un foyer qui n’est pas encore arrivé ne fait refuser aucune génération : on n’affirme pas qu’il est vide sans l’avoir reçu', async () => {
    const store = createTestStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => twoRecipes(),
    });

    await store.dispatch(generateMenu(7));

    expect(vue(store).status).toBe('draft');
  });

  it('le catalogue vide prime sur le foyer vide : l’écran nomme la recette manquante, pas le convive', async () => {
    const store = createTestStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => [],
    });
    store.dispatch(convivesObserved([]));

    await store.dispatch(generateMenu(7));

    expect(vue(store)).toEqual({
      status: 'error',
      message: "Ajoute d'abord des recettes pour générer un menu.",
    });
  });

  it('le verrou d’un enregistrement en vol voyage jusqu’à la vue', async () => {
    const enVol = deferred<void>();
    const store = createTestStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => twoRecipes(),
      saveMenu: () => enVol.promise,
    });
    await store.dispatch(generateMenu(7));
    const montreeAvant = vue(store);
    expect(montreeAvant.status === 'draft' && montreeAvant.saveDisabled).toBe(false);

    void store.dispatch(saveMenu());

    const montree = vue(store);
    expect(montree.status === 'draft' && montree.saveDisabled).toBe(true);
  });
});

describe('menu slice — le sort du brouillon enregistré', () => {
  async function storeAvecBrouillon(overrides?: { saveMenu?: SaveMenu }) {
    const store = createTestStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => twoRecipes(),
      ...overrides,
    });
    await store.dispatch(generateMenu(7));
    return store;
  }

  it('un enregistrement honoré rend le menu enregistré et efface le brouillon', async () => {
    const store = await storeAvecBrouillon();

    const issue = await store.dispatch(saveMenu());

    expect(issue.payload).toEqual(aMenu());
    expect(menuSaveHonored(issue)).toBe(true);
    expect(selectMenu(store.getState()).menu).toBeNull();
    expect(selectMenu(store.getState()).recipes).toBeNull();
    expect(menuCreationViewOf(selectMenu(store.getState()), []).status).toBe('form');
  });

  it('un enregistrement DÉSAVOUÉ par une génération ne rend aucun menu et laisse le brouillon', async () => {
    const enVol = deferred<void>();
    const store = await storeAvecBrouillon({ saveMenu: () => enVol.promise });

    const enregistrement = store.dispatch(saveMenu());
    await store.dispatch(generateMenu(7));
    enVol.resolve();
    const issue = await enregistrement;

    expect(issue.payload).toBeNull();
    expect(menuSaveHonored(issue)).toBe(false);
    expect(selectMenu(store.getState()).menu).toEqual(aMenu());
    expect(menuCreationViewOf(selectMenu(store.getState()), []).status).toBe('draft');
  });
});

describe('menu slice — choisir soi-même la recette d’un créneau', () => {
  async function storeAvecBrouillon() {
    const store = createTestStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => twoRecipes(),
    });
    await store.dispatch(generateMenu(7));
    return store;
  }

  function recettesDuBrouillon(store: ReturnType<typeof createTestStore>) {
    const menu = selectMenu(store.getState()).menu as Menu;
    return menu.repas.flatMap((repas) => repas.slots.map((slot) => slot.recipeId));
  }

  it('porte la recette choisie au créneau visé, et laisse les autres créneaux intacts', async () => {
    const store = await storeAvecBrouillon();
    expect(recettesDuBrouillon(store)).toEqual(['r1', 'r2']);

    store.dispatch(slotRecipeChosen({ address: { repasIndex: 1, slotIndex: 0 }, recipeId: 'r3' }));

    expect(recettesDuBrouillon(store)).toEqual(['r1', 'r3']);
  });

  it('accepte une recette déjà servie ailleurs dans la fenêtre', async () => {
    const store = await storeAvecBrouillon();

    store.dispatch(slotRecipeChosen({ address: { repasIndex: 1, slotIndex: 0 }, recipeId: 'r1' }));

    expect(recettesDuBrouillon(store)).toEqual(['r1', 'r1']);
  });

  it('laisse la date de début du brouillon inchangée', async () => {
    const store = await storeAvecBrouillon();

    store.dispatch(slotRecipeChosen({ address: { repasIndex: 0, slotIndex: 0 }, recipeId: 'r2' }));

    expect((selectMenu(store.getState()).menu as Menu).dateDebut).toEqual(LUNDI_24_AOUT);
  });

  it('ouvre, sur chaque ligne du brouillon, le choix d’une recette pour son créneau', async () => {
    const store = await storeAvecBrouillon();

    const montree = menuCreationViewOf(selectMenu(store.getState()), []);

    expect(
      montree.status === 'draft' &&
        montree.days.flatMap((jour) => jour.slots.map((slot) => slot.choose?.href)),
    ).toEqual(['/menu/nouveau/choisir/0/0', '/menu/nouveau/choisir/1/0']);
  });
});

describe('menu slice — choisir qui mange à un créneau du brouillon', () => {
  const AURELIE = ConviveBuilder.aConvive().withId('c-au').withName('Aurélie').build();
  const LIONEL = ConviveBuilder.aConvive().withId('c-li').withName('Lionel').build();

  async function storeAvecBrouillon() {
    const store = createTestStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => twoRecipes(),
    });
    await store.dispatch(generateMenu(7));
    store.dispatch(convivesObserved([AURELIE, LIONEL]));
    return store;
  }

  function repasDuBrouillon(store: ReturnType<typeof createTestStore>) {
    const menu = selectMenu(store.getState()).menu as Menu;
    return menu.repas.map((repas) => [repas.presents, repas.invites]);
  }

  function vue(store: ReturnType<typeof createTestStore>) {
    return menuCreationViewWithPresence(
      selectMenu(store.getState()),
      store.getState().convives.convives,
    );
  }

  it('bascule le convive visé hors du repas visé, et laisse l’autre repas dire que tout le foyer y mange', async () => {
    const store = await storeAvecBrouillon();
    expect(repasDuBrouillon(store)).toEqual([
      [null, 0],
      [null, 0],
    ]);

    store.dispatch(repasPresenceToggled({ repasIndex: 1, conviveId: 'c-au' }));

    expect(repasDuBrouillon(store)).toEqual([
      [null, 0],
      [['c-li'], 0],
    ]);
  });

  it('rebasculé, le convive remange au repas qu’il avait quitté', async () => {
    const store = await storeAvecBrouillon();

    store.dispatch(repasPresenceToggled({ repasIndex: 0, conviveId: 'c-au' }));
    store.dispatch(repasPresenceToggled({ repasIndex: 0, conviveId: 'c-au' }));

    expect(repasDuBrouillon(store).at(0)?.at(0)).toEqual(['c-li', 'c-au']);
  });

  it('compte un invité de plus, puis un de moins, sur le seul repas visé', async () => {
    const store = await storeAvecBrouillon();

    store.dispatch(inviteAdded(1));
    store.dispatch(inviteAdded(1));
    expect(repasDuBrouillon(store)).toEqual([
      [null, 0],
      [null, 2],
    ]);

    store.dispatch(inviteRemoved(1));
    expect(repasDuBrouillon(store)).toEqual([
      [null, 0],
      [null, 1],
    ]);
  });

  it('deux changements successifs sur le même repas s’empilent, le second lisant bien le premier', async () => {
    const store = await storeAvecBrouillon();

    store.dispatch(repasPresenceToggled({ repasIndex: 0, conviveId: 'c-li' }));
    store.dispatch(inviteAdded(0));

    expect(repasDuBrouillon(store).at(0)).toEqual([['c-au'], 1]);
  });

  it('laisse intactes la date de début et les recettes du brouillon', async () => {
    const store = await storeAvecBrouillon();

    store.dispatch(repasPresenceToggled({ repasIndex: 0, conviveId: 'c-au' }));
    store.dispatch(inviteAdded(0));

    const menu = selectMenu(store.getState()).menu as Menu;
    expect(menu.dateDebut).toEqual(LUNDI_24_AOUT);
    expect(menu.repas.flatMap((repas) => repas.slots.map((slot) => slot.recipeId))).toEqual([
      'r1',
      'r2',
    ]);
  });

  it('la vue du brouillon porte sur chaque ligne la présence de son repas, là où la vue sans brouillon n’en porte aucune', async () => {
    const store = await storeAvecBrouillon();
    const avantGeneration = menuCreationViewWithPresence(
      menuInitialState(LUNDI_24_AOUT, LUNDI_24_AOUT),
      [AURELIE, LIONEL],
    );
    expect(avantGeneration.status).toBe('form');

    store.dispatch(repasPresenceToggled({ repasIndex: 0, conviveId: 'c-au' }));
    const montree = vue(store);

    expect(
      montree.status === 'draft' &&
        montree.days.flatMap((jour) =>
          jour.slots.map((slot) => slot.presence?.chips.map((chip) => chip.present)),
        ),
    ).toEqual([
      [false, true],
      [true, true],
    ]);
  });

  it('la vue du brouillon porte le compteur d’invités de chaque repas', async () => {
    const store = await storeAvecBrouillon();

    store.dispatch(inviteAdded(1));
    const montree = vue(store);

    expect(
      montree.status === 'draft' &&
        montree.days.flatMap((jour) => jour.slots.map((slot) => slot.presence?.invitesLabel)),
    ).toEqual(['0 invité', '1 invité']);
  });
});
