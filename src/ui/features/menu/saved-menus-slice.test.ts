import { describe, it, expect } from 'vitest';

import { createCalendarDate, type CalendarDate } from '../../../domain/entities/calendar-date';
import { createMenu, type Menu } from '../../../domain/entities/menu';
import { createRepas } from '../../../domain/entities/repas';
import { createSlot } from '../../../domain/entities/slot';
import { type Recipe } from '../../../domain/entities/recipe';
import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { type BrowseMenus, type MenuNavigation } from '../../../domain/use-cases/browse-menus';
import { type ListRecipes } from '../../../domain/use-cases/list-recipes';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../store/create-test-store';
import { deferred } from '../../test-utils/deferred';
import { generateMenu, isSaveInFlight, saveMenu, selectMenu } from './menu-slice';
import {
  menuConsultationOf,
  nextMenuSelected,
  previousMenuSelected,
  savedMenusScreenOpened,
  savedMenusScreenOpenedAfterSave,
  savedMenusViewOf,
  selectSavedMenus,
} from './saved-menus-slice';

const LUNDI_24_AOUT = createCalendarDate({ year: 2026, month: 8, day: 24 });

function twoRecipes(): Recipe[] {
  return [
    RecipeBuilder.aRecipe().withId('r1').withTitle('Ratatouille').build(),
    RecipeBuilder.aRecipe().withId('r2').withTitle('Blanquette').build(),
  ];
}

describe('saved menus slice — consultation des menus enregistrés', () => {
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
    await store.dispatch(savedMenusScreenOpened());
    return store;
  }

  function consultation(store: ReturnType<typeof createTestStore>) {
    return menuConsultationOf(selectSavedMenus(store.getState()));
  }

  it('à l’arrivée, la liste des menus enregistrés et le curseur viennent du domaine, sans retri', async () => {
    const store = await storeEnConsultation(TROIS_SEMAINES, 1);

    expect(selectSavedMenus(store.getState()).menus).toEqual(TROIS_SEMAINES);
    expect(selectSavedMenus(store.getState()).index).toBe(1);
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

    await store.dispatch(savedMenusScreenOpened());

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

    await store.dispatch(savedMenusScreenOpened());

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
        key: '0-0',
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

  it('hors ligne, le constat l’emporte sur la consultation', async () => {
    const store = createTestStore({
      browseMenus: browsing(TROIS_SEMAINES, 1),
      listRecipes: () => Promise.reject(RepositoryUnavailableError.create()),
    });

    await store.dispatch(savedMenusScreenOpened());

    expect(selectSavedMenus(store.getState()).status).toBe('unavailable');
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
    await store.dispatch(savedMenusScreenOpened());
    expect(consultation(store)).not.toBeNull();

    enPanne = true;
    await store.dispatch(savedMenusScreenOpened());

    expect(selectSavedMenus(store.getState()).status).toBe('error');
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
    await store.dispatch(savedMenusScreenOpened());
    expect(consultation(store)).not.toBeNull();

    enPanne = true;
    await store.dispatch(savedMenusScreenOpened());

    expect(selectSavedMenus(store.getState()).status).toBe('unavailable');
    expect(consultation(store)?.periodLabel).toBe('31 août – 6 sept.');
    expect(consultation(store)?.days.at(0)?.slots.at(0)?.title).toBe('Ratatouille');
  });

  it('le curseur déplacé revient au menu désigné par le domaine à chaque arrivée sur l’écran', async () => {
    const store = await storeEnConsultation(TROIS_SEMAINES, 1);
    store.dispatch(previousMenuSelected());
    expect(selectSavedMenus(store.getState()).index).toBe(0);

    await store.dispatch(savedMenusScreenOpened());

    expect(selectSavedMenus(store.getState()).index).toBe(1);
  });

  it('à l’arrivée, l’écran charge tant que les menus enregistrés ne sont pas lus', async () => {
    const lente = deferred<MenuNavigation>();
    const store = createTestStore({
      browseMenus: () => lente.promise,
      listRecipes: async () => twoRecipes(),
    });

    const arrivee = store.dispatch(savedMenusScreenOpened());

    expect(selectSavedMenus(store.getState()).status).toBe('loading');
    expect(consultation(store)).toBeNull();

    lente.resolve({ menus: TROIS_SEMAINES, indexInitial: 1 });
    await arrivee;

    expect(selectSavedMenus(store.getState()).status).toBe('success');
    expect(consultation(store)?.periodLabel).toBe('31 août – 6 sept.');
  });

  it('un store neuf n’a rien chargé, ne consulte rien et n’a rien à consulter', () => {
    const store = createTestStore();

    expect(selectSavedMenus(store.getState())).toEqual({
      status: 'idle',
      hasLoadedOnce: false,
      menus: [],
      index: null,
      recipes: [],
      saved: false,
      focusOn: null,
    });
    expect(consultation(store)).toBeNull();
  });

  it('l’arrivée dont les titres se font attendre ne consulte rien et reste en chargement', async () => {
    const titres = deferred<Recipe[]>();
    const store = createTestStore({
      browseMenus: browsing(TROIS_SEMAINES, 1),
      listRecipes: () => titres.promise,
    });

    const arrivee = store.dispatch(savedMenusScreenOpened());

    expect(savedMenusViewOf(selectSavedMenus(store.getState())).status).toBe('loading');
    expect(consultation(store)).toBeNull();

    titres.resolve(twoRecipes());
    await arrivee;

    expect(consultation(store)?.periodLabel).toBe('31 août – 6 sept.');
  });

  it('sans aucun menu enregistré, l’écran est vide — il ne charge plus', async () => {
    const store = await storeEnConsultation([], null);

    expect(savedMenusViewOf(selectSavedMenus(store.getState())).status).toBe('empty');
  });

  it('une seconde arrivée ne recouvre pas d’un chargement le menu déjà consulté', async () => {
    const lente = deferred<MenuNavigation>();
    let premiere = true;
    const store = createTestStore({
      browseMenus: () => {
        if (!premiere) return lente.promise;
        premiere = false;
        return Promise.resolve({ menus: TROIS_SEMAINES, indexInitial: 1 });
      },
      listRecipes: async () => twoRecipes(),
    });
    await store.dispatch(savedMenusScreenOpened());
    expect(consultation(store)?.periodLabel).toBe('31 août – 6 sept.');

    void store.dispatch(savedMenusScreenOpened());

    expect(savedMenusViewOf(selectSavedMenus(store.getState())).status).toBe('consultation');
    expect(consultation(store)?.periodLabel).toBe('31 août – 6 sept.');
  });

  it('les menus enregistrés illisibles nomment les menus enregistrés', async () => {
    const store = createTestStore({
      browseMenus: () => Promise.reject(new Error('Boom firestore')),
    });

    await store.dispatch(savedMenusScreenOpened());

    expect(savedMenusViewOf(selectSavedMenus(store.getState()))).toEqual({
      status: 'error',
      message: 'Impossible de charger tes menus enregistrés.',
    });
  });

  it('le dépôt indisponible à l’arrivée porte le constat hors ligne, sans message d’échec', async () => {
    const store = createTestStore({
      browseMenus: () => Promise.reject(RepositoryUnavailableError.create()),
    });

    await store.dispatch(savedMenusScreenOpened());

    expect(savedMenusViewOf(selectSavedMenus(store.getState()))).toEqual({
      status: 'unavailable',
      message: 'Aucune connexion — le menu n’a pas pu être chargé.',
    });
  });
});

describe('saved menus slice — ce qu’un enregistrement laisse à la consultation', () => {
  const LUNDI_31_AOUT = createCalendarDate({ year: 2026, month: 8, day: 31 });
  const LUNDI_7_SEPT = createCalendarDate({ year: 2026, month: 9, day: 7 });

  const CONSTAT_ENREGISTRE = { tone: 'success', message: 'Menu enregistré' };

  function menuDeLaSemaine(dateDebut: CalendarDate): Menu {
    return createMenu({
      dateDebut,
      repas: [
        createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] }),
        createRepas({ jour: 6, creneau: 'soir', slots: [createSlot({ recipeId: 'r2' })] }),
      ],
    });
  }

  function browsing(menus: Menu[]): BrowseMenus {
    return async () => ({ menus, indexInitial: 0 });
  }

  function consultation(store: ReturnType<typeof createTestStore>) {
    return menuConsultationOf(selectSavedMenus(store.getState()));
  }

  async function arriveeApresEnregistrement(store: ReturnType<typeof createTestStore>) {
    await store.dispatch(savedMenusScreenOpenedAfterSave());
  }

  async function storeApresEnregistrement(overrides?: {
    genere?: Menu;
    enregistres?: Menu[];
    listRecipes?: ListRecipes;
  }) {
    const genere = overrides?.genere ?? menuDeLaSemaine(LUNDI_7_SEPT);
    const enregistres = overrides?.enregistres ?? [menuDeLaSemaine(LUNDI_24_AOUT), genere];
    const store = createTestStore({
      browseMenus: browsing(enregistres),
      listRecipes: overrides?.listRecipes ?? (async () => twoRecipes()),
      generateMenu: async () => genere,
      saveMenu: async () => {},
    });
    await store.dispatch(generateMenu(7));
    await store.dispatch(saveMenu());
    return store;
  }

  it('l’arrivée qui suit un enregistrement consulte le menu enregistré, et non celui du jour', async () => {
    const store = await storeApresEnregistrement();

    await arriveeApresEnregistrement(store);

    expect(selectSavedMenus(store.getState()).index).toBe(1);
    expect(consultation(store)?.periodLabel).toBe('7 – 13 sept.');
  });

  it('l’arrivée qui suit un enregistrement porte le constat « Menu enregistré »', async () => {
    const store = await storeApresEnregistrement();

    await arriveeApresEnregistrement(store);

    expect(consultation(store)?.saveNotice).toEqual(CONSTAT_ENREGISTRE);
  });

  it('l’arrivée SUIVANTE n’en porte plus rien, et revient au menu désigné par le domaine', async () => {
    const store = await storeApresEnregistrement();
    await arriveeApresEnregistrement(store);
    expect(consultation(store)?.saveNotice).toEqual(CONSTAT_ENREGISTRE);

    await store.dispatch(savedMenusScreenOpened());

    expect(consultation(store)?.saveNotice).toBeNull();
    expect(consultation(store)?.periodLabel).toBe('24 – 30 août');
  });

  it('l’arrivée rejouée par React ne fait pas disparaître le constat d’enregistrement', async () => {
    const store = await storeApresEnregistrement();

    await arriveeApresEnregistrement(store);
    await arriveeApresEnregistrement(store);

    expect(consultation(store)?.periodLabel).toBe('7 – 13 sept.');
    expect(consultation(store)?.saveNotice).toEqual(CONSTAT_ENREGISTRE);
  });

  it('un menu voisin consulté renonce à la cible de l’enregistrement, qu’aucune arrivée ne retrouve', async () => {
    const store = await storeApresEnregistrement();
    await arriveeApresEnregistrement(store);
    expect(consultation(store)?.periodLabel).toBe('7 – 13 sept.');

    store.dispatch(previousMenuSelected());
    await arriveeApresEnregistrement(store);

    expect(consultation(store)?.periodLabel).toBe('24 – 30 août');
    expect(consultation(store)?.saveNotice).toBeNull();
  });

  it('reculer d’un menu efface le constat de l’enregistrement précédent', async () => {
    const store = await storeApresEnregistrement();
    await arriveeApresEnregistrement(store);
    expect(consultation(store)?.saveNotice).toEqual(CONSTAT_ENREGISTRE);

    store.dispatch(previousMenuSelected());

    expect(consultation(store)?.periodLabel).toBe('24 – 30 août');
    expect(consultation(store)?.saveNotice).toBeNull();
  });

  it('avancer d’un menu efface le constat de l’enregistrement précédent', async () => {
    const store = await storeApresEnregistrement({
      genere: menuDeLaSemaine(LUNDI_24_AOUT),
      enregistres: [menuDeLaSemaine(LUNDI_24_AOUT), menuDeLaSemaine(LUNDI_31_AOUT)],
    });
    await arriveeApresEnregistrement(store);
    expect(consultation(store)?.saveNotice).toEqual(CONSTAT_ENREGISTRE);

    store.dispatch(nextMenuSelected());

    expect(consultation(store)?.periodLabel).toBe('31 août – 6 sept.');
    expect(consultation(store)?.saveNotice).toBeNull();
  });

  it('un enregistrement que la relecture ne retrouve pas consulte le menu du jour, sans constat', async () => {
    const store = await storeApresEnregistrement({
      genere: menuDeLaSemaine(LUNDI_7_SEPT),
      enregistres: [menuDeLaSemaine(LUNDI_24_AOUT)],
    });

    await arriveeApresEnregistrement(store);

    expect(consultation(store)?.periodLabel).toBe('24 – 30 août');
    expect(consultation(store)?.saveNotice).toBeNull();
  });

  it('un enregistrement DÉSAVOUÉ par une génération ne désigne aucun menu et ne constate rien', async () => {
    const enVol = deferred<void>();
    const store = createTestStore({
      browseMenus: browsing([menuDeLaSemaine(LUNDI_24_AOUT), menuDeLaSemaine(LUNDI_7_SEPT)]),
      listRecipes: async () => twoRecipes(),
      generateMenu: async () => menuDeLaSemaine(LUNDI_7_SEPT),
      saveMenu: () => enVol.promise,
    });
    await store.dispatch(generateMenu(7));
    const enregistrement = store.dispatch(saveMenu());
    await store.dispatch(generateMenu(7));
    enVol.resolve();
    await enregistrement;

    await arriveeApresEnregistrement(store);

    expect(consultation(store)?.periodLabel).toBe('24 – 30 août');
    expect(consultation(store)?.saveNotice).toBeNull();
  });

  it('naviguer dans la consultation pendant un enregistrement EN VOL ne le déverrouille pas', async () => {
    const enVol = deferred<void>();
    const store = createTestStore({
      browseMenus: browsing([menuDeLaSemaine(LUNDI_24_AOUT), menuDeLaSemaine(LUNDI_7_SEPT)]),
      listRecipes: async () => twoRecipes(),
      generateMenu: async () => menuDeLaSemaine(LUNDI_7_SEPT),
      saveMenu: () => enVol.promise,
    });
    await arriveeApresEnregistrement(store);
    await store.dispatch(generateMenu(7));

    const enregistrement = store.dispatch(saveMenu());
    store.dispatch(nextMenuSelected());

    expect(isSaveInFlight(selectMenu(store.getState()))).toBe(true);

    enVol.resolve();
    await enregistrement;
    await arriveeApresEnregistrement(store);

    expect(consultation(store)?.saveNotice).toEqual(CONSTAT_ENREGISTRE);
  });
});
