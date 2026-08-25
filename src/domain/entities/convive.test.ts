import { describe, it, expect } from 'vitest';
import { conviveInitials } from './convive';
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

describe('initiales du convive', () => {
  const initialesDe = (name: string) =>
    conviveInitials(ConviveBuilder.aConvive().withName(name).build());

  it('un prénom simple donne ses deux premières lettres en capitales', () => {
    expect(initialesDe('Aurélie')).toBe('AU');
  });

  it('un prénom composé donne l’initiale de chacune de ses parties', () => {
    expect(initialesDe('Jean-Marc')).toBe('JM');
  });

  it('un prénom en deux mots donne l’initiale de chaque mot', () => {
    expect(initialesDe('Marie Claire')).toBe('MC');
  });

  it('un prénom d’une seule lettre n’en invente pas une seconde', () => {
    expect(initialesDe('A')).toBe('A');
  });

  it('un prénom en trois parties ne donne que deux lettres', () => {
    expect(initialesDe('Jean-Luc Picard')).toBe('JL');
  });

  it('des séparateurs répétés ne fabriquent pas de partie vide', () => {
    expect(initialesDe('Marie  Claire')).toBe('MC');
  });

  it('un prénom terminé par un tiret garde ses deux premières lettres', () => {
    expect(initialesDe('Anne-')).toBe('AN');
  });

  it('un nom fait de séparateurs ne donne aucune initiale', () => {
    expect(initialesDe('-')).toBe('');
  });

  it('les capitales gardent leur accent', () => {
    expect(initialesDe('Élodie')).toBe('ÉL');
  });
});
