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
    // Jeu DISCRIMINANT : sans cette contrainte, `isRepositoryUnavailable` pourrait
    // répondre `true` à tout et l'app afficherait « hors ligne » sur un refus de
    // permission — deux constats qui n'appellent pas la même action.
    expect(isRepositoryUnavailable(new Error('permission-denied'))).toBe(false);
  });

  it('reste reconnaissable après avoir perdu son prototype (copie sérialisée)', () => {
    const original = RepositoryUnavailableError.create();
    // Redux Toolkit ne stocke JAMAIS l'instance d'erreur dans le store : `createAsyncThunk`
    // la remplace par une copie plate (`miniSerializeError` — name/message/stack/code).
    // Un `instanceof` seul ne survivrait pas à ce passage, et le slice convives ne pourrait
    // plus distinguer une indisponibilité d'un échec quelconque.
    const serialized = { name: original.name, message: original.message, stack: original.stack };

    expect(isRepositoryUnavailable(serialized)).toBe(true);
  });

  it("n'accepte pas un objet dépourvu de nom : le jeton nominal doit être distinctif", () => {
    // Jeu DISCRIMINANT : le garde compare un `name` à un jeton. Si ce jeton était vide,
    // n'importe quel objet anonyme deviendrait une indisponibilité.
    expect(isRepositoryUnavailable({ name: '' })).toBe(false);
  });

  it("ne reconnaît ni null ni une valeur qui n'est pas un objet", () => {
    // Le canal de rejet n'est pas typé : n'importe quelle valeur peut arriver ici.
    expect(isRepositoryUnavailable(null)).toBe(false);
    expect(isRepositoryUnavailable('RepositoryUnavailableError')).toBe(false);
  });
});
