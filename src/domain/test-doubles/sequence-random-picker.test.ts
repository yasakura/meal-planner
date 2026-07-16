import { describe, it, expect } from 'vitest';
import { SequenceRandomPicker } from './sequence-random-picker';

describe('SequenceRandomPicker', () => {
  it('rend les index dans l’ordre fixé, appel après appel', () => {
    const picker = SequenceRandomPicker.returning(2, 0, 1);

    expect(picker.nextIndex(3)).toBe(2);
    expect(picker.nextIndex(3)).toBe(0);
    expect(picker.nextIndex(3)).toBe(1);
  });

  it('lève si la séquence contrôlée est épuisée', () => {
    const picker = SequenceRandomPicker.returning(0);

    picker.nextIndex(1);

    expect(() => picker.nextIndex(1)).toThrow('SequenceRandomPicker: séquence épuisée');
  });

  it('lève si l’index contrôlé dépasse la taille de la collection', () => {
    const picker = SequenceRandomPicker.returning(3);

    expect(() => picker.nextIndex(2)).toThrow('SequenceRandomPicker: index hors bornes');
  });
});
