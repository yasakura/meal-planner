import { describe, it, expect } from 'vitest';

import { SequentialIdGenerator } from './sequential-id-generator';

describe('SequentialIdGenerator', () => {
  it('numérote à partir de 1 et incrémente à chaque appel', () => {
    const generator = SequentialIdGenerator.withPrefix('e2e-convive');

    expect([generator.generate(), generator.generate(), generator.generate()]).toEqual([
      'e2e-convive-1',
      'e2e-convive-2',
      'e2e-convive-3',
    ]);
  });

  it('préfixe chaque id, pour que deux générateurs ne produisent jamais le même', () => {
    const convives = SequentialIdGenerator.withPrefix('e2e-convive');
    const recipes = SequentialIdGenerator.withPrefix('e2e-recipe');

    expect(convives.generate()).toBe('e2e-convive-1');
    expect(recipes.generate()).toBe('e2e-recipe-1');
  });
});
