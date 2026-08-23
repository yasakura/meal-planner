import {
  type Firestore,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';

import { type CalendarDate } from '../domain/entities/calendar-date';
import { type Menu } from '../domain/entities/menu';
import { type MenuRepository } from '../domain/ports/menu-repository';
import { type Unsubscribe } from '../domain/ports/unsubscribe';
import { asDomainFailure } from './firestore-failure';
import {
  DEFAULT_ACK_TIMEOUT_MS,
  DEFAULT_READ_TIMEOUT_MS,
  withServerDeadline,
} from './firestore-server-deadline';
import { documentToMenu, menuDocumentId, menuToDocument } from './menu-mapper';

export type FirestoreMenuRepositoryOptions = {
  ackTimeoutMs?: number;
  readTimeoutMs?: number;
};

export class FirestoreMenuRepository implements MenuRepository {
  private constructor(
    private readonly db: Firestore,
    private readonly ackTimeoutMs: number,
    private readonly readTimeoutMs: number,
  ) {}

  static create(db: Firestore, options?: FirestoreMenuRepositoryOptions): FirestoreMenuRepository {
    return new FirestoreMenuRepository(
      db,
      options?.ackTimeoutMs ?? DEFAULT_ACK_TIMEOUT_MS,
      options?.readTimeoutMs ?? DEFAULT_READ_TIMEOUT_MS,
    );
  }

  async save(menu: Menu): Promise<void> {
    await withServerDeadline(
      setDoc(doc(this.db, 'menus', menuDocumentId(menu.dateDebut)), menuToDocument(menu)),
      this.ackTimeoutMs,
    );
  }

  async findAll(): Promise<Menu[]> {
    const snapshot = await withServerDeadline(
      getDocs(collection(this.db, 'menus')),
      this.readTimeoutMs,
    );
    return snapshot.docs.map((snapshotDoc) => documentToMenu(snapshotDoc.id, snapshotDoc.data()));
  }

  async remove(dateDebut: CalendarDate): Promise<void> {
    await withServerDeadline(
      deleteDoc(doc(this.db, 'menus', menuDocumentId(dateDebut))),
      this.ackTimeoutMs,
    );
  }

  observeAll(listener: (menus: Menu[]) => void, onError: (error: unknown) => void): Unsubscribe {
    return onSnapshot(
      collection(this.db, 'menus'),
      (snapshot) => {
        listener(
          snapshot.docs.map((snapshotDoc) => documentToMenu(snapshotDoc.id, snapshotDoc.data())),
        );
      },
      (error) => {
        onError(asDomainFailure(error));
      },
    );
  }
}
