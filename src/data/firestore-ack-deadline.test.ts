import { describe, expect, it, vi } from 'vitest';

import { isRepositoryUnavailable } from '../domain/errors/repository-unavailable-error';
import { withAckDeadline } from './firestore-ack-deadline';

// Une erreur du SDK Firestore telle qu'elle arrive à un adapter : c'est le `code` qui porte
// la nature du problème, jamais le message.
function firestoreError(code: string): Error {
  return Object.assign(new Error(`firestore: ${code}`), { code, name: 'FirebaseError' });
}

describe('withAckDeadline', () => {
  it("rend la valeur acquittée par l'écriture", async () => {
    await expect(withAckDeadline(Promise.resolve('acquitté'), 5000)).resolves.toBe('acquitté');
  });

  // La raison d'être du module : hors ligne, `setDoc` et `deleteDoc` ne rejettent pas, ils
  // mettent l'écriture en file locale et n'acquittent qu'au serveur — la promesse ne se règle
  // JAMAIS. Sans borne, l'écran reste figé sur « enregistrement en cours », sans un mot.
  it(
    "déclare non confirmée une écriture que le serveur n'a pas acquittée dans la borne",
    { timeout: 1000 },
    async () => {
      await expect(withAckDeadline(new Promise(() => {}), 10)).rejects.toSatisfy(
        isRepositoryUnavailable,
      );
    },
  );

  // Une écriture qui rejette AVANT l'échéance passe par la traduction commune : laisser
  // remonter la FirebaseError brute ferait passer une panne réseau pour un échec définitif,
  // et le formulaire se réarmerait alors que l'écriture peut encore aboutir.
  it('traduit une écriture refusée faute de réseau en indisponibilité de dépôt', async () => {
    await expect(
      withAckDeadline(Promise.reject(firestoreError('unavailable')), 5000),
    ).rejects.toSatisfy(isRepositoryUnavailable);
  });

  // Jeu DISCRIMINANT : sans cette contrainte, tout rejet deviendrait une indisponibilité et
  // l'app dirait « aucune connexion » à quelqu'un qui a du réseau mais pas le droit d'écrire.
  it("ne traduit pas un refus de permission : l'erreur remonte telle quelle", async () => {
    const refus = firestoreError('permission-denied');

    await expect(withAckDeadline(Promise.reject(refus), 5000)).rejects.toBe(refus);
  });

  // La borne d'attente ne doit pas survivre à l'écriture qu'elle surveille : sans nettoyage,
  // chaque écriture réussie laisserait un timer de 5 s derrière elle.
  it("ne laisse aucune borne en suspens une fois l'écriture acquittée", async () => {
    vi.useFakeTimers();
    try {
      await withAckDeadline(Promise.resolve(undefined), 5000);
      await Promise.resolve();

      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  // Le chemin de REJET a exactement le même besoin, et rien ne le disait : une écriture refusée
  // vite laisserait sinon un timer de 5 s derrière elle, à chaque tentative.
  it("ne laisse aucune borne en suspens une fois l'écriture REFUSÉE", async () => {
    vi.useFakeTimers();
    try {
      const refus = firestoreError('permission-denied');
      await expect(withAckDeadline(Promise.reject(refus), 5000)).rejects.toBe(refus);
      await Promise.resolve();

      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
