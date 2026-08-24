import { describe, expect, it, vi } from 'vitest';

import { acceptedLocally } from './firestore-local-acceptance';

describe('acceptedLocally', () => {
  it("rend la main sans attendre que l'écriture soit réglée", { timeout: 1000 }, async () => {
    await expect(acceptedLocally(new Promise(() => {}), vi.fn())).resolves.toBeUndefined();
  });

  it('signale au canal le refus arrivé après coup, une seule fois', async () => {
    const onWriteRejected = vi.fn();
    let refuser: (raison: unknown) => void = () => {};
    const write = new Promise((_resolve, reject) => {
      refuser = reject;
    });

    await expect(acceptedLocally(write, onWriteRejected)).resolves.toBeUndefined();
    refuser(new Error('permission-denied'));

    await vi.waitFor(() => {
      expect(onWriteRejected).toHaveBeenCalledTimes(1);
    });
  });

  it("sans canal de refus, la main reste rendue et le refus reste dans la promesse d'origine", async () => {
    let refuser: (raison: unknown) => void = () => {};
    const write = new Promise((_resolve, reject) => {
      refuser = reject;
    });

    await expect(acceptedLocally(write)).resolves.toBeUndefined();
    refuser(new Error('permission-denied'));

    await expect(write).rejects.toThrow('permission-denied');
  });
});
