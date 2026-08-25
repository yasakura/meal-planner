import { describe, it, expect } from 'vitest';

import { createCalendarDate } from '../../../domain/entities/calendar-date';
import { type Convive } from '../../../domain/entities/convive';
import { createMenu, type Menu } from '../../../domain/entities/menu';
import { createRepas, type Repas, type RepasProps } from '../../../domain/entities/repas';
import { createSlot } from '../../../domain/entities/slot';
import { ConviveBuilder } from '../../../domain/test-builders/convive.builder';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { FROM_MENU_DRAFT } from '../catalogue/recipe-detail-origin';
import { menuDays } from './menu-days';
import { presenceAvecConviveBascule, presenceAvecInvites, withPresence } from './repas-presence';

const LUNDI_24_AOUT = createCalendarDate({ year: 2026, month: 8, day: 24 });

const AURELIE = ConviveBuilder.aConvive().withId('c-au').withName('Aurélie').build();
const LIONEL = ConviveBuilder.aConvive().withId('c-li').withName('Lionel').build();

function foyer(): Convive[] {
  return [AURELIE, LIONEL];
}

function unRepas(props: Partial<RepasProps>): Repas {
  return createRepas({
    jour: 0,
    creneau: 'midi',
    slots: [createSlot({ recipeId: 'r1' })],
    ...props,
  });
}

function menuOf(repas: Repas[]): Menu {
  return createMenu({ dateDebut: LUNDI_24_AOUT, repas });
}

function joursAvecPresence(menu: Menu, convives: Convive[]) {
  const recipes = [
    RecipeBuilder.aRecipe().withId('r1').withTitle('Ratatouille').build(),
    RecipeBuilder.aRecipe().withId('r2').withTitle('Blanquette').build(),
  ];
  return withPresence(menuDays(menu, recipes, FROM_MENU_DRAFT), menu, convives);
}

function presenceDeLaLigne(menu: Menu, convives: Convive[], rang = 0) {
  return joursAvecPresence(menu, convives).at(0)?.slots.at(rang)?.presence;
}

describe('withPresence — qui mange, sur chaque ligne du brouillon', () => {
  it('le repas dont personne n’a été désigné montre tout le foyer présent, en ronds de deux lettres', () => {
    const presence = presenceDeLaLigne(menuOf([unRepas({})]), foyer());

    expect(presence?.chips.map((chip) => [chip.initials, chip.present])).toEqual([
      ['AU', true],
      ['LI', true],
    ]);
  });

  it('le repas aux présents désignés montre absent celui qui n’y est pas, et présent celui qui y est', () => {
    const presence = presenceDeLaLigne(menuOf([unRepas({ presents: ['c-li'] })]), foyer());

    expect(presence?.chips.map((chip) => [chip.initials, chip.present])).toEqual([
      ['AU', false],
      ['LI', true],
    ]);
  });

  it('chaque rond s’annonce par le nom du convive et le repas qu’il bascule, et porte l’identité du convive', () => {
    const presence = presenceDeLaLigne(menuOf([unRepas({ creneau: 'soir' })]), foyer());

    expect(presence?.chips.map((chip) => [chip.id, chip.label])).toEqual([
      ['c-au', 'Aurélie au repas de lundi 24 août, Soir'],
      ['c-li', 'Lionel au repas de lundi 24 août, Soir'],
    ]);
  });

  it('les commandes d’invités s’annoncent par le repas qu’elles visent', () => {
    const presence = presenceDeLaLigne(menuOf([unRepas({})]), foyer());

    expect(presence?.addInviteLabel).toBe('Ajouter un invité au repas de lundi 24 août, Midi');
    expect(presence?.removeInviteLabel).toBe('Retirer un invité au repas de lundi 24 août, Midi');
  });

  it('le compteur d’invités reste au singulier jusqu’à un invité, et passe au pluriel au-delà', () => {
    const compteurPour = (invites: number) =>
      presenceDeLaLigne(menuOf([unRepas({ invites })]), foyer())?.invitesLabel;

    expect(compteurPour(0)).toBe('0 invité');
    expect(compteurPour(1)).toBe('1 invité');
    expect(compteurPour(2)).toBe('2 invités');
  });

  it('le retrait d’un invité est verrouillé quand le repas n’en compte aucun, et ouvert dès qu’il en compte un', () => {
    const verrouPour = (invites: number) =>
      presenceDeLaLigne(menuOf([unRepas({ invites })]), foyer())?.removeInviteDisabled;

    expect(verrouPour(0)).toBe(true);
    expect(verrouPour(1)).toBe(false);
  });

  it('chaque ligne porte le rang de SON repas', () => {
    const menu = menuOf([
      unRepas({ jour: 0, creneau: 'midi' }),
      unRepas({ jour: 0, creneau: 'soir' }),
    ]);

    const rangs = joursAvecPresence(menu, foyer())
      .at(0)
      ?.slots.map((slot) => slot.presence?.repasIndex);

    expect(rangs).toEqual([0, 1]);
  });

  it('les deux recettes d’un même repas portent la présence de ce repas, et le même rang', () => {
    const menu = menuOf([
      unRepas({ slots: [createSlot({ recipeId: 'r1' }), createSlot({ recipeId: 'r2' })] }),
    ]);

    const lignes = joursAvecPresence(menu, foyer()).at(0)?.slots ?? [];

    expect(lignes.map((slot) => slot.presence?.repasIndex)).toEqual([0, 0]);
    expect(lignes.map((slot) => slot.title)).toEqual(['Ratatouille', 'Blanquette']);
  });

  it('un foyer sans convive ne montre aucun rond, là où un foyer de deux en montre deux, et garde son compteur d’invités', () => {
    const menu = menuOf([unRepas({ invites: 2 })]);

    expect(presenceDeLaLigne(menu, [])?.chips).toEqual([]);
    expect(presenceDeLaLigne(menu, foyer())?.chips).toHaveLength(2);
    expect(presenceDeLaLigne(menu, [])?.invitesLabel).toBe('2 invités');
  });
});

describe('presenceAvecConviveBascule — basculer un convive sur un repas', () => {
  it('sur un repas que tout le foyer mange, retire le seul convive basculé et garde les autres', () => {
    expect(presenceAvecConviveBascule(unRepas({}), foyer(), 'c-au')).toEqual({
      presents: ['c-li'],
      invites: 0,
    });
  });

  it('rend présent un convive absent, sans déloger ceux qui l’étaient déjà', () => {
    expect(presenceAvecConviveBascule(unRepas({ presents: ['c-li'] }), foyer(), 'c-au')).toEqual({
      presents: ['c-li', 'c-au'],
      invites: 0,
    });
  });

  it('retire d’une liste désignée le convive basculé, jusqu’à ne laisser personne', () => {
    expect(presenceAvecConviveBascule(unRepas({ presents: ['c-au'] }), foyer(), 'c-au')).toEqual({
      presents: [],
      invites: 0,
    });
  });

  it('laisse les invités du repas intacts', () => {
    expect(presenceAvecConviveBascule(unRepas({ invites: 3 }), foyer(), 'c-au').invites).toBe(3);
  });
});

describe('presenceAvecInvites — compter les invités d’un repas', () => {
  it('porte le nombre d’invités demandé', () => {
    expect(presenceAvecInvites(unRepas({ invites: 1 }), 2).invites).toBe(2);
  });

  it('ne dit rien des présents d’un repas dont personne n’a été désigné', () => {
    expect(presenceAvecInvites(unRepas({}), 1).presents).toBeNull();
  });

  it('garde la liste désignée des présents', () => {
    expect(presenceAvecInvites(unRepas({ presents: ['c-li'] }), 1).presents).toEqual(['c-li']);
  });
});
