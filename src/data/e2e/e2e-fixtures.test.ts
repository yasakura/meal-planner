import { describe, it, expect } from 'vitest';

import { E2E_RECIPES } from './e2e-fixtures';

describe('E2E_RECIPES', () => {
  it('compte TROIS recettes, cardinalité dont trois scénarios de e2e/menu.spec.ts tirent la répartition 10 + 9 + 9 des 28 créneaux du menu', () => {
    expect(E2E_RECIPES).toHaveLength(3);
  });
});
