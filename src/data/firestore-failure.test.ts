import { describe, expect, it } from 'vitest';

import { isRepositoryUnavailable } from '../domain/errors/repository-unavailable-error';
import { asDomainFailure } from './firestore-failure';

// Une erreur du SDK Firestore telle qu'elle arrive à un adapter : c'est le `code` qui porte
// la nature du problème, jamais le message.
function firestoreError(code: string): Error {
  return Object.assign(new Error(`firestore: ${code}`), { code, name: 'FirebaseError' });
}

describe('asDomainFailure', () => {
  // La seule raison d'être du module : le domaine ne doit jamais voir passer une
  // FirebaseError, et l'UI a besoin d'un critère unique pour choisir « aucune connexion ».
  it('traduit une panne réseau du SDK en indisponibilité de dépôt', () => {
    expect(asDomainFailure(firestoreError('unavailable'))).toSatisfy(isRepositoryUnavailable);
  });

  // Jeu DISCRIMINANT : sans cette contrainte, tout rejet deviendrait une indisponibilité et
  // l'app dirait « aucune connexion » à quelqu'un qui a du réseau mais pas le droit de lire.
  it("ne traduit pas un refus de permission : l'erreur ressort à l'identique", () => {
    const refus = firestoreError('permission-denied');

    expect(asDomainFailure(refus)).toBe(refus);
  });

  it("ne traduit pas un document introuvable : l'erreur ressort à l'identique", () => {
    const introuvable = firestoreError('not-found');

    expect(asDomainFailure(introuvable)).toBe(introuvable);
  });

  // Le mot « unavailable » dans un message ne prouve rien : c'est le `code` qui fait foi.
  // Sans cette distinction, une erreur applicative bavarde passerait pour une panne réseau.
  it("ne traduit pas une erreur sans code, même si son message parle d'indisponibilité", () => {
    const sansCode = new Error('unavailable');

    expect(asDomainFailure(sansCode)).toBe(sansCode);
  });

  // Le canal de rejet n'est pas typé : le SDK, un intercepteur ou un mock peuvent rejeter
  // autre chose qu'un objet. La traduction doit répondre « ce n'est pas une indisponibilité »
  // et laisser passer, jamais transformer un rejet propre en TypeError obscur.
  it("laisse passer une valeur rejetée qui n'est pas un objet, sans crasher la traduction", () => {
    expect(asDomainFailure('boom')).toBe('boom');
    expect(asDomainFailure(null)).toBeNull();
    expect(asDomainFailure(undefined)).toBeUndefined();
  });
});
