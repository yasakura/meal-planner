import { isCuid } from '@paralleldrive/cuid2';
import { describe, expect, it } from 'vitest';
import { IdGeneratorCuid2 } from './id-generator-cuid2';

describe('IdGeneratorCuid2', () => {
  it('generate() retourne une string non vide', () => {
    const generator = IdGeneratorCuid2.create();

    const id = generator.generate();

    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('deux appels successifs retournent des ids differents', () => {
    const generator = IdGeneratorCuid2.create();

    const first = generator.generate();
    const second = generator.generate();

    expect(first).not.toBe(second);
  });

  it('retourne un id au format cuid2 valide', () => {
    const generator = IdGeneratorCuid2.create();

    const id = generator.generate();

    expect(isCuid(id)).toBe(true);
  });
});
