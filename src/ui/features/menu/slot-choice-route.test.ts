import { matchPath } from 'react-router-dom';
import { describe, it, expect } from 'vitest';

import { SLOT_CHOICE_ROUTE, slotAddressOf, slotChoiceHref } from './slot-choice-route';

describe('l’adresse d’un créneau dans l’URL', () => {
  it('désigne le créneau par son rang de repas puis son rang de créneau, sous le brouillon', () => {
    expect(slotChoiceHref({ repasIndex: 2, slotIndex: 1 })).toBe('/menu/nouveau/choisir/2/1');
  });

  it('se relit telle qu’elle a été écrite : la route, le lien et la lecture s’accordent', () => {
    const href = slotChoiceHref({ repasIndex: 3, slotIndex: 1 });

    const params = matchPath(SLOT_CHOICE_ROUTE, href)?.params;

    expect(params).toEqual({ repasIndex: '3', slotIndex: '1' });
    expect(slotAddressOf(params ?? {})).toEqual({ repasIndex: 3, slotIndex: 1 });
  });

  it('ne désigne aucun rang quand l’URL porte autre chose qu’un nombre', () => {
    const address = slotAddressOf({ repasIndex: 'lundi', slotIndex: '0' });

    expect(Number.isNaN(address.repasIndex)).toBe(true);
    expect(address.slotIndex).toBe(0);
  });

  it('ne désigne aucun rang quand l’URL ne porte rien', () => {
    const address = slotAddressOf({});

    expect(Number.isNaN(address.repasIndex)).toBe(true);
    expect(Number.isNaN(address.slotIndex)).toBe(true);
  });
});
