import { describe, it, expect } from 'vitest';

import { RepositoryUnavailableError } from '../../domain/errors/repository-unavailable-error';
import { E2eFailureSwitch } from './e2e-failure-switch';

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
});
