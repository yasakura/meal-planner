import { describe, expect, it } from 'vitest';
import { ConviveBuilder } from '../domain/test-builders/convive.builder';
import { conviveToDocument, documentToConvive, type ConviveDocument } from './convive-mapper';

describe('convive-mapper', () => {
  it('round-trip: documentToConvive(conviveToDocument(convive)) reproduit le convive', () => {
    const convive = ConviveBuilder.aConvive().withId('convive-42').withName('Aurélie').build();

    const roundTripped = documentToConvive(convive.id, conviveToDocument(convive));

    expect(roundTripped).toEqual(convive);
  });

  it('conviveToDocument produit un objet plat sans id, avec le seul champ name', () => {
    const convive = ConviveBuilder.aConvive().withId('convive-99').withName('Benoît').build();

    const doc = conviveToDocument(convive);

    expect(doc).not.toHaveProperty('id');
    expect(doc.name).toBe('Benoît');
    expect(Object.keys(doc)).toEqual(['name']);
  });

  describe('documentToConvive re-valide structure ET valeurs des données non fiables', () => {
    it('data non-objet (null) → throw structurel', () => {
      const data: unknown = null;

      expect(() => documentToConvive('convive-1', data)).toThrow(
        'Document convive invalide : la donnée doit être un objet',
      );
    });

    it('data primitif non-null (string) → throw « la donnée doit être un objet », pas le garde name', () => {
      const data: unknown = 'pas-un-objet';

      expect(() => documentToConvive('convive-1', data)).toThrow(
        'Document convive invalide : la donnée doit être un objet',
      );
    });

    it('data primitif non-null (number) → throw « la donnée doit être un objet », pas le garde name', () => {
      const data: unknown = 42;

      expect(() => documentToConvive('convive-1', data)).toThrow(
        'Document convive invalide : la donnée doit être un objet',
      );
    });

    it('name non-string (number) → throw structurel', () => {
      const data: unknown = { name: 123 };

      expect(() => documentToConvive('convive-1', data)).toThrow(
        'Document convive invalide : le nom doit être une chaîne de caractères',
      );
    });

    it('name vide → throw de la factory domaine (createConvive)', () => {
      const doc: ConviveDocument = { name: '' };

      expect(() => documentToConvive('convive-1', doc)).toThrow(
        'Le nom du convive est obligatoire',
      );
    });
  });
});
