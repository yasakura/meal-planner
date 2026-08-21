import { describe, expect, it } from 'vitest';

import { isRepositoryUnavailable } from '../domain/errors/repository-unavailable-error';
import { asDomainFailure } from './firestore-failure';

function firestoreError(code: string): Error {
  return Object.assign(new Error(`firestore: ${code}`), { code, name: 'FirebaseError' });
}

describe('asDomainFailure', () => {
  it('traduit une panne réseau du SDK en indisponibilité de dépôt', () => {
    expect(asDomainFailure(firestoreError('unavailable'))).toSatisfy(isRepositoryUnavailable);
  });

  it("ne traduit pas un refus de permission : l'erreur ressort à l'identique", () => {
    const refus = firestoreError('permission-denied');

    expect(asDomainFailure(refus)).toBe(refus);
  });

  it("ne traduit pas un document introuvable : l'erreur ressort à l'identique", () => {
    const introuvable = firestoreError('not-found');

    expect(asDomainFailure(introuvable)).toBe(introuvable);
  });

  it("ne traduit pas une erreur sans code, même si son message parle d'indisponibilité", () => {
    const sansCode = new Error('unavailable');

    expect(asDomainFailure(sansCode)).toBe(sansCode);
  });

  it("laisse passer une valeur rejetée qui n'est pas un objet, sans crasher la traduction", () => {
    expect(asDomainFailure('boom')).toBe('boom');
    expect(asDomainFailure(null)).toBeNull();
    expect(asDomainFailure(undefined)).toBeUndefined();
  });
});
