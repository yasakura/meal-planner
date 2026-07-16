import { describe, expect, it } from 'vitest';
import { MathRandomPicker } from './math-random-picker';

describe('MathRandomPicker', () => {
  it('random() = 0 retourne l index 0', () => {
    const picker = MathRandomPicker.create(() => 0);

    expect(picker.nextIndex(4)).toBe(0);
  });

  it('random() proche de 1 retourne le dernier index (size - 1)', () => {
    const picker = MathRandomPicker.create(() => 0.999999);

    expect(picker.nextIndex(4)).toBe(3);
  });

  it('applique floor(random() * size) sur une valeur intermediaire', () => {
    const picker = MathRandomPicker.create(() => 0.5);

    expect(picker.nextIndex(4)).toBe(2);
  });

  it('consomme la source d aleatoire a chaque appel', () => {
    const sequence: number[] = [0, 0.5, 0.999999];
    let call = 0;
    const picker = MathRandomPicker.create(() => sequence[call++] ?? 0);

    expect(picker.nextIndex(4)).toBe(0);
    expect(picker.nextIndex(4)).toBe(2);
    expect(picker.nextIndex(4)).toBe(3);
  });

  it('utilise Math.random par defaut : index dans [0, size[', () => {
    const picker = MathRandomPicker.create();

    for (let i = 0; i < 100; i += 1) {
      const index = picker.nextIndex(5);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(5);
      expect(Number.isInteger(index)).toBe(true);
    }
  });
});
