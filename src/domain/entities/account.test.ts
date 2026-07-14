import { describe, it, expect } from 'vitest';
import { AccountBuilder } from '../test-builders/account.builder';

describe('Account', () => {
  it('se crée valide et expose id et email', () => {
    const account = AccountBuilder.anAccount()
      .withId('uid-firebase-123')
      .withEmail('aurelie@foyer.test')
      .build();

    expect(account.id).toBe('uid-firebase-123');
    expect(account.email).toBe('aurelie@foyer.test');
  });

  it('rejette un id vide avec un message explicite', () => {
    expect(() => AccountBuilder.anAccount().withoutId().build()).toThrow(
      "L'identifiant du compte est obligatoire",
    );
  });

  it("rejette un id composé uniquement d'espaces", () => {
    expect(() => AccountBuilder.anAccount().withId('   ').build()).toThrow(
      "L'identifiant du compte est obligatoire",
    );
  });

  it('rejette un email vide avec un message explicite', () => {
    expect(() => AccountBuilder.anAccount().withoutEmail().build()).toThrow(
      "L'email du compte est obligatoire",
    );
  });

  it("rejette un email composé uniquement d'espaces", () => {
    expect(() => AccountBuilder.anAccount().withEmail('   ').build()).toThrow(
      "L'email du compte est obligatoire",
    );
  });

  it("stocke l'email trimé en préservant la casse", () => {
    const account = AccountBuilder.anAccount().withEmail('  Aurelie@Foyer.Test  ').build();

    expect(account.email).toBe('Aurelie@Foyer.Test');
  });

  it("stocke l'id trimé", () => {
    const account = AccountBuilder.anAccount().withId('  uid-123  ').build();

    expect(account.id).toBe('uid-123');
  });

  it('retourne un Account gelé (immuable au runtime, pas seulement readonly compile-time)', () => {
    const account = AccountBuilder.anAccount().build();

    expect(Object.isFrozen(account)).toBe(true);
  });
});
