import { describe, it, expect } from 'vitest';

import { newConviveIdUseCase } from './new-convive-id';
import { StubIdGenerator } from '../test-doubles/stub-id-generator';

describe('newConviveIdUseCase', () => {
  it('rend l’identifiant produit par le IdGenerator', () => {
    const newConviveId = newConviveIdUseCase({
      idGenerator: StubIdGenerator.returning('id-connu-42'),
    });

    expect(newConviveId()).toBe('id-connu-42');
  });

  // Un identifiant MÉMORISÉ ferait écrire deux saisies successives dans le même document : le
  // second convive écraserait le premier. Chaque appel redemande donc au générateur.
  it('redemande un identifiant au générateur à CHAQUE appel', () => {
    const idGenerator = StubIdGenerator.returning('id-connu-42');
    const newConviveId = newConviveIdUseCase({ idGenerator });

    newConviveId();
    newConviveId();

    expect(idGenerator.callCount).toBe(2);
  });
});
