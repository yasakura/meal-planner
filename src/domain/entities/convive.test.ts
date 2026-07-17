import { describe, it, expect } from 'vitest';
import { ConviveBuilder } from '../test-builders/convive.builder';

describe('Convive', () => {
  it('se crée valide et expose id et name', () => {
    const convive = ConviveBuilder.aConvive().withId('convive-42').withName('Lionel').build();

    expect(convive.id).toBe('convive-42');
    expect(convive.name).toBe('Lionel');
  });

  it('rejette un id vide avec un message explicite', () => {
    expect(() => ConviveBuilder.aConvive().withoutId().build()).toThrow(
      "L'identifiant du convive est obligatoire",
    );
  });

  it("rejette un id composé uniquement d'espaces", () => {
    expect(() => ConviveBuilder.aConvive().withId('   ').build()).toThrow(
      "L'identifiant du convive est obligatoire",
    );
  });

  it('rejette un name vide avec un message explicite', () => {
    expect(() => ConviveBuilder.aConvive().withoutName().build()).toThrow(
      'Le nom du convive est obligatoire',
    );
  });

  it("rejette un name composé uniquement d'espaces", () => {
    expect(() => ConviveBuilder.aConvive().withName('   ').build()).toThrow(
      'Le nom du convive est obligatoire',
    );
  });

  it('stocke le name trimé en préservant la casse', () => {
    const convive = ConviveBuilder.aConvive().withName('  Aurélie MARTIN  ').build();

    expect(convive.name).toBe('Aurélie MARTIN');
  });

  it('gèle le convive (immuable au runtime)', () => {
    const convive = ConviveBuilder.aConvive().build();

    expect(Object.isFrozen(convive)).toBe(true);
  });
});
