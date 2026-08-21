import {
  type Firestore,
  collection,
  deleteDoc,
  doc,
  getDocsFromServer,
  setDoc,
} from 'firebase/firestore';

import { type CalendarDate } from '../domain/entities/calendar-date';
import { type Menu } from '../domain/entities/menu';
import { type MenuRepository } from '../domain/ports/menu-repository';
import { DEFAULT_ACK_TIMEOUT_MS, withAckDeadline } from './firestore-ack-deadline';
import { asDomainFailure } from './firestore-failure';
import { documentToMenu, menuDocumentId, menuToDocument } from './menu-mapper';

export type FirestoreMenuRepositoryOptions = {
  ackTimeoutMs?: number;
};

export class FirestoreMenuRepository implements MenuRepository {
  private constructor(
    private readonly db: Firestore,
    private readonly ackTimeoutMs: number,
  ) {}

  static create(db: Firestore, options?: FirestoreMenuRepositoryOptions): FirestoreMenuRepository {
    return new FirestoreMenuRepository(db, options?.ackTimeoutMs ?? DEFAULT_ACK_TIMEOUT_MS);
  }

  async save(menu: Menu): Promise<void> {
    await withAckDeadline(
      setDoc(doc(this.db, 'menus', menuDocumentId(menu.dateDebut)), menuToDocument(menu)),
      this.ackTimeoutMs,
    );
  }

  async findAll(): Promise<Menu[]> {
    let snapshot;
    try {
      snapshot = await getDocsFromServer(collection(this.db, 'menus'));
    } catch (error) {
      throw asDomainFailure(error);
    }
    return snapshot.docs.map((snapshotDoc) => documentToMenu(snapshotDoc.id, snapshotDoc.data()));
  }

  async remove(dateDebut: CalendarDate): Promise<void> {
    await withAckDeadline(
      deleteDoc(doc(this.db, 'menus', menuDocumentId(dateDebut))),
      this.ackTimeoutMs,
    );
  }
}
