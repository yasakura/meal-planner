import { describe, expect, it, vi } from 'vitest';

import { isRepositoryUnavailable } from '../domain/errors/repository-unavailable-error';
import { withServerDeadline } from './firestore-server-deadline';

function firestoreError(code: string): Error {
  return Object.assign(new Error(`firestore: ${code}`), { code, name: 'FirebaseError' });
}

describe('withServerDeadline', () => {
  it("rend telle quelle la valeur de l'aller-retour serveur", async () => {
    await expect(withServerDeadline(Promise.resolve('acquitté'), 5000)).resolves.toBe('acquitté');
  });

  it(
    "déclare le dépôt indisponible quand le serveur ne règle pas l'aller-retour dans la borne",
    { timeout: 1000 },
    async () => {
      await expect(withServerDeadline(new Promise(() => {}), 10)).rejects.toSatisfy(
        isRepositoryUnavailable,
      );
    },
  );

  it('traduit un aller-retour refusé faute de réseau en indisponibilité de dépôt', async () => {
    await expect(
      withServerDeadline(Promise.reject(firestoreError('unavailable')), 5000),
    ).rejects.toSatisfy(isRepositoryUnavailable);
  });

  it("ne traduit pas un refus de permission : l'erreur remonte telle quelle", async () => {
    const refus = firestoreError('permission-denied');

    await expect(withServerDeadline(Promise.reject(refus), 5000)).rejects.toBe(refus);
  });

  it("ne laisse aucune borne en suspens une fois l'aller-retour réglé", async () => {
    vi.useFakeTimers();
    try {
      await withServerDeadline(Promise.resolve(undefined), 5000);
      await Promise.resolve();

      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("ne laisse aucune borne en suspens une fois l'aller-retour REFUSÉ", async () => {
    vi.useFakeTimers();
    try {
      const refus = firestoreError('permission-denied');
      await expect(withServerDeadline(Promise.reject(refus), 5000)).rejects.toBe(refus);
      await Promise.resolve();

      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
