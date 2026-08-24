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
import { type WriteRejectionReporter } from '../domain/ports/write-rejection-reporter';
import { type Unsubscribe } from '../domain/ports/unsubscribe';
import { asDomainFailure } from './firestore-failure';
import { acceptedLocally } from './firestore-local-acceptance';
import { DEFAULT_READ_TIMEOUT_MS, withServerDeadline } from './firestore-server-deadline';
import { documentToMenu, menuDocumentId, menuToDocument } from './menu-mapper';

export type FirestoreMenuRepositoryOptions = {
  readTimeoutMs?: number;
  onWriteRejected?: WriteRejectionReporter;
};

export class FirestoreMenuRepository implements MenuRepository {
  private constructor(
    private readonly db: Firestore,
    private readonly readTimeoutMs: number,
    private readonly onWriteRejected: WriteRejectionReporter | undefined,
  ) {}

  static create(db: Firestore, options?: FirestoreMenuRepositoryOptions): FirestoreMenuRepository {
    return new FirestoreMenuRepository(
      db,
      options?.readTimeoutMs ?? DEFAULT_READ_TIMEOUT_MS,
      options?.onWriteRejected,
    );
  }

  save(menu: Menu): Promise<void> {
    return acceptedLocally(
      setDoc(doc(this.db, 'menus', menuDocumentId(menu.dateDebut)), menuToDocument(menu)),
      this.onWriteRejected,
    );
  }

  async findAll(): Promise<Menu[]> {
    const snapshot = await withServerDeadline(
      getDocs(collection(this.db, 'menus')),
      this.readTimeoutMs,
    );
    return snapshot.docs.map((snapshotDoc) => documentToMenu(snapshotDoc.id, snapshotDoc.data()));
  }

  remove(dateDebut: CalendarDate): Promise<void> {
    return acceptedLocally(
      deleteDoc(doc(this.db, 'menus', menuDocumentId(dateDebut))),
      this.onWriteRejected,
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
