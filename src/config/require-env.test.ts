import { describe, it, expect } from 'vitest';

import { requireEnv } from './require-env';

describe('requireEnv', () => {
  it('retourne la valeur quand la variable est renseignée', () => {
    expect(requireEnv('AIzaSyDemo42', 'VITE_FIREBASE_API_KEY')).toBe('AIzaSyDemo42');
  });

  it("lève une erreur qui nomme la variable quand elle est absente de l'environnement", () => {
    expect(() => requireEnv(undefined, 'VITE_FIREBASE_API_KEY')).toThrow(
      "Variable d'environnement Firebase manquante : VITE_FIREBASE_API_KEY",
    );
  });

  it('lève une erreur qui nomme la variable quand elle est présente mais vide', () => {
    expect(() => requireEnv('', 'VITE_FIREBASE_PROJECT_ID')).toThrow(
      "Variable d'environnement Firebase manquante : VITE_FIREBASE_PROJECT_ID",
    );
  });
});
