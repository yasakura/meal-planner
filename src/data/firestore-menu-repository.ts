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
import { menuDocumentId, menuToDocument, startDateFromDocumentId } from './menu-mapper';

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

  /**
   * UPSERT sans effort : l'identifiant du document est la période elle-même, donc réécrire la
   * même date de début remplace le menu au lieu d'en ajouter un second.
   */
  async save(menu: Menu): Promise<void> {
    // Bornée : hors ligne, `setDoc` ne rejette pas, il met l'écriture en file locale et
    // n'acquitte qu'au serveur — la promesse ne se règle jamais. Sans borne, l'écran resterait
    // figé sur « enregistrement en cours », sans jamais rien dire.
    await withAckDeadline(
      setDoc(doc(this.db, 'menus', menuDocumentId(menu.dateDebut)), menuToDocument(menu)),
      this.ackTimeoutMs,
    );
  }

  /**
   * Les identifiants SEULS : la période est l'identifiant du document, il n'y a donc aucun
   * corps à lire pour la connaître. Aucun `orderBy` — le port ne promet aucun ordre.
   *
   * Aucun filtre non plus : la rétention est une règle, elle appartient au domaine. Un adapter
   * qui écarterait ici les périodes trop vieilles priverait le domaine de ce qu'il doit
   * effacer, et l'historique enflerait sans que rien ne le signale.
   */
  async findAllStartDates(): Promise<CalendarDate[]> {
    // `getDocsFromServer` et non `getDocs` : hors ligne, `getDocs` ne rejette pas, il sert le
    // cache et renvoie un snapshot VIDE. Le domaine croirait l'historique vide et
    // n'effacerait rien, sans jamais savoir qu'il n'avait pas lu.
    let snapshot;
    try {
      snapshot = await getDocsFromServer(collection(this.db, 'menus'));
    } catch (error) {
      throw asDomainFailure(error);
    }
    return snapshot.docs.map((snapshotDoc) => startDateFromDocumentId(snapshotDoc.id));
  }

  /** Idempotent comme le port : Firestore accepte l'effacement d'un document absent. */
  async remove(dateDebut: CalendarDate): Promise<void> {
    // Bornée comme `save`, et pour le même défaut : hors ligne `deleteDoc` n'acquitte qu'au
    // serveur, et la promesse ne se règle jamais.
    await withAckDeadline(
      deleteDoc(doc(this.db, 'menus', menuDocumentId(dateDebut))),
      this.ackTimeoutMs,
    );
  }
}
