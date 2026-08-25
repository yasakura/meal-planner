import { describe, it, expect } from 'vitest';

import { seededShuffle } from './seeded-shuffle';

const quatre = ['a', 'b', 'c', 'd'];

describe('seededShuffle', () => {
  it('rend, pour quatre éléments, la permutation que sa graine détermine', () => {
    expect(seededShuffle(quatre)).toEqual(['c', 'd', 'a', 'b']);
  });

  it('rend, pour six éléments, la permutation que sa graine détermine', () => {
    expect(seededShuffle(['a', 'b', 'c', 'd', 'e', 'f'])).toEqual(['b', 'e', 'd', 'f', 'a', 'c']);
  });

  it('rend un ordre qui n’est ni celui reçu ni son renversement', () => {
    const melange = seededShuffle(quatre);

    expect(melange).not.toEqual(['a', 'b', 'c', 'd']);
    expect(melange).not.toEqual(['d', 'c', 'b', 'a']);
  });

  it('déplace le premier élément reçu : aucun appelant ne peut le lire en tête', () => {
    expect(seededShuffle(quatre)[0]).not.toBe('a');
  });

  it('rend deux fois le même ordre pour la même entrée : le mélange est reproductible', () => {
    expect(seededShuffle(quatre)).toEqual(seededShuffle(quatre));
  });

  it('rend exactement les éléments reçus, sans perte ni doublon', () => {
    expect([...seededShuffle(quatre)].sort()).toEqual(quatre);
  });

  it('échange les deux éléments d’une paire, plutôt que de les rendre dans l’ordre reçu', () => {
    expect(seededShuffle(['a', 'b'])).toEqual(['b', 'a']);
  });

  it('ne mute pas le tableau reçu', () => {
    const recu = [...quatre];

    seededShuffle(recu);

    expect(recu).toEqual(quatre);
  });
});
