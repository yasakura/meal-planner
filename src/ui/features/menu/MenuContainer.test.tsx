import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { createCalendarDate, type CalendarDate } from '../../../domain/entities/calendar-date';
import { createMenu, type Menu } from '../../../domain/entities/menu';
import { createRepas } from '../../../domain/entities/repas';
import { createSlot } from '../../../domain/entities/slot';
import { type Recipe } from '../../../domain/entities/recipe';
import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { type GenerateMenu } from '../../../domain/use-cases/generate-menu';
import { type ListRecipes } from '../../../domain/use-cases/list-recipes';
import { nextMondayUseCase, type NextMonday } from '../../../domain/use-cases/next-monday';
import { type SaveMenu } from '../../../domain/use-cases/save-menu';
import { DriftingClock } from '../../../domain/test-doubles/drifting-clock';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../store/create-test-store';
import { deferred } from '../../test-utils/deferred';
import { MenuContainer } from './MenuContainer';

// Lundi 24 août 2026 : le jour 0 du menu EST cette date, le jour 1 le lendemain.
const LUNDI_24_AOUT = createCalendarDate({ year: 2026, month: 8, day: 24 });

function aMenu(): Menu {
  return createMenu({
    dateDebut: LUNDI_24_AOUT,
    repas: [
      createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] }),
      createRepas({ jour: 0, creneau: 'soir', slots: [createSlot({ recipeId: 'r2' })] }),
      createRepas({ jour: 1, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] }),
    ],
  });
}

function twoRecipes(): Recipe[] {
  return [
    RecipeBuilder.aRecipe().withId('r1').withTitle('Ratatouille').build(),
    RecipeBuilder.aRecipe().withId('r2').withTitle('Blanquette').build(),
  ];
}

type TestStore = ReturnType<typeof createTestStore>;

// Monte le container SUR un store donné — la seule façon de rejouer un remontage de session
// (le store est un singleton en prod, `unmount()` ne le réinitialise pas).
function renderOn(store: TestStore) {
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <MenuContainer />
      </MemoryRouter>
    </Provider>,
  );
}

function renderWithStore(overrides: {
  generateMenu?: GenerateMenu;
  listRecipes?: ListRecipes;
  nextMonday?: NextMonday;
  saveMenu?: SaveMenu;
}) {
  const store = createTestStore(overrides);
  return { store, ...renderOn(store) };
}

// Le champ natif n'est pas une zone de texte : on ne le « tape » pas, le système y dépose une
// valeur d'un coup. `fireEvent.change` reproduit exactement ce que le navigateur émet.
function choisirLaDateDeDebut(valeur: string) {
  fireEvent.change(screen.getByLabelText('Début du menu'), { target: { value: valeur } });
}

// Menu daté par la date REÇUE, et non par un littéral : c'est le seul moyen de suivre la date
// choisie jusqu'aux en-têtes de jour affichés.
function menuDatedOn(dateDebut: CalendarDate): Menu {
  return createMenu({
    dateDebut,
    repas: [createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] })],
  });
}

describe('MenuContainer', () => {
  it('affiche une invite et un bouton « Générer un menu » à l’ouverture', () => {
    renderWithStore({});

    expect(screen.getByRole('button', { name: /générer un menu/i })).toBeInTheDocument();
  });

  // RUPTURE VOLONTAIRE : la fenêtre par défaut passe de 7 à 14 jours (« 2 semaines »).
  it('génère un menu de 14 jours (« 2 semaines ») par défaut au clic sur « Générer un menu »', async () => {
    const user = userEvent.setup();
    const daysReceived: number[] = [];
    const generate: GenerateMenu = async ({ days }) => {
      daysReceived.push(days);
      return aMenu();
    };
    renderWithStore({ generateMenu: generate, listRecipes: async () => twoRecipes() });

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(await screen.findByText('lundi 24 août')).toBeInTheDocument();
    expect(daysReceived).toEqual([14]);
  });

  it('rend le sélecteur segmenté avec « 2 semaines » actif par défaut', () => {
    renderWithStore({});

    expect(screen.getByRole('button', { name: /2 semaines/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /1 semaine/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('sélectionner « 1 semaine » puis Générer → generateMenu avec 7 jours', async () => {
    const user = userEvent.setup();
    const daysReceived: number[] = [];
    const generate: GenerateMenu = async ({ days }) => {
      daysReceived.push(days);
      return aMenu();
    };
    renderWithStore({ generateMenu: generate, listRecipes: async () => twoRecipes() });

    await user.click(screen.getByRole('button', { name: /1 semaine/i }));
    // Le segment sélectionné devient actif.
    expect(screen.getByRole('button', { name: /1 semaine/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(await screen.findByText('lundi 24 août')).toBeInTheDocument();
    expect(daysReceived).toEqual([7]);
  });

  it('propose encore le sélecteur segmenté sur l’état « menu généré »', async () => {
    const user = userEvent.setup();
    renderWithStore({ generateMenu: async () => aMenu(), listRecipes: async () => twoRecipes() });

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    await screen.findByRole('button', { name: /régénérer/i });

    expect(screen.getByRole('button', { name: /1 semaine/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2 semaines/i })).toBeInTheDocument();
  });

  /**
   * Le sélecteur de la branche `success` a son PROPRE câblage de `onSelect`. Aucun scénario ne
   * l'exerçait : un test regarde la PRÉSENCE des deux segments sur cet état, un autre CLIQUE un
   * segment mais depuis `idle`, un troisième n'exerce que `onRegenerate`. `onSelect: () => {}`
   * sur cette branche-là laissait donc toute la suite verte, pour un écran qui ne bouge pas au
   * clic et une régénération qui repart sur 14 — et `MenuContainer.tsx` n'est pas muté.
   */
  it('depuis le menu affiché, cliquer « 1 semaine » bascule le segment et régénère sur 7 jours', async () => {
    const user = userEvent.setup();
    const daysReceived: number[] = [];
    const generate: GenerateMenu = async ({ days }) => {
      daysReceived.push(days);
      return aMenu();
    };
    renderWithStore({ generateMenu: generate, listRecipes: async () => twoRecipes() });

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    await screen.findByRole('button', { name: /régénérer/i });
    // GAGE : on part bien de « 2 semaines » actif, sinon la bascule affirmée ensuite serait
    // vraie sans qu'aucun clic n'ait rien changé.
    expect(screen.getByRole('button', { name: /2 semaines/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: /1 semaine/i }));

    expect(screen.getByRole('button', { name: /1 semaine/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /2 semaines/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    await user.click(screen.getByRole('button', { name: /régénérer/i }));
    await screen.findByText('lundi 24 août');

    expect(daysReceived).toEqual([14, 7]);
  });

  it('affiche l’indicateur de chargement pendant la génération', async () => {
    const user = userEvent.setup();
    const pending: GenerateMenu = () => new Promise<Menu>(() => {});
    renderWithStore({ generateMenu: pending, listRecipes: async () => twoRecipes() });

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('affiche un message sobre + « Réessayer » en cas d’échec, et régénère au clic', async () => {
    const user = userEvent.setup();
    let count = 0;
    const failThenSucceed: GenerateMenu = async ({ days }) => {
      count += 1;
      if (count === 1) throw new Error('Impossible de générer un menu sans recette');
      void days;
      return aMenu();
    };
    renderWithStore({ generateMenu: failThenSucceed, listRecipes: async () => twoRecipes() });

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de générer le menu.');
    expect(screen.queryByText(/sans recette/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /réessayer/i }));

    expect(await screen.findByText('lundi 24 août')).toBeInTheDocument();
    expect(count).toBe(2);
  });

  it('catalogue vide : affiche un message actionnable invitant à ajouter des recettes', async () => {
    const user = userEvent.setup();
    renderWithStore({ generateMenu: async () => aMenu(), listRecipes: async () => [] });

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Ajoute d'abord des recettes pour générer un menu.",
    );
  });

  it('erreur non fonctionnelle : affiche le message générique, jamais le détail technique', async () => {
    const user = userEvent.setup();
    const generate: GenerateMenu = async () => {
      throw new Error('Boom firestore interne');
    };
    renderWithStore({ generateMenu: generate, listRecipes: async () => twoRecipes() });

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Impossible de générer le menu.');
    expect(screen.queryByText(/Boom firestore/i)).not.toBeInTheDocument();
  });

  /**
   * L'en-tête d'un jour porte sa DATE, dérivée de la date de début du menu et du décalage du
   * repas. Le menu part ici d'un lundi 4 janvier 2027, et non du lundi 24 août des autres
   * scénarios : un libellé constant, ou lu ailleurs que dans le menu affiché, ne peut pas
   * passer les deux.
   */
  it('nomme chaque jour par sa date, dérivée de la date de début DU MENU affiché', async () => {
    const user = userEvent.setup();
    const menu = createMenu({
      dateDebut: createCalendarDate({ year: 2027, month: 1, day: 4 }),
      repas: [
        createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r1' })] }),
        createRepas({ jour: 1, creneau: 'midi', slots: [createSlot({ recipeId: 'r2' })] }),
      ],
    });
    renderWithStore({ generateMenu: async () => menu, listRecipes: async () => twoRecipes() });

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    await screen.findByText('lundi 4 janvier');
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'lundi 4 janvier',
      'mardi 5 janvier',
    ]);
  });

  it('regroupe les repas par jour et affiche le titre de la recette de chaque créneau', async () => {
    const user = userEvent.setup();
    renderWithStore({ generateMenu: async () => aMenu(), listRecipes: async () => twoRecipes() });

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    const jour1 = (await screen.findByText('lundi 24 août')).closest('section') as HTMLElement;
    expect(within(jour1).getByText('Midi')).toBeInTheDocument();
    expect(within(jour1).getByText('Ratatouille')).toBeInTheDocument();
    expect(within(jour1).getByText('Soir')).toBeInTheDocument();
    expect(within(jour1).getByText('Blanquette')).toBeInTheDocument();

    const jour2 = screen.getByText('mardi 25 août').closest('section') as HTMLElement;
    expect(within(jour2).getByText('Midi')).toBeInTheDocument();
    expect(within(jour2).getByText('Ratatouille')).toBeInTheDocument();
  });

  it('affiche les jours dans l’ordre croissant et, au sein d’un jour, Midi avant Soir', async () => {
    const user = userEvent.setup();
    renderWithStore({ generateMenu: async () => aMenu(), listRecipes: async () => twoRecipes() });

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    await screen.findByText('lundi 24 août');
    const dayLabels = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(dayLabels).toEqual(['lundi 24 août', 'mardi 25 août']);

    const jour1 = screen.getByText('lundi 24 août').closest('section') as HTMLElement;
    const creneaux = within(jour1)
      .getAllByText(/^(Midi|Soir)$/)
      .map((el) => el.textContent);
    expect(creneaux).toEqual(['Midi', 'Soir']);
  });

  it('affiche un libellé de repli quand la recette d’un créneau est introuvable', async () => {
    const user = userEvent.setup();
    const menu = createMenu({
      dateDebut: LUNDI_24_AOUT,
      repas: [
        createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'inconnu' })] }),
      ],
    });
    renderWithStore({ generateMenu: async () => menu, listRecipes: async () => twoRecipes() });

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(await screen.findByText('Recette inconnue')).toBeInTheDocument();
  });

  it('propose « Régénérer » une fois un menu affiché', async () => {
    const user = userEvent.setup();
    renderWithStore({ generateMenu: async () => aMenu(), listRecipes: async () => twoRecipes() });

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(await screen.findByRole('button', { name: /régénérer/i })).toBeInTheDocument();
  });

  /**
   * Issue #28. La fenêtre choisie est une PRÉFÉRENCE : elle vit dans le store, comme le menu
   * généré, et survit donc au démontage du container. Quand elle vivait dans un `useState`,
   * un simple aller-retour la ramenait à « 2 semaines » au-dessus d'un menu de 7 jours.
   */
  it('la fenêtre choisie survit à un remontage sur le MÊME store', async () => {
    const user = userEvent.setup();
    const { store, unmount } = renderWithStore({});

    await user.click(screen.getByRole('button', { name: /1 semaine/i }));
    unmount();
    renderOn(store);

    expect(screen.getByRole('button', { name: /1 semaine/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /2 semaines/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('après un remontage, « Régénérer » régénère sur la fenêtre choisie, pas sur 14', async () => {
    const user = userEvent.setup();
    const daysReceived: number[] = [];
    const generate: GenerateMenu = async ({ days }) => {
      daysReceived.push(days);
      return aMenu();
    };
    const { store, unmount } = renderWithStore({
      generateMenu: generate,
      listRecipes: async () => twoRecipes(),
    });

    await user.click(screen.getByRole('button', { name: /1 semaine/i }));
    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    await screen.findByText('lundi 24 août');

    unmount();
    renderOn(store);

    await user.click(await screen.findByRole('button', { name: /régénérer/i }));
    await screen.findByText('lundi 24 août');

    expect(daysReceived).toEqual([7, 7]);
  });

  it('après un remontage, « Réessayer » régénère sur la fenêtre choisie, pas sur 14', async () => {
    const user = userEvent.setup();
    const daysReceived: number[] = [];
    let count = 0;
    const failThenSucceed: GenerateMenu = async ({ days }) => {
      daysReceived.push(days);
      count += 1;
      if (count === 1) throw new Error('Boom');
      return aMenu();
    };
    const { store, unmount } = renderWithStore({
      generateMenu: failThenSucceed,
      listRecipes: async () => twoRecipes(),
    });

    await user.click(screen.getByRole('button', { name: /1 semaine/i }));
    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    await screen.findByRole('alert');

    unmount();
    renderOn(store);

    await user.click(await screen.findByRole('button', { name: /réessayer/i }));
    await screen.findByText('lundi 24 août');

    expect(daysReceived).toEqual([7, 7]);
  });
  /**
   * Le menu résout ses titres depuis les recettes STOCKÉES à la génération. En arrivant sur
   * l'écran, elles sont relues — sinon un titre modifié ailleurs reste périmé au menu jusqu'à la
   * prochaine génération. Le remontage se fait sur le MÊME store : c'est la seule façon de
   * rejouer une arrivée sur l'écran en cours de session (le store est un singleton en prod).
   */
  it('arriver sur l’écran avec un menu déjà généré relit les recettes et rafraîchit les titres', async () => {
    const user = userEvent.setup();
    let catalogue = twoRecipes();
    const { store, unmount } = renderWithStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => catalogue,
    });

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    // GAGE de l'absence affirmée plus bas : le même localisateur, vu trouver l'ancien titre sur
    // ses DEUX créneaux (r1 occupe le lundi 24 Midi et le mardi 25 Midi).
    expect(await screen.findAllByText('Ratatouille')).toHaveLength(2);

    unmount();
    catalogue = [
      RecipeBuilder.aRecipe().withId('r1').withTitle('Tian de légumes').build(),
      RecipeBuilder.aRecipe().withId('r2').withTitle('Blanquette').build(),
    ];
    renderOn(store);

    expect(await screen.findAllByText('Tian de légumes')).toHaveLength(2);
    expect(screen.queryAllByText('Ratatouille')).toHaveLength(0);
    // Le menu lui-même n'a pas bougé : mêmes repas, mêmes jours.
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'lundi 24 août',
      'mardi 25 août',
    ]);
  });

  /**
   * La relecture est un geste que l'utilisateur n'a PAS demandé : elle ne doit rien faire
   * clignoter. La règle n'était gagée que par un effet de bord — le `toEqual` final d'un test de
   * slice, vrai seulement parce que `fulfilled` ne touche pas `status`. Un refactor ajoutant
   * `pending → loading` ET `fulfilled → success` réintroduirait le clignotement en gardant la
   * suite verte. Le clignotement est un fait de CONTAINER, et les `.tsx` ne sont pas mutés :
   * c'est ici, et nulle part ailleurs, que le trou se bouche.
   */
  it('une relecture en vol n’affiche aucun indicateur de chargement par-dessus le menu', async () => {
    const user = userEvent.setup();
    let relectureEnVol = false;
    const { store, unmount } = renderWithStore({
      generateMenu: async () => aMenu(),
      listRecipes: () =>
        relectureEnVol ? new Promise<Recipe[]>(() => {}) : Promise.resolve(twoRecipes()),
    });

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    expect(await screen.findAllByText('Ratatouille')).toHaveLength(2);

    unmount();
    // Le remontage relance la relecture, qui ne se règle JAMAIS : l'écran reste sous une
    // lecture en vol aussi longtemps qu'on l'observe.
    relectureEnVol = true;
    renderOn(store);

    // GAGE de l'absence affirmée ensuite : le menu est bel et bien à l'écran, avec ses titres.
    // Sans lui, « pas d'indicateur » serait tout aussi vrai sur un écran vide.
    expect(await screen.findAllByText('Ratatouille')).toHaveLength(2);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('sans menu généré, arriver sur l’écran ne relit pas les recettes', async () => {
    let listCalls = 0;
    renderWithStore({
      listRecipes: async () => {
        listCalls += 1;
        return twoRecipes();
      },
    });

    // Le container est bien monté sur l'état « pas de menu » : sans ce gage, un compte à zéro
    // serait tout aussi vrai sur un écran qui ne s'est jamais affiché.
    expect(await screen.findByRole('button', { name: /générer un menu/i })).toBeInTheDocument();
    expect(listCalls).toBe(0);
  });

  /**
   * TRANCHE 2 — le jour de début est CHOISI. Le contrôle est le champ natif `<input type="date">` :
   * le système ouvre son propre sélecteur, localisé et accessible, et n'échange que des chaînes
   * `AAAA-MM-JJ`. Ni l'écran ni le container ne traduisent : la traduction vit dans `CalendarDate`.
   *
   * Le mercredi 2 septembre 2026 est choisi partout ici parce qu'il n'est PAS le prochain lundi
   * vu de l'horloge de test (24 août), ni celui de la lecture suivante (31 août) : un écran qui
   * reposerait le défaut au lieu de lire la préférence ne peut pas l'afficher.
   */
  it('affiche un champ « Début du menu » renseigné au prochain lundi', () => {
    renderWithStore({});

    expect(screen.getByLabelText('Début du menu')).toHaveValue('2026-08-24');
  });

  it('choisir une date de début, puis générer : le menu part de cette date', async () => {
    const user = userEvent.setup();
    const generate: GenerateMenu = async ({ dateDebut }) => menuDatedOn(dateDebut);
    renderWithStore({ generateMenu: generate, listRecipes: async () => twoRecipes() });

    choisirLaDateDeDebut('2026-09-02');
    expect(screen.getByLabelText('Début du menu')).toHaveValue('2026-09-02');

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    // La date choisie est descendue jusqu'à l'en-tête du premier jour : le mercredi 2 septembre
    // ne peut venir ni du défaut, ni d'un littéral du double.
    expect(await screen.findByText('mercredi 2 septembre')).toBeInTheDocument();
  });

  /**
   * Le champ de la branche `success` a son PROPRE câblage, comme le sélecteur segmenté avant lui :
   * `onStartDateChange: () => {}` sur cette branche-là laisserait verts tous les scénarios qui
   * partent de `idle`, pour un champ qui ne bouge pas sous le doigt. `MenuContainer.tsx` n'est
   * pas muté — ce trou ne se bouche qu'ici.
   */
  it('depuis le menu affiché, changer la date et régénérer : le menu repart de la nouvelle date', async () => {
    const user = userEvent.setup();
    const generate: GenerateMenu = async ({ dateDebut }) => menuDatedOn(dateDebut);
    renderWithStore({ generateMenu: generate, listRecipes: async () => twoRecipes() });

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    // GAGE : on part bien du prochain lundi affiché, sinon le changement affirmé ensuite serait
    // vrai sans qu'aucune saisie n'ait rien changé.
    expect(await screen.findByText('lundi 24 août')).toBeInTheDocument();

    choisirLaDateDeDebut('2026-09-02');
    expect(screen.getByLabelText('Début du menu')).toHaveValue('2026-09-02');

    await user.click(screen.getByRole('button', { name: /régénérer/i }));

    expect(await screen.findByText('mercredi 2 septembre')).toBeInTheDocument();
    expect(screen.queryByText('lundi 24 août')).not.toBeInTheDocument();
  });

  /**
   * Même règle que la fenêtre (issue #28) : la date de début est une PRÉFÉRENCE, elle vit dans le
   * store et survit au démontage du container. Dans un `useState`, un aller-retour vers le
   * catalogue la ramènerait au prochain lundi au-dessus d'un menu qui commence ailleurs.
   */
  it('la date de début choisie survit à un remontage sur le MÊME store', () => {
    const { store, unmount } = renderWithStore({});

    choisirLaDateDeDebut('2026-09-02');
    unmount();
    renderOn(store);

    expect(screen.getByLabelText('Début du menu')).toHaveValue('2026-09-02');
  });

  /**
   * LE PIÈGE de l'initialisation. Le port `Clock` ne promet rien entre deux lectures, et son
   * double AVANCE d'un jour à chaque appel : une date par défaut relue à chaque montage
   * changerait de semaine en cours de session — trois allers-retours vers le catalogue et le
   * menu proposerait le lundi 31 août sans que l'utilisateur ait rien touché.
   *
   * L'horloge n'est donc lue qu'UNE fois par session, à la naissance du store. Le compte
   * l'exige en forme permanente : un mécanisme qui relirait au montage le ferait grimper à 3,
   * et la valeur affichée dériverait avec lui.
   */
  it('n’interroge l’horloge qu’UNE fois par session, quel que soit le nombre de montages', () => {
    let lectures = 0;
    const clock = DriftingClock.startingOn(createCalendarDate({ year: 2026, month: 8, day: 23 }));
    const prochainLundi = nextMondayUseCase({ clock });
    const nextMonday: NextMonday = () => {
      lectures += 1;
      return prochainLundi();
    };
    const { store, unmount } = renderWithStore({ nextMonday });

    unmount();
    renderOn(store).unmount();
    renderOn(store);

    expect(lectures).toBe(1);
    expect(screen.getByLabelText('Début du menu')).toHaveValue('2026-08-24');
  });

  /**
   * TRANCHE 4b — le PLANCHER. Un menu ne peut pas démarrer dans le passé, et le champ ne propose
   * donc pas ce qui sera refusé : `min` porte AUJOURD'HUI, relu à chaque arrivée sur l'écran.
   * `min` reste un confort — il se contourne au clavier — le refus, lui, vit dans le slice.
   *
   * L'horloge de test DÉRIVE d'un jour par lecture, et voici le compte des lectures :
   *
   *   lecture 0 → dimanche 23 août (naissance du store, `nextMonday` → lundi 24 août)
   *   lecture 1 → lundi 24 août    (naissance du store, plancher initial)
   *   lecture 2 → mardi 25 août    (1er montage), lecture 3 → mercredi 26 août (2e montage)
   *
   * Une saisie consomme elle aussi une lecture, à sa place dans cet ordre.
   */
  const CONSTAT_PLANCHER = 'Le menu ne peut pas commencer avant aujourd’hui.';

  it('le champ ne propose aucun jour antérieur à aujourd’hui, relu à CHAQUE arrivée', () => {
    const { store, unmount } = renderWithStore({});

    // Lecture 2 : le plancher n'est ni le prochain lundi (24), ni la lecture de naissance (24).
    expect(screen.getByLabelText('Début du menu')).toHaveAttribute('min', '2026-08-25');

    unmount();
    renderOn(store);

    // Lecture 3 : un plancher figé à la naissance du store afficherait deux fois le 24 août.
    expect(screen.getByLabelText('Début du menu')).toHaveAttribute('min', '2026-08-26');
    // La date de début, elle, n'a pas bougé : le plancher n'est pas la date de début.
    expect(screen.getByLabelText('Début du menu')).toHaveValue('2026-08-24');
  });

  /**
   * Le champ natif se contourne au clavier : `min` n'empêche rien, c'est le slice qui refuse.
   * L'écran ne peut pas se taire pour autant — il montrerait alors la date saisie tout en
   * gardant l'autre, et se contredirait. Il revient donc à la date retenue ET dit pourquoi.
   */
  it('une date de début passée est refusée : le champ revient à la date retenue et l’écran le dit', () => {
    renderWithStore({});

    // Lecture 3 (le montage a pris la 2) → aujourd'hui = 26 août : le 20 est derrière.
    choisirLaDateDeDebut('2026-08-20');

    expect(screen.getByLabelText('Début du menu')).toHaveValue('2026-08-24');
    expect(screen.getByText(CONSTAT_PLANCHER)).toBeInTheDocument();
  });

  it('corriger la date efface le constat', () => {
    renderWithStore({});
    choisirLaDateDeDebut('2026-08-20');
    expect(screen.getByText(CONSTAT_PLANCHER)).toBeInTheDocument();

    choisirLaDateDeDebut('2026-09-02');

    expect(screen.getByLabelText('Début du menu')).toHaveValue('2026-09-02');
    expect(screen.queryByText(CONSTAT_PLANCHER)).not.toBeInTheDocument();
  });

  /**
   * Le constat est un état TRANSITOIRE dans un store qui, lui, est un singleton de session :
   * démonter le container ne le remet pas à zéro. Sans remise à zéro à l'arrivée, un aller-retour
   * vers le catalogue ramènerait « ne peut pas commencer avant aujourd’hui » au-dessus d'un champ
   * parfaitement valide — un message résiduel qui n'accuse plus aucune saisie.
   *
   * Le store est RÉUTILISÉ d'un montage à l'autre : un store neuf ne reproduirait pas le défaut.
   */
  it('le constat ne survit pas à un remontage sur le MÊME store', () => {
    const { store, unmount } = renderWithStore({});
    choisirLaDateDeDebut('2026-08-20');
    expect(screen.getByText(CONSTAT_PLANCHER)).toBeInTheDocument();

    unmount();
    renderOn(store);

    expect(screen.queryByText(CONSTAT_PLANCHER)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Début du menu')).toHaveValue('2026-08-24');
  });

  /**
   * Le champ de la branche `success` a son PROPRE câblage : `startDateRefused: false` en dur sur
   * cette branche-là laisserait verts tous les scénarios qui partent de `idle`, pour un écran qui
   * refuse en silence une fois le menu affiché. `MenuContainer.tsx` n'est pas muté — ce trou ne
   * se bouche qu'ici.
   */
  it('depuis le menu affiché, une date passée est refusée et l’écran le dit', async () => {
    const user = userEvent.setup();
    const generate: GenerateMenu = async ({ dateDebut }) => menuDatedOn(dateDebut);
    renderWithStore({ generateMenu: generate, listRecipes: async () => twoRecipes() });

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    expect(await screen.findByText('lundi 24 août')).toBeInTheDocument();

    choisirLaDateDeDebut('2026-08-20');

    expect(screen.getByLabelText('Début du menu')).toHaveValue('2026-08-24');
    expect(screen.getByText(CONSTAT_PLANCHER)).toBeInTheDocument();
  });

  /**
   * TRANCHE 3 — une recette du menu MÈNE à sa fiche. Le titre devient un lien, et l'adresse
   * inscrit la provenance : c'est elle, et rien d'autre, qui fera dire « ← Menu » au retour de la
   * fiche. La règle d'adressage vit dans un module pur et muté (`recipe-detail-origin.ts`) ; ce
   * scénario vérifie le CÂBLAGE, que la mutation ne voit pas — `MenuContainer.tsx` et
   * `MenuScreen.tsx` n'ont pour filet que la RTL.
   *
   * Les DEUX créneaux de « Ratatouille » sont exigés : le menu place r1 au lundi Midi et au mardi
   * Midi, et une implémentation qui ne lierait que la première occurrence resterait verte sur un
   * simple `getByRole`.
   */
  it('chaque recette du menu est un lien vers sa fiche, marquée comme venant du menu', async () => {
    const user = userEvent.setup();
    renderWithStore({ generateMenu: async () => aMenu(), listRecipes: async () => twoRecipes() });

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    await screen.findByText('lundi 24 août');

    const ratatouille = screen.getAllByRole('link', { name: 'Ratatouille' });
    expect(ratatouille).toHaveLength(2);
    for (const lien of ratatouille) {
      expect(lien).toHaveAttribute('href', '/catalogue/r1?depuis=menu');
    }
    expect(screen.getByRole('link', { name: 'Blanquette' })).toHaveAttribute(
      'href',
      '/catalogue/r2?depuis=menu',
    );
  });

  /**
   * TRANCHE 4a — le menu affiché s'ENREGISTRE, et l'écran le constate. Le constat est un état
   * TRANSITOIRE du store, qui est un singleton de session : c'est ici, et pas dans le slice, que
   * se vérifie ce qu'un cycle de montage en fait.
   */
  const CONSTAT_ENREGISTRE = 'Menu enregistré';
  const CONSTAT_PANNE = 'Aucune connexion — l’enregistrement du menu n’a pas pu être confirmé.';
  const CONSTAT_ECHEC = 'Impossible d’enregistrer le menu.';

  // Le bouton n'existe qu'une fois un menu à l'écran : tout scénario d'enregistrement passe
  // d'abord par une génération.
  async function genererLeMenu(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: /générer un menu/i }));
    await screen.findByRole('button', { name: /régénérer/i });
  }

  it('« Enregistrer » n’apparaît qu’une fois un menu affiché', async () => {
    const user = userEvent.setup();
    renderWithStore({ generateMenu: async () => aMenu(), listRecipes: async () => twoRecipes() });

    // L'écran d'accueil ne propose rien à enregistrer : il n'y a pas encore de menu.
    expect(screen.queryByRole('button', { name: /enregistrer/i })).not.toBeInTheDocument();

    await genererLeMenu(user);

    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeInTheDocument();
  });

  it('enregistrer le menu affiché : l’écran le constate, poliment', async () => {
    const user = userEvent.setup();
    renderWithStore({ generateMenu: async () => aMenu(), listRecipes: async () => twoRecipes() });
    await genererLeMenu(user);

    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    // `status` et non `alert` : un succès n'interrompt pas la lecture d'écran.
    expect(await screen.findByRole('status')).toHaveTextContent(CONSTAT_ENREGISTRE);
  });

  it('pendant l’enregistrement, « Enregistrer » est verrouillé — pas deux écritures concurrentes', async () => {
    const user = userEvent.setup();
    const enVol = deferred<void>();
    renderWithStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => twoRecipes(),
      saveMenu: () => enVol.promise,
    });
    await genererLeMenu(user);

    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeDisabled();

    // GAGE : le verrou n'est pas définitif — il retombe au règlement, avec le constat.
    enVol.resolve();
    expect(await screen.findByText(CONSTAT_ENREGISTRE)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeEnabled();
  });

  /**
   * Hors ligne, l'écriture est partie sans être acquittée : le constat ne demande RIEN à
   * l'utilisateur — pas de « Réessayer », dont le scénario d'échec de génération, plus haut,
   * montre qu'il sait apparaître ailleurs sur cet écran.
   */
  it('dépôt indisponible : l’écran dit que l’enregistrement n’est pas confirmé, sans rien réclamer', async () => {
    const user = userEvent.setup();
    renderWithStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => twoRecipes(),
      saveMenu: () => Promise.reject(RepositoryUnavailableError.create()),
    });
    await genererLeMenu(user);

    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(CONSTAT_PANNE);
    expect(screen.queryByRole('button', { name: /réessayer/i })).not.toBeInTheDocument();
    // Pas d'impasse : le bouton reste offert.
    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeEnabled();
  });

  it('échec franc du dépôt : l’écran alerte', async () => {
    const user = userEvent.setup();
    renderWithStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => twoRecipes(),
      saveMenu: () => Promise.reject(new Error('Boom')),
    });
    await genererLeMenu(user);

    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    // `alert` et non `status` : celui-là demande une action, contrairement au hors-ligne.
    expect(await screen.findByRole('alert')).toHaveTextContent(CONSTAT_ECHEC);
  });

  it('un nouvel essai réussi ne laisse aucune trace du constat d’échec', async () => {
    const user = userEvent.setup();
    let premier = true;
    const save: SaveMenu = async () => {
      if (premier) {
        premier = false;
        throw new Error('Boom');
      }
    };
    renderWithStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => twoRecipes(),
      saveMenu: save,
    });
    await genererLeMenu(user);

    await user.click(screen.getByRole('button', { name: /enregistrer/i }));
    expect(await screen.findByText(CONSTAT_ECHEC)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(await screen.findByText(CONSTAT_ENREGISTRE)).toBeInTheDocument();
    expect(screen.queryByText(CONSTAT_ECHEC)).not.toBeInTheDocument();
  });

  /**
   * Le constat acquitte un GESTE, et le store est un singleton de session : sans remise à zéro à
   * l'arrivée, un aller-retour vers le catalogue ramènerait « Menu enregistré » au-dessus d'un
   * menu que personne ne vient d'enregistrer. Le store est RÉUTILISÉ d'un montage à l'autre : un
   * store neuf ne reproduirait pas le défaut.
   */
  it('le constat d’enregistrement ne survit pas à un remontage sur le MÊME store', async () => {
    const user = userEvent.setup();
    const { store, unmount } = renderWithStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => twoRecipes(),
    });
    await genererLeMenu(user);
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));
    expect(await screen.findByText(CONSTAT_ENREGISTRE)).toBeInTheDocument();

    unmount();
    renderOn(store);

    // Le menu, LUI, est toujours là : sans ce gage, l'absence du constat serait tout aussi vraie
    // d'un écran qui aurait tout perdu.
    expect(await screen.findByText('lundi 24 août')).toBeInTheDocument();
    expect(screen.queryByText(CONSTAT_ENREGISTRE)).not.toBeInTheDocument();
  });

  /**
   * … et le remontage ne déverrouille PAS une écriture en vol. Un thunk RTK n'est pas annulé par
   * un démontage : réarmer le bouton ici rendrait un second appui possible sur un enregistrement
   * déjà parti.
   */
  it('un enregistrement en vol reste verrouillé après un remontage sur le MÊME store', async () => {
    const user = userEvent.setup();
    const enVol = deferred<void>();
    const { store, unmount } = renderWithStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => twoRecipes(),
      saveMenu: () => enVol.promise,
    });
    await genererLeMenu(user);
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    unmount();
    renderOn(store);

    expect(await screen.findByRole('button', { name: /enregistrer/i })).toBeDisabled();

    // GAGE : le verrou tombe au règlement, sur l'écran remonté — il n'est pas figé par principe.
    enVol.resolve();
    expect(await screen.findByText(CONSTAT_ENREGISTRE)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeEnabled();
  });

  /**
   * DEUX écritures en vol, et un seul verdict attendu. « Régénérer » n'est jamais verrouillé :
   * enregistrer, régénérer pendant que l'écriture est en vol, puis enregistrer le nouveau menu
   * met deux écritures en l'air — entièrement à la souris, la borne d'acquittement étant de 5 s.
   *
   * Le verdict de la PREMIÈRE, désavouée par la génération, ne doit pas être reçu comme celui de
   * la seconde : l'écran acquitterait un menu que personne n'a fini d'enregistrer, puis JETTERAIT
   * l'échec réel de l'écriture en cours. Un faux signal de succès, et une panne tue.
   */
  it('le verdict d’une écriture désavouée ne se fait pas passer pour celui de la suivante', async () => {
    const user = userEvent.setup();
    const premiere = deferred<void>();
    const seconde = deferred<void>();
    const enVol = [premiere, seconde];
    renderWithStore({
      generateMenu: async () => aMenu(),
      listRecipes: async () => twoRecipes(),
      saveMenu: () => enVol.shift()!.promise,
    });
    await genererLeMenu(user);

    await user.click(screen.getByRole('button', { name: /enregistrer/i }));
    // « Régénérer » n'est pas verrouillé : la première écriture reste en vol sous le nouveau menu.
    await user.click(screen.getByRole('button', { name: /régénérer/i }));
    await screen.findByRole('button', { name: /enregistrer/i });
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    // La PREMIÈRE aboutit : son verdict parle d'un menu qui n'est plus à l'écran.
    await act(async () => premiere.resolve());

    expect(screen.queryByText(CONSTAT_ENREGISTRE)).not.toBeInTheDocument();

    // La SECONDE échoue : c'est CE verdict-là que l'écran attend, et il ne doit pas être jeté.
    seconde.reject(new Error('Boom'));

    expect(await screen.findByText(CONSTAT_ECHEC)).toBeInTheDocument();
  });

  /**
   * Le repli « Recette inconnue » ne désigne aucune fiche : il n'y a rien vers quoi naviguer, et
   * la ligne ne doit donc pas être cliquable. Un lien vers une recette disparue mènerait à
   * « Recette introuvable » — un cul-de-sac fabriqué par l'écran lui-même.
   *
   * GAGE de l'absence : le créneau voisin, lui, EST un lien. Sans lui, « pas de lien » resterait
   * vrai d'un écran qui n'en produirait aucun.
   */
  it('la ligne d’une recette absente du catalogue n’est pas un lien', async () => {
    const user = userEvent.setup();
    const menu = createMenu({
      dateDebut: LUNDI_24_AOUT,
      repas: [
        createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'disparue' })] }),
        createRepas({ jour: 0, creneau: 'soir', slots: [createSlot({ recipeId: 'r2' })] }),
      ],
    });
    renderWithStore({ generateMenu: async () => menu, listRecipes: async () => twoRecipes() });

    await user.click(screen.getByRole('button', { name: /générer un menu/i }));

    expect(await screen.findByRole('link', { name: 'Blanquette' })).toBeInTheDocument();
    expect(screen.getByText('Recette inconnue')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Recette inconnue' })).not.toBeInTheDocument();
  });
});
