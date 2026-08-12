import { describe, it, expect } from 'vitest';

import { addConvive, loadConvives, selectConvives } from '../features/convives/convives-slice';
import { createTestStore } from './create-test-store';

describe('createTestStore', () => {
  // Le store de test doit refléter le câblage de prod (create-app-store partage un
  // repository unique) : sinon un test « ajoute puis recharge » serait faussement vert.
  it('câble les use-cases convives sur un même repository : un convive ajouté est retrouvé au rechargement', async () => {
    const store = createTestStore();

    await store.dispatch(addConvive({ name: 'Rory' }));
    await store.dispatch(loadConvives());

    expect(selectConvives(store.getState()).convives.map((convive) => convive.name)).toEqual([
      'Rory',
    ]);
  });
});
