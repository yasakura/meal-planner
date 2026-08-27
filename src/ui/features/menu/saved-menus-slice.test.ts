import { describe, it, expect } from 'vitest';

import { createCalendarDate, type CalendarDate } from '../../../domain/entities/calendar-date';
import { createMenu, type Menu } from '../../../domain/entities/menu';
import { createRepas } from '../../../domain/entities/repas';
import { createSlot } from '../../../domain/entities/slot';
import { type Recipe } from '../../../domain/entities/recipe';
import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { type MenuNavigation, type ObserveMenus } from '../../../domain/use-cases/observe-menus';
import { AccountBuilder } from '../../../domain/test-builders/account.builder';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../../test/create-test-store';
import { MenuChannel } from '../../test-utils/menu-channel';
import { deferred } from '../../test-utils/deferred';
import { authStateChanged } from '../auth/auth-slice';
import {
  catalogueRetried,
  recipesObservationFailed,
  recipesObserved,
  selectCatalogue,
  selectCatalogueLinkLost,
} from '../catalogue/catalogue-slice';
import { generateMenu, isSaveInFlight, saveMenu, selectMenu } from './menu-slice';
import {
  menuConsultationOf,
  menusObservationFailed,
  menusObserved,
  nextMenuSelected,
  observeMenus,
  previousMenuSelected,
  savedMenusOpened,
  savedMenusRetried,
  savedMenusViewOf,
  selectSavedMenus,
  selectSavedMenusAttempt,
  selectSavedMenusLinkLost,
} from './saved-menus-slice';

const LUNDI_24_AOUT = createCalendarDate({ year: 2026, month: 8, day: 24 });

type TestStore = ReturnType<typeof createTestStore>;

function twoRecipes(): Recipe[] {
  return [
    RecipeBuilder.aRecipe().withId('r1').withTitle('Ratatouille').build(),
    RecipeBuilder.aRecipe().withId('r2').withTitle('Blanquette').build(),
  ];
}

function menuDeLaSemaine(dateDebut: CalendarDate): Menu {
  return createMenu({
    dateDebut,
    repas: [
      createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] }),
      createRepas({ jour: 6, creneau: 'soir', slots: [createSlot({ recipeId: 'r2' })] }),
    ],
  });
}

function navigation(menus: Menu[], indexInitial: number | null): MenuNavigation {
  return { menus, indexInitial };
}

function consultation(store: TestStore) {
  return menuConsultationOf(
    selectSavedMenus(store.getState()),
    selectCatalogue(store.getState()),
    [],
  );
}

function view(store: TestStore) {
  return savedMenusViewOf(
    selectSavedMenus(store.getState()),
    selectCatalogue(store.getState()),
    [],
  );
}

describe('saved menus slice — consultation des menus enregistrés', () => {
  const LUNDI_31_AOUT = createCalendarDate({ year: 2026, month: 8, day: 31 });
  const LUNDI_7_SEPT = createCalendarDate({ year: 2026, month: 9, day: 7 });

  const TROIS_SEMAINES = [
    menuDeLaSemaine(LUNDI_24_AOUT),
    menuDeLaSemaine(LUNDI_31_AOUT),
    menuDeLaSemaine(LUNDI_7_SEPT),
  ];

  function storeEnConsultation(menus: Menu[], indexInitial: number | null): TestStore {
    const store = createTestStore();
    store.dispatch(menusObserved(navigation(menus, indexInitial)));
    store.dispatch(recipesObserved(twoRecipes()));
    return store;
  }

  it('un menu enregistré n’ouvre le choix d’aucune de ses recettes, là où ses lignes mènent bien aux fiches', () => {
    const store = storeEnConsultation(TROIS_SEMAINES, 1);

    const lignes = consultation(store)?.days.flatMap((jour) => jour.slots) ?? [];

    expect(lignes.map((slot) => slot.choose)).toEqual([null, null]);
    expect(lignes.map((slot) => slot.recipe === 'known' && slot.href)).toEqual([
      '/catalogue/r1?depuis=menu',
      '/catalogue/r2?depuis=menu',
    ]);
  });

  it('l’émission porte la liste des menus enregistrés et le curseur, que le store garde sans retri', () => {
    const store = storeEnConsultation(TROIS_SEMAINES, 1);

    expect(selectSavedMenus(store.getState()).menus).toEqual(TROIS_SEMAINES);
    expect(consultation(store)?.periodLabel).toBe('31 août – 6 sept.');
  });

  it('l’écran consulte le menu désigné : sa période, ses jours, ses créneaux et ses liens', () => {
    const store = storeEnConsultation(TROIS_SEMAINES, 1);

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
        address: { repasIndex: 0, slotIndex: 0 },
        choose: null,
        presence: null,
      },
    ]);
  });

  it('le curseur recule d’un menu, et avance d’un menu', () => {
    const store = storeEnConsultation(TROIS_SEMAINES, 1);

    store.dispatch(previousMenuSelected());
    expect(consultation(store)?.periodLabel).toBe('24 – 30 août');

    store.dispatch(nextMenuSelected());
    expect(consultation(store)?.periodLabel).toBe('31 août – 6 sept.');

    store.dispatch(nextMenuSelected());
    expect(consultation(store)?.periodLabel).toBe('7 – 13 sept.');
  });

  it('le curseur déplacé suit SON menu quand une émission en insère un plus ancien devant', () => {
    const store = storeEnConsultation(
      [menuDeLaSemaine(LUNDI_31_AOUT), menuDeLaSemaine(LUNDI_7_SEPT)],
      0,
    );
    store.dispatch(nextMenuSelected());
    expect(consultation(store)?.periodLabel).toBe('7 – 13 sept.');

    store.dispatch(menusObserved(navigation(TROIS_SEMAINES, 0)));

    expect(consultation(store)?.periodLabel).toBe('7 – 13 sept.');
  });

  it('sur le plus ancien, seule la flèche de gauche est verrouillée', () => {
    const store = storeEnConsultation(TROIS_SEMAINES, 0);

    expect(consultation(store)?.previousDisabled).toBe(true);
    expect(consultation(store)?.nextDisabled).toBe(false);
  });

  it('sur le plus récent, seule la flèche de droite est verrouillée', () => {
    const store = storeEnConsultation(TROIS_SEMAINES, 2);

    expect(consultation(store)?.previousDisabled).toBe(false);
    expect(consultation(store)?.nextDisabled).toBe(true);
  });

  it('entre deux menus, aucune flèche n’est verrouillée', () => {
    const store = storeEnConsultation(TROIS_SEMAINES, 1);

    expect(consultation(store)?.previousDisabled).toBe(false);
    expect(consultation(store)?.nextDisabled).toBe(false);
  });

  it('un seul menu enregistré verrouille les deux flèches', () => {
    const store = storeEnConsultation([menuDeLaSemaine(LUNDI_24_AOUT)], 0);

    expect(consultation(store)?.previousDisabled).toBe(true);
    expect(consultation(store)?.nextDisabled).toBe(true);
  });

  it('hors ligne, les titres manquants ne masquent plus le menu : ses jours restent, ses créneaux disent le titre indisponible, et le constat nomme les titres', () => {
    const store = createTestStore();
    store.dispatch(menusObserved(navigation(TROIS_SEMAINES, 1)));

    store.dispatch(recipesObservationFailed({ unavailable: true }));

    expect(view(store).status).toBe('consultation');
    expect(consultation(store)?.periodLabel).toBe('31 août – 6 sept.');
    expect(consultation(store)?.days.map((jour) => jour.label)).toEqual([
      'lundi 31 août',
      'dimanche 6 septembre',
    ]);
    expect(
      consultation(store)?.days.flatMap((jour) => jour.slots.map((slot) => slot.title)),
    ).toEqual(['Titre indisponible', 'Titre indisponible']);
    expect(consultation(store)?.titlesNotice).toEqual({
      message: 'Aucune connexion — les noms des recettes n’ont pas pu être chargés.',
      retriable: true,
    });
  });

  it('des titres illisibles avant toute émission ne masquent plus le menu : son constat accuse les titres, et non les menus', () => {
    const store = createTestStore();
    store.dispatch(menusObserved(navigation(TROIS_SEMAINES, 1)));

    store.dispatch(recipesObservationFailed({ unavailable: false }));

    expect(view(store).status).toBe('consultation');
    expect(consultation(store)?.periodLabel).toBe('31 août – 6 sept.');
    expect(consultation(store)?.titlesNotice).toEqual({
      message: 'Impossible de charger les noms des recettes.',
      retriable: true,
    });
  });

  it('une relance des titres ne retire pas de l’écran le menu qu’on y voyait : il reste, et son constat annonce le chargement au lieu d’offrir une relance de plus', () => {
    const store = createTestStore();
    store.dispatch(menusObserved(navigation(TROIS_SEMAINES, 1)));
    store.dispatch(recipesObservationFailed({ unavailable: true }));
    expect(view(store).status).toBe('consultation');

    store.dispatch(catalogueRetried());

    expect(view(store).status).toBe('consultation');
    expect(consultation(store)?.periodLabel).toBe('31 août – 6 sept.');
    expect(consultation(store)?.titlesNotice).toEqual({
      message: 'Chargement des noms des recettes…',
      retriable: false,
    });
  });

  it('avant toute relance, les titres qui se font attendre gardent l’écran de chargement, là où la même attente APRÈS une relance montre le menu', () => {
    const avantRelance = createTestStore();
    avantRelance.dispatch(menusObserved(navigation(TROIS_SEMAINES, 1)));

    expect(view(avantRelance).status).toBe('loading');

    const apresRelance = createTestStore();
    apresRelance.dispatch(menusObserved(navigation(TROIS_SEMAINES, 1)));
    apresRelance.dispatch(catalogueRetried());

    expect(view(apresRelance).status).toBe('consultation');
  });

  it('des titres bien lus ne portent aucun constat, et leurs créneaux nomment les recettes', () => {
    const store = storeEnConsultation(TROIS_SEMAINES, 1);

    expect(consultation(store)?.titlesNotice).toBeNull();
    expect(consultation(store)?.days.at(0)?.slots.at(0)?.title).toBe('Ratatouille');
  });

  it('des titres déjà reçus puis perdus n’ajoutent aucun constat au menu : le bandeau du lien perdu s’en charge', () => {
    const store = storeEnConsultation(TROIS_SEMAINES, 1);

    store.dispatch(recipesObservationFailed({ unavailable: true }));

    expect(consultation(store)?.titlesNotice).toBeNull();
    expect(selectCatalogueLinkLost(store.getState())).toBe(true);
  });

  it('les menus ET les titres en panne portent le constat des menus, le seul qui soit vrai', () => {
    const store = createTestStore();

    store.dispatch(menusObservationFailed({ unavailable: false }));
    store.dispatch(recipesObservationFailed({ unavailable: false }));

    expect(view(store)).toEqual({
      status: 'error',
      message: 'Impossible de charger tes menus enregistrés.',
    });
  });

  it('des titres devenus illisibles ne retirent pas de l’écran le menu consulté', () => {
    const store = storeEnConsultation(TROIS_SEMAINES, 1);

    store.dispatch(recipesObservationFailed({ unavailable: false }));

    expect(view(store).status).toBe('consultation');
    expect(consultation(store)?.periodLabel).toBe('31 août – 6 sept.');
    expect(consultation(store)?.days.at(0)?.slots.at(0)?.title).toBe('Ratatouille');
  });

  it('un dépôt de titres devenu injoignable ne retire pas de l’écran le menu consulté', () => {
    const store = storeEnConsultation(TROIS_SEMAINES, 1);

    store.dispatch(recipesObservationFailed({ unavailable: true }));

    expect(view(store).status).toBe('consultation');
    expect(consultation(store)?.periodLabel).toBe('31 août – 6 sept.');
    expect(consultation(store)?.days.at(0)?.slots.at(0)?.title).toBe('Ratatouille');
  });

  it('un canal de menus tombé ne retire pas de l’écran le menu consulté', () => {
    const store = storeEnConsultation(TROIS_SEMAINES, 1);

    store.dispatch(menusObservationFailed({ unavailable: true }));

    expect(view(store).status).toBe('consultation');
    expect(consultation(store)?.periodLabel).toBe('31 août – 6 sept.');
  });

  it('le curseur déplacé revient au menu désigné par le domaine à chaque arrivée sur l’écran', () => {
    const store = storeEnConsultation(TROIS_SEMAINES, 1);
    store.dispatch(previousMenuSelected());
    expect(consultation(store)?.periodLabel).toBe('24 – 30 août');

    store.dispatch(savedMenusOpened({ fromSave: false }));

    expect(consultation(store)?.periodLabel).toBe('31 août – 6 sept.');
  });

  it('l’écran charge tant que les menus enregistrés ne sont pas émis', () => {
    const store = createTestStore();
    store.dispatch(recipesObserved(twoRecipes()));

    expect(view(store).status).toBe('loading');
    expect(consultation(store)).toBeNull();

    store.dispatch(menusObserved(navigation(TROIS_SEMAINES, 1)));

    expect(view(store).status).toBe('consultation');
    expect(consultation(store)?.periodLabel).toBe('31 août – 6 sept.');
  });

  it('un store neuf n’a rien reçu, ne désigne aucun menu et n’a rien à consulter', () => {
    const store = createTestStore();

    expect(selectSavedMenus(store.getState())).toEqual({
      menus: null,
      indexInitial: null,
      failure: null,
      attempt: 0,
      cursor: null,
    });
    expect(consultation(store)).toBeNull();
    expect(view(store).status).toBe('loading');
  });

  it('les menus émis dont les titres se font attendre ne consultent rien et restent en chargement', () => {
    const store = createTestStore();

    store.dispatch(menusObserved(navigation(TROIS_SEMAINES, 1)));

    expect(view(store).status).toBe('loading');

    store.dispatch(recipesObserved(twoRecipes()));

    expect(view(store).status).toBe('consultation');
    expect(consultation(store)?.periodLabel).toBe('31 août – 6 sept.');
  });

  it('sans aucun menu enregistré, l’écran est vide — il ne charge plus, et n’attend aucun titre', () => {
    const store = createTestStore();

    store.dispatch(menusObserved(navigation([], null)));

    expect(view(store).status).toBe('empty');
  });

  it('une seconde arrivée ne recouvre pas d’un chargement le menu déjà consulté', () => {
    const store = storeEnConsultation(TROIS_SEMAINES, 1);

    store.dispatch(savedMenusOpened({ fromSave: false }));

    expect(view(store).status).toBe('consultation');
    expect(consultation(store)?.periodLabel).toBe('31 août – 6 sept.');
  });

  it('les menus enregistrés illisibles nomment les menus enregistrés', () => {
    const store = createTestStore();

    store.dispatch(menusObservationFailed({ unavailable: false }));

    expect(view(store)).toEqual({
      status: 'error',
      message: 'Impossible de charger tes menus enregistrés.',
    });
  });

  it('le dépôt de menus indisponible porte le constat hors ligne, sans message d’échec', () => {
    const store = createTestStore();

    store.dispatch(menusObservationFailed({ unavailable: true }));

    expect(view(store)).toEqual({
      status: 'unavailable',
      message: 'Aucune connexion — le menu n’a pas pu être chargé.',
    });
  });

  it('la relance efface le constat et compte une tentative de plus', () => {
    const store = createTestStore();
    store.dispatch(menusObservationFailed({ unavailable: true }));
    expect(selectSavedMenusAttempt(store.getState())).toBe(0);

    store.dispatch(savedMenusRetried());

    expect(selectSavedMenus(store.getState()).failure).toBeNull();
    expect(selectSavedMenusAttempt(store.getState())).toBe(1);
    expect(view(store).status).toBe('loading');
  });

  it('la session refermée jette les menus reçus, le constat et les tentatives', () => {
    const store = storeEnConsultation(TROIS_SEMAINES, 1);
    store.dispatch(menusObservationFailed({ unavailable: true }));
    store.dispatch(savedMenusRetried());

    store.dispatch(authStateChanged(null));

    expect(selectSavedMenus(store.getState())).toEqual({
      menus: null,
      indexInitial: null,
      failure: null,
      attempt: 0,
      cursor: null,
    });
  });

  it('une session qui s’ouvre ne jette pas ce que le canal vient d’émettre', () => {
    const store = storeEnConsultation(TROIS_SEMAINES, 1);

    store.dispatch(authStateChanged(AccountBuilder.anAccount().build()));

    expect(selectSavedMenus(store.getState()).menus).toEqual(TROIS_SEMAINES);
    expect(consultation(store)?.periodLabel).toBe('31 août – 6 sept.');
  });
});

describe('observeMenus — l’abonnement branché sur le store', () => {
  const MENUS = navigation([menuDeLaSemaine(LUNDI_24_AOUT)], 0);

  it('pousse dans le store les menus émis par le use case injecté', () => {
    const store = createTestStore({ observeMenus: MenuChannel.seededWith(MENUS).observeMenus });

    store.dispatch(observeMenus());

    expect(selectSavedMenus(store.getState()).menus).toEqual(MENUS.menus);
    expect(selectSavedMenus(store.getState()).indexInitial).toBe(0);
  });

  it('pousse le constat hors-ligne quand le canal refuse pour dépôt injoignable', () => {
    const store = createTestStore({
      observeMenus: MenuChannel.refusingWith(RepositoryUnavailableError.create()).observeMenus,
    });

    store.dispatch(observeMenus());

    expect(selectSavedMenus(store.getState()).failure).toBe('unavailable');
  });

  it('pousse le constat illisible pour toute autre panne', () => {
    const store = createTestStore({
      observeMenus: MenuChannel.refusingWith(new Error('Firestore down')).observeMenus,
    });

    store.dispatch(observeMenus());

    expect(selectSavedMenus(store.getState()).failure).toBe('unreadable');
  });

  it('rend le désabonnement du use case, et c’est bien celui-là', () => {
    let desabonne = false;
    const observe: ObserveMenus = () => () => {
      desabonne = true;
    };
    const store = createTestStore({ observeMenus: observe });

    const unsubscribe = store.dispatch(observeMenus());
    expect(desabonne).toBe(false);

    unsubscribe();

    expect(desabonne).toBe(true);
  });
});

describe('selectSavedMenusLinkLost', () => {
  it('un store neuf n’a pas de lien perdu : rien n’a encore été observé', () => {
    const store = createTestStore();

    expect(selectSavedMenusLinkLost(store.getState())).toBe(false);
  });

  it('une panne sans émission n’est pas un lien perdu : l’écran porte déjà le constat en pleine page', () => {
    const store = createTestStore();

    store.dispatch(menusObservationFailed({ unavailable: false }));

    expect(selectSavedMenusLinkLost(store.getState())).toBe(false);
  });

  it('une panne après émission est un lien perdu : les menus restent mais plus rien ne les rafraîchira', () => {
    const store = createTestStore();
    store.dispatch(menusObserved(navigation([menuDeLaSemaine(LUNDI_24_AOUT)], 0)));

    store.dispatch(menusObservationFailed({ unavailable: false }));

    expect(selectSavedMenusLinkLost(store.getState())).toBe(true);
  });
});

describe('saved menus slice — ce qu’un enregistrement laisse à la consultation', () => {
  const LUNDI_31_AOUT = createCalendarDate({ year: 2026, month: 8, day: 31 });
  const LUNDI_7_SEPT = createCalendarDate({ year: 2026, month: 9, day: 7 });

  const CONSTAT_ENREGISTRE = { tone: 'success', message: 'Menu enregistré' };

  function arriveeApresEnregistrement(store: TestStore) {
    store.dispatch(savedMenusOpened({ fromSave: true }));
  }

  async function storeApresEnregistrement(overrides?: { genere?: Menu; emis?: Menu[] }) {
    const genere = overrides?.genere ?? menuDeLaSemaine(LUNDI_7_SEPT);
    const emis = overrides?.emis ?? [menuDeLaSemaine(LUNDI_24_AOUT), genere];
    const store = createTestStore({
      listRecipes: async () => twoRecipes(),
      generateMenu: async () => genere,
      saveMenu: async () => {},
    });
    store.dispatch(recipesObserved(twoRecipes()));
    await store.dispatch(generateMenu(7));
    await store.dispatch(saveMenu());
    store.dispatch(menusObserved(navigation(emis, 0)));
    return store;
  }

  it('l’arrivée qui suit un enregistrement consulte le menu enregistré, et non celui du jour', async () => {
    const store = await storeApresEnregistrement();

    arriveeApresEnregistrement(store);

    expect(consultation(store)?.periodLabel).toBe('7 – 13 sept.');
  });

  it('l’arrivée qui suit un enregistrement porte le constat « Menu enregistré »', async () => {
    const store = await storeApresEnregistrement();

    arriveeApresEnregistrement(store);

    expect(consultation(store)?.saveNotice).toEqual(CONSTAT_ENREGISTRE);
  });

  it('l’arrivée SUIVANTE n’en porte plus rien, et revient au menu désigné par le domaine', async () => {
    const store = await storeApresEnregistrement();
    arriveeApresEnregistrement(store);
    expect(consultation(store)?.saveNotice).toEqual(CONSTAT_ENREGISTRE);

    store.dispatch(savedMenusOpened({ fromSave: false }));

    expect(consultation(store)?.saveNotice).toBeNull();
    expect(consultation(store)?.periodLabel).toBe('24 – 30 août');
  });

  it('l’arrivée rejouée par React ne fait pas disparaître le constat d’enregistrement', async () => {
    const store = await storeApresEnregistrement();

    arriveeApresEnregistrement(store);
    arriveeApresEnregistrement(store);

    expect(consultation(store)?.periodLabel).toBe('7 – 13 sept.');
    expect(consultation(store)?.saveNotice).toEqual(CONSTAT_ENREGISTRE);
  });

  it('un menu voisin consulté renonce à la cible de l’enregistrement, qu’aucune arrivée ne retrouve', async () => {
    const store = await storeApresEnregistrement();
    arriveeApresEnregistrement(store);
    expect(consultation(store)?.periodLabel).toBe('7 – 13 sept.');

    store.dispatch(previousMenuSelected());
    arriveeApresEnregistrement(store);

    expect(consultation(store)?.periodLabel).toBe('24 – 30 août');
    expect(consultation(store)?.saveNotice).toBeNull();
  });

  it('reculer d’un menu efface le constat de l’enregistrement précédent', async () => {
    const store = await storeApresEnregistrement();
    arriveeApresEnregistrement(store);
    expect(consultation(store)?.saveNotice).toEqual(CONSTAT_ENREGISTRE);

    store.dispatch(previousMenuSelected());

    expect(consultation(store)?.periodLabel).toBe('24 – 30 août');
    expect(consultation(store)?.saveNotice).toBeNull();
  });

  it('avancer d’un menu efface le constat de l’enregistrement précédent', async () => {
    const store = await storeApresEnregistrement({
      genere: menuDeLaSemaine(LUNDI_24_AOUT),
      emis: [menuDeLaSemaine(LUNDI_24_AOUT), menuDeLaSemaine(LUNDI_31_AOUT)],
    });
    arriveeApresEnregistrement(store);
    expect(consultation(store)?.saveNotice).toEqual(CONSTAT_ENREGISTRE);

    store.dispatch(nextMenuSelected());

    expect(consultation(store)?.periodLabel).toBe('31 août – 6 sept.');
    expect(consultation(store)?.saveNotice).toBeNull();
  });

  it('un enregistrement que l’émission ne porte pas consulte le menu du jour, sans constat', async () => {
    const store = await storeApresEnregistrement({
      genere: menuDeLaSemaine(LUNDI_7_SEPT),
      emis: [menuDeLaSemaine(LUNDI_24_AOUT)],
    });

    arriveeApresEnregistrement(store);

    expect(consultation(store)?.periodLabel).toBe('24 – 30 août');
    expect(consultation(store)?.saveNotice).toBeNull();
  });

  it('un enregistrement refusé par le serveur, que l’émission suivante retire, efface le constat et le menu', async () => {
    const store = await storeApresEnregistrement({
      genere: menuDeLaSemaine(LUNDI_7_SEPT),
      emis: [menuDeLaSemaine(LUNDI_7_SEPT)],
    });
    arriveeApresEnregistrement(store);
    expect(consultation(store)?.periodLabel).toBe('7 – 13 sept.');
    expect(consultation(store)?.saveNotice).toEqual(CONSTAT_ENREGISTRE);

    store.dispatch(menusObserved(navigation([], null)));

    expect(view(store).status).toBe('empty');
    expect(consultation(store)).toBeNull();
  });

  it('un enregistrement refusé par le serveur laisse le menu voisin, sans constat', async () => {
    const store = await storeApresEnregistrement({
      genere: menuDeLaSemaine(LUNDI_7_SEPT),
      emis: [menuDeLaSemaine(LUNDI_24_AOUT), menuDeLaSemaine(LUNDI_7_SEPT)],
    });
    arriveeApresEnregistrement(store);
    expect(consultation(store)?.saveNotice).toEqual(CONSTAT_ENREGISTRE);

    store.dispatch(menusObserved(navigation([menuDeLaSemaine(LUNDI_24_AOUT)], 0)));

    expect(consultation(store)?.periodLabel).toBe('24 – 30 août');
    expect(consultation(store)?.saveNotice).toBeNull();
  });

  it('un enregistrement DÉSAVOUÉ par une génération ne désigne aucun menu et ne constate rien', async () => {
    const enVol = deferred<void>();
    const store = createTestStore({
      listRecipes: async () => twoRecipes(),
      generateMenu: async () => menuDeLaSemaine(LUNDI_7_SEPT),
      saveMenu: () => enVol.promise,
    });
    store.dispatch(recipesObserved(twoRecipes()));
    await store.dispatch(generateMenu(7));
    const enregistrement = store.dispatch(saveMenu());
    await store.dispatch(generateMenu(7));
    enVol.resolve();
    await enregistrement;
    store.dispatch(
      menusObserved(navigation([menuDeLaSemaine(LUNDI_24_AOUT), menuDeLaSemaine(LUNDI_7_SEPT)], 0)),
    );

    arriveeApresEnregistrement(store);

    expect(consultation(store)?.periodLabel).toBe('24 – 30 août');
    expect(consultation(store)?.saveNotice).toBeNull();
  });

  it('naviguer dans la consultation pendant un enregistrement EN VOL ne le déverrouille pas', async () => {
    const enVol = deferred<void>();
    const store = createTestStore({
      listRecipes: async () => twoRecipes(),
      generateMenu: async () => menuDeLaSemaine(LUNDI_7_SEPT),
      saveMenu: () => enVol.promise,
    });
    store.dispatch(recipesObserved(twoRecipes()));
    store.dispatch(
      menusObserved(navigation([menuDeLaSemaine(LUNDI_24_AOUT), menuDeLaSemaine(LUNDI_7_SEPT)], 0)),
    );
    arriveeApresEnregistrement(store);
    await store.dispatch(generateMenu(7));

    const enregistrement = store.dispatch(saveMenu());
    store.dispatch(nextMenuSelected());

    expect(isSaveInFlight(selectMenu(store.getState()))).toBe(true);

    enVol.resolve();
    await enregistrement;
    arriveeApresEnregistrement(store);

    expect(consultation(store)?.saveNotice).toEqual(CONSTAT_ENREGISTRE);
  });
});
