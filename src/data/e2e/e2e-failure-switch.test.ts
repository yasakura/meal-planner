import { describe, it, expect, vi } from 'vitest';

import { RepositoryUnavailableError } from '../../domain/errors/repository-unavailable-error';
import { E2eFailureSwitch } from './e2e-failure-switch';

function apresLeTourCourant(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 5));
}

describe('E2eFailureSwitch', () => {
  it('laisse passer les lectures tant que rien n’est armé', () => {
    const failures = E2eFailureSwitch.reporting(vi.fn());

    expect(() => failures.guardRead()).not.toThrow();
  });

  it('fait échouer les lectures une fois failReads armé', () => {
    const failures = E2eFailureSwitch.reporting(vi.fn());

    failures.failReads();

    expect(() => failures.guardRead()).toThrow(RepositoryUnavailableError);
  });

  it('reste armé jusqu’à restore : la panne est un état, pas un coup unique', () => {
    const failures = E2eFailureSwitch.reporting(vi.fn());

    failures.failReads();
    expect(() => failures.guardRead()).toThrow(RepositoryUnavailableError);

    expect(() => failures.guardRead()).toThrow(RepositoryUnavailableError);
  });

  it('n’annule aucune écriture et ne signale rien tant que failWrites n’est pas armé', async () => {
    const onWriteRejected = vi.fn();
    const annulation = vi.fn();
    const failures = E2eFailureSwitch.reporting(onWriteRejected);

    failures.refuseAfterwards(annulation);
    await apresLeTourCourant();

    expect(annulation).not.toHaveBeenCalled();
    expect(onWriteRejected).not.toHaveBeenCalled();
  });

  it('failWrites armé : l’écriture est annulée après coup, et le refus part au constat global', async () => {
    const onWriteRejected = vi.fn();
    const annulation = vi.fn();
    const failures = E2eFailureSwitch.reporting(onWriteRejected);
    failures.failWrites();

    failures.refuseAfterwards(annulation);

    await vi.waitFor(() => {
      expect(annulation).toHaveBeenCalledTimes(1);
      expect(onWriteRejected).toHaveBeenCalledTimes(1);
    });
  });

  it('le refus arrive APRÈS la main rendue : le tour courant n’annule rien', async () => {
    const onWriteRejected = vi.fn();
    const annulation = vi.fn();
    const failures = E2eFailureSwitch.reporting(onWriteRejected);
    failures.failWrites();

    failures.refuseAfterwards(annulation);
    expect(annulation).not.toHaveBeenCalled();

    await vi.waitFor(() => {
      expect(annulation).toHaveBeenCalledTimes(1);
    });
  });

  it('un dépôt qui refusera les écritures reste lisible : failWrites ne touche pas les lectures', () => {
    const failures = E2eFailureSwitch.reporting(vi.fn());

    failures.failWrites();

    expect(() => failures.guardRead()).not.toThrow();
  });

  it('restore rétablit les deux canaux d’un seul geste', async () => {
    const onWriteRejected = vi.fn();
    const annulation = vi.fn();
    const failures = E2eFailureSwitch.reporting(onWriteRejected);
    failures.failReads();
    failures.failWrites();

    failures.restore();

    expect(() => failures.guardRead()).not.toThrow();
    failures.refuseAfterwards(annulation);
    await apresLeTourCourant();
    expect(annulation).not.toHaveBeenCalled();
  });
});
