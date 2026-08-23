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
  it('démarre sans aucun menu enregistré', async () => {
    const repository = E2eMenuRepository.startingEmpty(E2eFailureSwitch.create());

    expect(await repository.findAll()).toEqual([]);
  });

  it('enregistre un menu et le rend', async () => {
    const repository = E2eMenuRepository.startingEmpty(E2eFailureSwitch.create());

    await repository.save(menuCommencantLe(LUNDI_5_JANVIER));

    expect(await repository.findAll()).toEqual([menuCommencantLe(LUNDI_5_JANVIER)]);
  });

  it('rend un ordre DIFFÉRENT de l’ordre d’insertion : le port n’en garantit aucun', async () => {
    const repository = E2eMenuRepository.startingEmpty(E2eFailureSwitch.create());

    await repository.save(menuCommencantLe(LUNDI_5_JANVIER));
    await repository.save(menuCommencantLe(LUNDI_19_JANVIER));
    await repository.save(menuCommencantLe(LUNDI_2_FEVRIER));

    expect(await repository.findAll()).toEqual([
      menuCommencantLe(LUNDI_2_FEVRIER),
      menuCommencantLe(LUNDI_19_JANVIER),
      menuCommencantLe(LUNDI_5_JANVIER),
    ]);
  });

  it('enregistre en UPSERT sur la période : même date de début, une seule entrée', async () => {
    const repository = E2eMenuRepository.startingEmpty(E2eFailureSwitch.create());

    await repository.save(menuCommencantLe(LUNDI_5_JANVIER, 'recipe-curry'));
    await repository.save(
      menuCommencantLe(createCalendarDate({ year: 2026, month: 1, day: 5 }), 'recipe-gratin'),
    );

    expect(await repository.findAll()).toEqual([
      menuCommencantLe(LUNDI_5_JANVIER, 'recipe-gratin'),
    ]);
  });

  it('efface la période demandée, et elle seule', async () => {
    const repository = E2eMenuRepository.startingEmpty(E2eFailureSwitch.create());
    await repository.save(menuCommencantLe(LUNDI_5_JANVIER));
    await repository.save(menuCommencantLe(LUNDI_19_JANVIER));

    await repository.remove(createCalendarDate({ year: 2026, month: 1, day: 5 }));

    expect(await repository.findAll()).toEqual([menuCommencantLe(LUNDI_19_JANVIER)]);
  });

  it('efface une période vide en succès silencieux : le port est idempotent', async () => {
    const repository = E2eMenuRepository.startingEmpty(E2eFailureSwitch.create());
    await repository.save(menuCommencantLe(LUNDI_5_JANVIER));

    await expect(repository.remove(LUNDI_2_FEVRIER)).resolves.toBeUndefined();
    expect(await repository.findAll()).toEqual([menuCommencantLe(LUNDI_5_JANVIER)]);
  });

  it('rejette findAll avec RepositoryUnavailableError quand les lectures sont en panne', async () => {
    const failures = E2eFailureSwitch.create();
    const repository = E2eMenuRepository.startingEmpty(failures);

    failures.failReads();

    await expect(repository.findAll()).rejects.toBeInstanceOf(RepositoryUnavailableError);
  });

  it('rejette save quand les écritures sont en panne, et n’enregistre rien', async () => {
    const failures = E2eFailureSwitch.create();
    const repository = E2eMenuRepository.startingEmpty(failures);

    failures.failWrites();

    await expect(repository.save(menuCommencantLe(LUNDI_5_JANVIER))).rejects.toBeInstanceOf(
      RepositoryUnavailableError,
    );
    failures.restore();
    expect(await repository.findAll()).toEqual([]);
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
    expect(await repository.findAll()).toEqual([menuCommencantLe(LUNDI_5_JANVIER)]);
  });

  it('un dépôt muet ne refuse pas save : c’est la borne qui le déclare indisponible, et rien n’est enregistré', async () => {
    const failures = E2eFailureSwitch.create({ ackTimeoutMs: 10 });
    const repository = E2eMenuRepository.startingEmpty(failures);

    failures.hangWrites();

    await expect(repository.save(menuCommencantLe(LUNDI_5_JANVIER))).rejects.toBeInstanceOf(
      RepositoryUnavailableError,
    );
    failures.restore();
    expect(await repository.findAll()).toEqual([]);
  });
});

describe('E2eMenuRepository — observation', () => {
  it("livre l'instantané courant dès l'abonnement, dans un ordre DIFFÉRENT de l'ordre d'insertion", async () => {
    const repository = E2eMenuRepository.startingEmpty(E2eFailureSwitch.create());
    const menuDu5Janvier = menuCommencantLe(LUNDI_5_JANVIER);
    const menuDu19Janvier = menuCommencantLe(LUNDI_19_JANVIER);
    await repository.save(menuDu5Janvier);
    await repository.save(menuDu19Janvier);
    const instantanes: (readonly Menu[])[] = [];

    repository.observeAll(
      (menus) => instantanes.push(menus),
      () => {},
    );

    expect(instantanes).toEqual([[menuDu19Janvier, menuDu5Janvier]]);
  });

  it('réémet la liste entière à chaque enregistrement et à chaque retrait', async () => {
    const repository = E2eMenuRepository.startingEmpty(E2eFailureSwitch.create());
    const menuDu5Janvier = menuCommencantLe(LUNDI_5_JANVIER);
    const instantanes: (readonly Menu[])[] = [];
    repository.observeAll(
      (menus) => instantanes.push(menus),
      () => {},
    );

    await repository.save(menuDu5Janvier);
    await repository.remove(LUNDI_5_JANVIER);

    expect(instantanes).toEqual([[], [menuDu5Janvier], []]);
  });

  it("n'émet plus rien une fois le désabonnement appelé", async () => {
    const repository = E2eMenuRepository.startingEmpty(E2eFailureSwitch.create());
    const instantanes: (readonly Menu[])[] = [];
    const stop = repository.observeAll(
      (menus) => instantanes.push(menus),
      () => {},
    );
    await repository.save(menuCommencantLe(LUNDI_5_JANVIER));
    expect(instantanes).toHaveLength(2);

    stop();
    await repository.save(menuCommencantLe(LUNDI_19_JANVIER));

    expect(instantanes).toHaveLength(2);
  });

  it("signale l'indisponibilité sur le canal d'erreur quand les lectures sont en panne, au lieu de livrer un instantané", () => {
    const failures = E2eFailureSwitch.create();
    const repository = E2eMenuRepository.startingEmpty(failures);
    const instantanes: (readonly Menu[])[] = [];
    const echecs: unknown[] = [];

    failures.failReads();
    repository.observeAll(
      (menus) => instantanes.push(menus),
      (error) => echecs.push(error),
    );

    expect(echecs).toHaveLength(1);
    expect(echecs[0]).toBeInstanceOf(RepositoryUnavailableError);
    expect(instantanes).toEqual([]);
  });
});
