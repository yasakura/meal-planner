import { describe, it, expect } from 'vitest';

import {
  RepositoryUnavailableError,
  isRepositoryUnavailable,
} from './repository-unavailable-error';

describe('RepositoryUnavailableError', () => {
  it('est reconnue comme une indisponibilité de dépôt', () => {
    expect(isRepositoryUnavailable(RepositoryUnavailableError.create())).toBe(true);
  });

  it("n'assimile pas une erreur quelconque à une indisponibilité", () => {
    expect(isRepositoryUnavailable(new Error('permission-denied'))).toBe(false);
  });

  it('reste reconnaissable après avoir perdu son prototype (copie sérialisée)', () => {
    const original = RepositoryUnavailableError.create();
    const serialized = { name: original.name, message: original.message, stack: original.stack };

    expect(isRepositoryUnavailable(serialized)).toBe(true);
  });

  it("n'accepte pas un objet dépourvu de nom : le jeton nominal doit être distinctif", () => {
    expect(isRepositoryUnavailable({ name: '' })).toBe(false);
  });

  it("ne reconnaît ni null ni une valeur qui n'est pas un objet", () => {
    expect(isRepositoryUnavailable(null)).toBe(false);
    expect(isRepositoryUnavailable('RepositoryUnavailableError')).toBe(false);
  });
});
