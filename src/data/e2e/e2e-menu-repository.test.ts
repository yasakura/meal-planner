import { describe, it, expect } from 'vitest';

import { createCalendarDate, type CalendarDate } from '../../domain/entities/calendar-date';
import { createMenu, type Menu } from '../../domain/entities/menu';
import { createRepas } from '../../domain/entities/repas';
import { createSlot } from '../../domain/entities/slot';
import { RepositoryUnavailableError } from '../../domain/errors/repository-unavailable-error';
import { E2eFailureSwitch } from './e2e-failure-switch';
import { E2eMenuRepository } from './e2e-menu-repository';

const LUNDI_5_JANVIER = createCalendarDate({ year: 2026, month: 1, day: 5 });
const LUNDI_19_JANVIER = createCalendarDate({ year: 2026, month: 1, day: 19 });
const LUNDI_2_FEVRIER = createCalendarDate({ year: 2026, month: 2, day: 2 });

function menuCommencantLe(dateDebut: CalendarDate, recipeId = 'recipe-curry'): Menu {
  return createMenu({
    dateDebut,
    repas: [createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId })] })],
  });
}

describe('E2eMenuRepository', () => {
  it('démarre sans aucune période enregistrée', async () => {
    const repository = E2eMenuRepository.startingEmpty(E2eFailureSwitch.create());

    expect(await repository.findAllStartDates()).toEqual([]);
  });

  it('enregistre un menu et rend sa période', async () => {
    const repository = E2eMenuRepository.startingEmpty(E2eFailureSwitch.create());

    await repository.save(menuCommencantLe(LUNDI_5_JANVIER));

    expect(await repository.findAllStartDates()).toEqual([LUNDI_5_JANVIER]);
  });

  it('rend un ordre DIFFÉRENT de l’ordre d’insertion : le port n’en garantit aucun', async () => {
    // Comme `InMemoryMenuRepository` : inversion délibérée, déterministe, et garantie
    // différente de l'insertion dès deux éléments. Un adapter plus aimable que son contrat
    // ferait passer en vert un tri que personne n'a écrit.
    const repository = E2eMenuRepository.startingEmpty(E2eFailureSwitch.create());

    await repository.save(menuCommencantLe(LUNDI_5_JANVIER));
    await repository.save(menuCommencantLe(LUNDI_19_JANVIER));
    await repository.save(menuCommencantLe(LUNDI_2_FEVRIER));

    expect(await repository.findAllStartDates()).toEqual([
      LUNDI_2_FEVRIER,
      LUNDI_19_JANVIER,
      LUNDI_5_JANVIER,
    ]);
  });

  it('enregistre en UPSERT sur la période : même date de début, une seule entrée', async () => {
    // La période est la CLÉ. Deux dates civiles construites séparément désignent le même
    // jour : ranger les menus par objet ferait cohabiter deux menus sur la même période.
    const repository = E2eMenuRepository.startingEmpty(E2eFailureSwitch.create());

    await repository.save(menuCommencantLe(LUNDI_5_JANVIER, 'recipe-curry'));
    await repository.save(
      menuCommencantLe(createCalendarDate({ year: 2026, month: 1, day: 5 }), 'recipe-gratin'),
    );

    expect(await repository.findAllStartDates()).toEqual([LUNDI_5_JANVIER]);
  });

  it('efface la période demandée, et elle seule', async () => {
    const repository = E2eMenuRepository.startingEmpty(E2eFailureSwitch.create());
    await repository.save(menuCommencantLe(LUNDI_5_JANVIER));
    await repository.save(menuCommencantLe(LUNDI_19_JANVIER));

    await repository.remove(createCalendarDate({ year: 2026, month: 1, day: 5 }));

    expect(await repository.findAllStartDates()).toEqual([LUNDI_19_JANVIER]);
  });

  it('efface une période vide en succès silencieux : le port est idempotent', async () => {
    const repository = E2eMenuRepository.startingEmpty(E2eFailureSwitch.create());
    await repository.save(menuCommencantLe(LUNDI_5_JANVIER));

    await expect(repository.remove(LUNDI_2_FEVRIER)).resolves.toBeUndefined();
    expect(await repository.findAllStartDates()).toEqual([LUNDI_5_JANVIER]);
  });

  it('rejette findAllStartDates avec RepositoryUnavailableError quand les lectures sont en panne', async () => {
    const failures = E2eFailureSwitch.create();
    const repository = E2eMenuRepository.startingEmpty(failures);

    failures.failReads();

    await expect(repository.findAllStartDates()).rejects.toBeInstanceOf(RepositoryUnavailableError);
  });

  it('rejette save quand les écritures sont en panne, et n’enregistre rien', async () => {
    const failures = E2eFailureSwitch.create();
    const repository = E2eMenuRepository.startingEmpty(failures);

    failures.failWrites();

    await expect(repository.save(menuCommencantLe(LUNDI_5_JANVIER))).rejects.toBeInstanceOf(
      RepositoryUnavailableError,
    );
    failures.restore();
    expect(await repository.findAllStartDates()).toEqual([]);
  });

  it('rejette remove quand les écritures sont en panne, et n’efface rien', async () => {
    const failures = E2eFailureSwitch.create();
    const repository = E2eMenuRepository.startingEmpty(failures);
    await repository.save(menuCommencantLe(LUNDI_5_JANVIER));

    failures.failWrites();

    await expect(repository.remove(LUNDI_5_JANVIER)).rejects.toBeInstanceOf(
      RepositoryUnavailableError,
    );
    failures.restore();
    expect(await repository.findAllStartDates()).toEqual([LUNDI_5_JANVIER]);
  });
});
