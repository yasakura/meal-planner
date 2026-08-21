import { describe, it, expect } from 'vitest';

import { newRecipeIdUseCase } from './new-recipe-id';
import { StubIdGenerator } from '../test-doubles/stub-id-generator';

describe('newRecipeIdUseCase', () => {
  it('rend l’identifiant produit par le IdGenerator', () => {
    const newRecipeId = newRecipeIdUseCase({
      idGenerator: StubIdGenerator.returning('id-connu-42'),
    });

    expect(newRecipeId()).toBe('id-connu-42');
  });

  it('redemande un identifiant au générateur à CHAQUE appel', () => {
    const idGenerator = StubIdGenerator.returning('id-connu-42');
    const newRecipeId = newRecipeIdUseCase({ idGenerator });

    newRecipeId();
    newRecipeId();

    expect(idGenerator.callCount).toBe(2);
  });
});
