import { describe, it, expect } from 'vitest';
import { type Convive } from '../entities/convive';
import { createRepas, personneNeMangeAuRepas } from '../entities/repas';
import { createSlot } from '../entities/slot';
import { ConviveBuilder } from '../test-builders/convive.builder';
import { effectifDuRepas } from './effectif-du-repas';

const foyer = (): Convive[] => [
  ConviveBuilder.aConvive().withId('c-lionel').withName('Lionel').build(),
  ConviveBuilder.aConvive().withId('c-aurelie').withName('Aurélie').build(),
  ConviveBuilder.aConvive().withId('c-rory').withName('Rory').build(),
];

const repasAvec = (presence: { presents?: string[] | null; invites?: number }) =>
  createRepas({
    jour: 0,
    creneau: 'midi',
    slots: [createSlot({ recipeId: 'r1' })],
    ...presence,
  });

describe('effectifDuRepas', () => {
  it('un créneau auquel on n’a pas touché compte tout le foyer', () => {
    expect(effectifDuRepas(repasAvec({}), foyer())).toBe(3);
  });

  it('additionne les convives déclarés présents et les invités', () => {
    expect(
      effectifDuRepas(repasAvec({ presents: ['c-lionel', 'c-rory'], invites: 2 }), foyer()),
    ).toBe(4);
  });

  it('un créneau que personne ne mange vaut zéro sans lever', () => {
    expect(effectifDuRepas(repasAvec({ presents: [], invites: 0 }), foyer())).toBe(0);
  });

  it('un créneau sans aucun convive du foyer compte ses seuls invités', () => {
    expect(effectifDuRepas(repasAvec({ presents: [], invites: 3 }), foyer())).toBe(3);
  });

  it('les créneaux que personne ne mange sont exactement ceux dont l’effectif est nul', () => {
    const creneaux = [
      repasAvec({}),
      repasAvec({ presents: [], invites: 0 }),
      repasAvec({ presents: [], invites: 3 }),
      repasAvec({ presents: ['c-lionel'], invites: 0 }),
    ];

    expect(
      creneaux.map((repas) => [
        personneNeMangeAuRepas(repas),
        effectifDuRepas(repas, foyer()) === 0,
      ]),
    ).toEqual([
      [false, false],
      [true, true],
      [false, false],
      [false, false],
    ]);
  });
});
