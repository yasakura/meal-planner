import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Firestore,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDocsFromServer,
  setDoc,
} from 'firebase/firestore';
import { createCalendarDate } from '../domain/entities/calendar-date';
import { createMenu, type Menu } from '../domain/entities/menu';
import { createRepas } from '../domain/entities/repas';
import { createSlot } from '../domain/entities/slot';
import { isRepositoryUnavailable } from '../domain/errors/repository-unavailable-error';
import { FirestoreMenuRepository } from './firestore-menu-repository';
import { menuToDocument } from './menu-mapper';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  getDocsFromServer: vi.fn(),
}));

const mockedDoc = vi.mocked(doc);
const mockedSetDoc = vi.mocked(setDoc);
const mockedDeleteDoc = vi.mocked(deleteDoc);
const mockedCollection = vi.mocked(collection);
const mockedGetDocs = vi.mocked(getDocs);
const mockedGetDocsFromServer = vi.mocked(getDocsFromServer);

function firestoreError(code: string): Error {
  return Object.assign(new Error(`firestore: ${code}`), { code, name: 'FirebaseError' });
}

const LUNDI_24_AOUT = createCalendarDate({ year: 2026, month: 8, day: 24 });

function menuCommencantLe24Aout(): Menu {
  return createMenu({
    dateDebut: LUNDI_24_AOUT,
    repas: [createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r-1' })] })],
  });
}

describe('FirestoreMenuRepository', () => {
  const db = { marker: 'db-sentinel' } as unknown as Firestore;

  beforeEach(() => {
    mockedDoc.mockReset();
    mockedSetDoc.mockReset();
    mockedDeleteDoc.mockReset();
    mockedCollection.mockReset();
    mockedGetDocs.mockReset();
    mockedGetDocsFromServer.mockReset();
  });

  it('save écrit le menu à menus/{date ISO de début} avec le document mappé', async () => {
    const docRef = { marker: 'doc-ref-sentinel' };
    mockedDoc.mockReturnValue(docRef as never);
    mockedSetDoc.mockResolvedValue(undefined as never);
    const menu = menuCommencantLe24Aout();
    const repository = FirestoreMenuRepository.create(db);

    await repository.save(menu);

    expect(mockedDoc).toHaveBeenCalledWith(db, 'menus', '2026-08-24');
    expect(mockedSetDoc).toHaveBeenCalledWith(docRef, menuToDocument(menu));
  });

  it('save traduit une écriture impossible faute de réseau en indisponibilité de dépôt', async () => {
    mockedDoc.mockReturnValue({} as never);
    mockedSetDoc.mockRejectedValue(firestoreError('unavailable'));
    const repository = FirestoreMenuRepository.create(db);

    await expect(repository.save(menuCommencantLe24Aout())).rejects.toSatisfy(
      isRepositoryUnavailable,
    );
  });

  it("save ne traduit pas un refus de permission : l'erreur remonte telle quelle", async () => {
    mockedDoc.mockReturnValue({} as never);
    const refus = firestoreError('permission-denied');
    mockedSetDoc.mockRejectedValue(refus);
    const repository = FirestoreMenuRepository.create(db);

    await expect(repository.save(menuCommencantLe24Aout())).rejects.toBe(refus);
  });

  it(
    "signale une écriture que le serveur n'a pas acquittée dans la borne d'attente",
    { timeout: 1000 },
    async () => {
      mockedDoc.mockReturnValue({} as never);
      mockedSetDoc.mockReturnValue(new Promise<void>(() => {}) as never);
      const repository = FirestoreMenuRepository.create(db, { ackTimeoutMs: 10 });

      await expect(repository.save(menuCommencantLe24Aout())).rejects.toSatisfy(
        isRepositoryUnavailable,
      );
    },
  );

  it("ne laisse aucune borne en suspens une fois l'écriture acquittée", async () => {
    vi.useFakeTimers();
    try {
      mockedDoc.mockReturnValue({} as never);
      mockedSetDoc.mockResolvedValue(undefined as never);
      const repository = FirestoreMenuRepository.create(db);

      await repository.save(menuCommencantLe24Aout());
      await Promise.resolve();

      expect(mockedSetDoc).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("findAllStartDates lit la collection 'menus' et rend la date de début de chaque document", async () => {
    const collectionRef = { marker: 'collection-ref-sentinel' };
    mockedCollection.mockReturnValue(collectionRef as never);
    mockedGetDocsFromServer.mockResolvedValue({
      docs: [{ id: '2026-08-24' }, { id: '2026-01-05' }],
    } as never);
    const repository = FirestoreMenuRepository.create(db);

    const dates = await repository.findAllStartDates();

    expect(mockedCollection).toHaveBeenCalledWith(db, 'menus');
    expect(mockedGetDocsFromServer).toHaveBeenCalledWith(collectionRef);
    expect(dates).toEqual([
      createCalendarDate({ year: 2026, month: 8, day: 24 }),
      createCalendarDate({ year: 2026, month: 1, day: 5 }),
    ]);
  });

  it('findAllStartDates rend TOUTES les périodes, même très anciennes : aucun filtre de rétention', async () => {
    mockedCollection.mockReturnValue({} as never);
    mockedGetDocsFromServer.mockResolvedValue({
      docs: [{ id: '2019-03-04' }, { id: '2026-08-24' }],
    } as never);
    const repository = FirestoreMenuRepository.create(db);

    const dates = await repository.findAllStartDates();

    expect(dates).toHaveLength(2);
    expect(dates).toContainEqual(createCalendarDate({ year: 2019, month: 3, day: 4 }));
  });

  it('findAllStartDates interroge le serveur et ne se rabat jamais sur le cache Firestore', async () => {
    const collectionRef = { marker: 'collection-ref-sentinel' };
    mockedCollection.mockReturnValue(collectionRef as never);
    mockedGetDocsFromServer.mockResolvedValue({ docs: [] } as never);
    const repository = FirestoreMenuRepository.create(db);

    await repository.findAllStartDates();

    expect(mockedGetDocsFromServer).toHaveBeenCalledWith(collectionRef);
    expect(mockedGetDocs).not.toHaveBeenCalled();
  });

  it('findAllStartDates traduit une lecture impossible faute de réseau en indisponibilité de dépôt', async () => {
    mockedCollection.mockReturnValue({} as never);
    mockedGetDocsFromServer.mockRejectedValue(firestoreError('unavailable'));
    const repository = FirestoreMenuRepository.create(db);

    await expect(repository.findAllStartDates()).rejects.toSatisfy(isRepositoryUnavailable);
  });

  it("findAllStartDates ne traduit pas un refus de permission : l'erreur remonte telle quelle", async () => {
    mockedCollection.mockReturnValue({} as never);
    const refus = firestoreError('permission-denied');
    mockedGetDocsFromServer.mockRejectedValue(refus);
    const repository = FirestoreMenuRepository.create(db);

    await expect(repository.findAllStartDates()).rejects.toBe(refus);
  });

  it('remove efface le document menus/{date ISO de début}', async () => {
    const docRef = { marker: 'doc-ref-sentinel' };
    mockedDoc.mockReturnValue(docRef as never);
    mockedDeleteDoc.mockResolvedValue(undefined as never);
    const repository = FirestoreMenuRepository.create(db);

    await repository.remove(createCalendarDate({ year: 2026, month: 1, day: 5 }));

    expect(mockedDoc).toHaveBeenCalledWith(db, 'menus', '2026-01-05');
    expect(mockedDeleteDoc).toHaveBeenCalledWith(docRef);
  });

  it('remove traduit un effacement impossible faute de réseau en indisponibilité de dépôt', async () => {
    mockedDoc.mockReturnValue({} as never);
    mockedDeleteDoc.mockRejectedValue(firestoreError('unavailable'));
    const repository = FirestoreMenuRepository.create(db);

    await expect(repository.remove(LUNDI_24_AOUT)).rejects.toSatisfy(isRepositoryUnavailable);
  });

  it("remove ne traduit pas un refus de permission : l'erreur remonte telle quelle", async () => {
    mockedDoc.mockReturnValue({} as never);
    const refus = firestoreError('permission-denied');
    mockedDeleteDoc.mockRejectedValue(refus);
    const repository = FirestoreMenuRepository.create(db);

    await expect(repository.remove(LUNDI_24_AOUT)).rejects.toBe(refus);
  });

  it(
    "signale un effacement que le serveur n'a pas acquitté dans la borne d'attente",
    { timeout: 1000 },
    async () => {
      mockedDoc.mockReturnValue({} as never);
      mockedDeleteDoc.mockReturnValue(new Promise<void>(() => {}) as never);
      const repository = FirestoreMenuRepository.create(db, { ackTimeoutMs: 10 });

      await expect(repository.remove(LUNDI_24_AOUT)).rejects.toSatisfy(isRepositoryUnavailable);
    },
  );

  it("ne laisse aucune borne en suspens une fois l'effacement acquitté", async () => {
    vi.useFakeTimers();
    try {
      mockedDoc.mockReturnValue({} as never);
      mockedDeleteDoc.mockResolvedValue(undefined as never);
      const repository = FirestoreMenuRepository.create(db);

      await repository.remove(LUNDI_24_AOUT);
      await Promise.resolve();

      expect(mockedDeleteDoc).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
