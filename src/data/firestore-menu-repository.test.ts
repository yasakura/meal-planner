import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Firestore,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { createCalendarDate, type CalendarDate } from '../domain/entities/calendar-date';
import { createMenu, type Menu } from '../domain/entities/menu';
import { createRepas } from '../domain/entities/repas';
import { createSlot } from '../domain/entities/slot';
import { isRepositoryUnavailable } from '../domain/errors/repository-unavailable-error';
import { FirestoreMenuRepository } from './firestore-menu-repository';
import { menuDocumentId, menuToDocument } from './menu-mapper';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  getDocsFromServer: vi.fn(),
  onSnapshot: vi.fn(),
}));

const mockedDoc = vi.mocked(doc);
const mockedSetDoc = vi.mocked(setDoc);
const mockedDeleteDoc = vi.mocked(deleteDoc);
const mockedCollection = vi.mocked(collection);
const mockedGetDocs = vi.mocked(getDocs);
const mockedGetDocsFromServer = vi.mocked(getDocsFromServer);
const mockedOnSnapshot = vi.mocked(onSnapshot);

function firestoreError(code: string): Error {
  return Object.assign(new Error(`firestore: ${code}`), { code, name: 'FirebaseError' });
}

const LUNDI_24_AOUT = createCalendarDate({ year: 2026, month: 8, day: 24 });
const LUNDI_5_JANVIER = createCalendarDate({ year: 2026, month: 1, day: 5 });

function menuCommencantLe(dateDebut: CalendarDate): Menu {
  return createMenu({
    dateDebut,
    repas: [createRepas({ jour: 0, creneau: 'midi', slots: [createSlot({ recipeId: 'r-1' })] })],
  });
}

function menuCommencantLe24Aout(): Menu {
  return menuCommencantLe(LUNDI_24_AOUT);
}

function documentDe(menu: Menu): { id: string; data: () => unknown } {
  return { id: menuDocumentId(menu.dateDebut), data: () => menuToDocument(menu) };
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
    mockedSetDoc.mockResolvedValue(undefined);
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
      mockedSetDoc.mockReturnValue(new Promise<void>(() => {}));
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
      mockedSetDoc.mockResolvedValue(undefined);
      const repository = FirestoreMenuRepository.create(db);

      await repository.save(menuCommencantLe24Aout());
      await Promise.resolve();

      expect(mockedSetDoc).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("findAll lit la collection 'menus' et rend le menu porté par chaque document", async () => {
    const collectionRef = { marker: 'collection-ref-sentinel' };
    mockedCollection.mockReturnValue(collectionRef as never);
    mockedGetDocs.mockResolvedValue({
      docs: [documentDe(menuCommencantLe24Aout()), documentDe(menuCommencantLe(LUNDI_5_JANVIER))],
    } as never);
    const repository = FirestoreMenuRepository.create(db);

    const menus = await repository.findAll();

    expect(mockedCollection).toHaveBeenCalledWith(db, 'menus');
    expect(mockedGetDocs).toHaveBeenCalledWith(collectionRef);
    expect(menus).toEqual([menuCommencantLe24Aout(), menuCommencantLe(LUNDI_5_JANVIER)]);
  });

  it('findAll rend TOUS les menus, même très anciens : aucun filtre de rétention', async () => {
    const menuDe2019 = menuCommencantLe(createCalendarDate({ year: 2019, month: 3, day: 4 }));
    mockedCollection.mockReturnValue({} as never);
    mockedGetDocs.mockResolvedValue({
      docs: [documentDe(menuDe2019), documentDe(menuCommencantLe24Aout())],
    } as never);
    const repository = FirestoreMenuRepository.create(db);

    const menus = await repository.findAll();

    expect(menus).toHaveLength(2);
    expect(menus).toContainEqual(menuDe2019);
  });

  it("findAll accepte le repli sur le cache Firestore, et n'exige jamais le serveur", async () => {
    const collectionRef = { marker: 'collection-ref-sentinel' };
    mockedCollection.mockReturnValue(collectionRef as never);
    mockedGetDocs.mockResolvedValue({ docs: [] } as never);
    mockedGetDocsFromServer.mockResolvedValue({ docs: [] } as never);
    const repository = FirestoreMenuRepository.create(db);

    await repository.findAll();

    expect(mockedGetDocs).toHaveBeenCalledWith(collectionRef);
    expect(mockedGetDocsFromServer).not.toHaveBeenCalled();
  });

  it('findAll traduit une lecture impossible faute de réseau en indisponibilité de dépôt', async () => {
    mockedCollection.mockReturnValue({} as never);
    mockedGetDocs.mockRejectedValue(firestoreError('unavailable'));
    const repository = FirestoreMenuRepository.create(db);

    await expect(repository.findAll()).rejects.toSatisfy(isRepositoryUnavailable);
  });

  it("findAll ne traduit pas un refus de permission : l'erreur remonte telle quelle", async () => {
    mockedCollection.mockReturnValue({} as never);
    const refus = firestoreError('permission-denied');
    mockedGetDocs.mockRejectedValue(refus);
    const repository = FirestoreMenuRepository.create(db);

    await expect(repository.findAll()).rejects.toBe(refus);
  });

  it('remove efface le document menus/{date ISO de début}', async () => {
    const docRef = { marker: 'doc-ref-sentinel' };
    mockedDoc.mockReturnValue(docRef as never);
    mockedDeleteDoc.mockResolvedValue(undefined);
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
      mockedDeleteDoc.mockReturnValue(new Promise<void>(() => {}));
      const repository = FirestoreMenuRepository.create(db, { ackTimeoutMs: 10 });

      await expect(repository.remove(LUNDI_24_AOUT)).rejects.toSatisfy(isRepositoryUnavailable);
    },
  );

  it("ne laisse aucune borne en suspens une fois l'effacement acquitté", async () => {
    vi.useFakeTimers();
    try {
      mockedDoc.mockReturnValue({} as never);
      mockedDeleteDoc.mockResolvedValue(undefined);
      const repository = FirestoreMenuRepository.create(db);

      await repository.remove(LUNDI_24_AOUT);
      await Promise.resolve();

      expect(mockedDeleteDoc).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it(
    "findAll signale une lecture que le serveur n'a pas rendue dans la borne d'attente",
    { timeout: 1000 },
    async () => {
      mockedCollection.mockReturnValue({} as never);
      mockedGetDocs.mockReturnValue(new Promise(() => {}) as never);
      const repository = FirestoreMenuRepository.create(db, { readTimeoutMs: 10 });

      await expect(repository.findAll()).rejects.toSatisfy(isRepositoryUnavailable);
    },
  );

  it("laisse dix secondes \u00e0 une lecture, l\u00e0 o\u00f9 une \u00e9criture n'en a que cinq", async () => {
    vi.useFakeTimers();
    try {
      mockedCollection.mockReturnValue({} as never);
      mockedGetDocs.mockReturnValue(new Promise(() => {}) as never);
      const repository = FirestoreMenuRepository.create(db);
      const constats: unknown[] = [];
      void repository.findAll().catch((error: unknown) => {
        constats.push(error);
      });

      await vi.advanceTimersByTimeAsync(5000);
      expect(constats).toHaveLength(0);

      await vi.advanceTimersByTimeAsync(5000);
      expect(constats.filter(isRepositoryUnavailable)).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

type ObservedSnapshot = { docs: { id: string; data: () => unknown }[] };

function abonnementCourant(): {
  reference: unknown;
  emettre: (snapshot: ObservedSnapshot) => void;
  echouer: (error: unknown) => void;
} {
  const [reference, emettre, echouer] = mockedOnSnapshot.mock.calls[0] as unknown as [
    unknown,
    (snapshot: ObservedSnapshot) => void,
    (error: unknown) => void,
  ];
  return { reference, emettre, echouer };
}

describe("FirestoreMenuRepository — observation de la collection 'menus'", () => {
  const db = { marker: 'db-sentinel' } as unknown as Firestore;

  beforeEach(() => {
    mockedCollection.mockReset();
    mockedOnSnapshot.mockReset();
    mockedOnSnapshot.mockReturnValue(vi.fn() as never);
  });

  it("observeAll s'abonne à la collection 'menus' et livre chaque instantané mappé, à chaque émission", () => {
    const collectionRef = { marker: 'collection-ref-sentinel' };
    mockedCollection.mockReturnValue(collectionRef as never);
    const listener = vi.fn();

    FirestoreMenuRepository.create(db).observeAll(listener, vi.fn());
    const { reference, emettre } = abonnementCourant();
    emettre({ docs: [documentDe(menuCommencantLe24Aout())] });
    emettre({
      docs: [documentDe(menuCommencantLe24Aout()), documentDe(menuCommencantLe(LUNDI_5_JANVIER))],
    });

    expect(mockedCollection).toHaveBeenCalledWith(db, 'menus');
    expect(reference).toBe(collectionRef);
    expect(listener).toHaveBeenNthCalledWith(1, [menuCommencantLe24Aout()]);
    expect(listener).toHaveBeenNthCalledWith(2, [
      menuCommencantLe24Aout(),
      menuCommencantLe(LUNDI_5_JANVIER),
    ]);
  });

  it('observeAll traduit une écoute impossible faute de réseau en indisponibilité de dépôt', () => {
    mockedCollection.mockReturnValue({} as never);
    const echecs: unknown[] = [];

    FirestoreMenuRepository.create(db).observeAll(vi.fn(), (error) => echecs.push(error));
    abonnementCourant().echouer(firestoreError('unavailable'));

    expect(echecs).toHaveLength(1);
    expect(echecs[0]).toSatisfy(isRepositoryUnavailable);
  });

  it("observeAll ne traduit pas un refus de permission en indisponibilité : l'erreur remonte telle quelle", () => {
    mockedCollection.mockReturnValue({} as never);
    const refus = firestoreError('permission-denied');
    const echecs: unknown[] = [];

    FirestoreMenuRepository.create(db).observeAll(vi.fn(), (error) => echecs.push(error));
    abonnementCourant().echouer(refus);

    expect(echecs).toEqual([refus]);
  });

  it('observeAll rend le désabonnement Firestore, et ne le déclenche pas de lui-même', () => {
    mockedCollection.mockReturnValue({} as never);
    const desabonnement = vi.fn();
    mockedOnSnapshot.mockReturnValue(desabonnement as never);

    const stop = FirestoreMenuRepository.create(db).observeAll(vi.fn(), vi.fn());

    expect(desabonnement).not.toHaveBeenCalled();
    stop();
    expect(desabonnement).toHaveBeenCalledTimes(1);
  });

  it("observeAll ne pose aucune borne d'attente : un abonnement muet ne devient jamais une indisponibilité", () => {
    vi.useFakeTimers();
    try {
      mockedCollection.mockReturnValue({} as never);
      const onError = vi.fn();

      FirestoreMenuRepository.create(db, { readTimeoutMs: 10 }).observeAll(vi.fn(), onError);
      vi.advanceTimersByTime(60_000);

      expect(vi.getTimerCount()).toBe(0);
      expect(onError).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
