import { describe, it, expect, vi } from 'vitest';

import { RepositoryUnavailableError } from '../../domain/errors/repository-unavailable-error';
import { E2E_ACK_TIMEOUT_MS, E2eFailureSwitch } from './e2e-failure-switch';

describe('E2eFailureSwitch', () => {
  it('laisse passer lectures et écritures tant que rien n’est armé', () => {
    const failures = E2eFailureSwitch.create();

    expect(() => failures.guardRead()).not.toThrow();
    expect(() => failures.guardWrite()).not.toThrow();
  });

  it('fait échouer les lectures, et elles seules, une fois failReads armé', () => {
    const failures = E2eFailureSwitch.create();

    failures.failReads();

    expect(() => failures.guardRead()).toThrow(RepositoryUnavailableError);
    expect(() => failures.guardWrite()).not.toThrow();
  });

  it('fait échouer les écritures, et elles seules, une fois failWrites armé', () => {
    const failures = E2eFailureSwitch.create();

    failures.failWrites();

    expect(() => failures.guardWrite()).toThrow(RepositoryUnavailableError);
    expect(() => failures.guardRead()).not.toThrow();
  });

  it('reste armé jusqu’à restore : la panne est un état, pas un coup unique', () => {
    const failures = E2eFailureSwitch.create();

    failures.failReads();
    expect(() => failures.guardRead()).toThrow(RepositoryUnavailableError);

    expect(() => failures.guardRead()).toThrow(RepositoryUnavailableError);
  });

  it('rétablit les deux canaux d’un seul geste avec restore', () => {
    const failures = E2eFailureSwitch.create();
    failures.failReads();
    failures.failWrites();

    failures.restore();

    expect(() => failures.guardRead()).not.toThrow();
    expect(() => failures.guardWrite()).not.toThrow();
  });

  it('acquitte les écritures sans attendre tant que hangWrites n’est pas armé', async () => {
    const failures = E2eFailureSwitch.create();

    await expect(failures.serverAck()).resolves.toBeUndefined();
  });

  it('ne rend jamais l’acquittement une fois hangWrites armé : c’est la borne qui déclare l’indisponibilité', async () => {
    const failures = E2eFailureSwitch.create({ ackTimeoutMs: 10 });

    failures.hangWrites();

    await expect(failures.serverAck()).rejects.toBeInstanceOf(RepositoryUnavailableError);
  });

  it('un dépôt muet reste lisible : hangWrites ne touche pas les lectures', () => {
    const failures = E2eFailureSwitch.create();

    failures.hangWrites();

    expect(() => failures.guardRead()).not.toThrow();
  });

  it('rend l’acquittement immédiat à nouveau avec restore', async () => {
    const failures = E2eFailureSwitch.create({ ackTimeoutMs: 10 });
    failures.hangWrites();

    failures.restore();

    await expect(failures.serverAck()).resolves.toBeUndefined();
  });

  it('sans borne fournie, le silence dure E2E_ACK_TIMEOUT_MS et pas une milliseconde de moins', async () => {
    vi.useFakeTimers();
    try {
      const failures = E2eFailureSwitch.create();
      failures.hangWrites();
      const acquittement = failures.serverAck().then(
        () => 'acquitté',
        () => 'borne franchie',
      );
      let issue: string | undefined;
      void acquittement.then((resultat) => {
        issue = resultat;
      });

      await vi.advanceTimersByTimeAsync(E2E_ACK_TIMEOUT_MS - 1);
      expect(issue).toBeUndefined();

      await vi.advanceTimersByTimeAsync(1);
      expect(await acquittement).toBe('borne franchie');
    } finally {
      vi.useRealTimers();
    }
  });
});
