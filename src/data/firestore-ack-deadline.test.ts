import { describe, expect, it, vi } from 'vitest';

import { isRepositoryUnavailable } from '../domain/errors/repository-unavailable-error';
import { withAckDeadline } from './firestore-ack-deadline';

function firestoreError(code: string): Error {
  return Object.assign(new Error(`firestore: ${code}`), { code, name: 'FirebaseError' });
}

describe('withAckDeadline', () => {
  it("rend la valeur acquittée par l'écriture", async () => {
    await expect(withAckDeadline(Promise.resolve('acquitté'), 5000)).resolves.toBe('acquitté');
  });

  it(
    "déclare non confirmée une écriture que le serveur n'a pas acquittée dans la borne",
    { timeout: 1000 },
    async () => {
      await expect(withAckDeadline(new Promise(() => {}), 10)).rejects.toSatisfy(
        isRepositoryUnavailable,
      );
    },
  );

  it('traduit une écriture refusée faute de réseau en indisponibilité de dépôt', async () => {
    await expect(
      withAckDeadline(Promise.reject(firestoreError('unavailable')), 5000),
    ).rejects.toSatisfy(isRepositoryUnavailable);
  });

  it("ne traduit pas un refus de permission : l'erreur remonte telle quelle", async () => {
    const refus = firestoreError('permission-denied');

    await expect(withAckDeadline(Promise.reject(refus), 5000)).rejects.toBe(refus);
  });

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
