import {
  type Firestore,
  collection,
  deleteDoc,
  doc,
  getDocsFromServer,
  runTransaction,
  setDoc,
} from 'firebase/firestore';

import { type ConviveRepository } from '../domain/ports/convive-repository';
import { type Convive } from '../domain/entities/convive';
import { conviveToDocument, documentToConvive } from './convive-mapper';
// Borne d'acquittement PARTAGÉE (`firestore-ack-deadline`) : extraite d'ici à l'arrivée des
// menus et des recettes, qui subissent le même défaut du SDK sur leurs écritures.
import { DEFAULT_ACK_TIMEOUT_MS, withAckDeadline } from './firestore-ack-deadline';
// Traduction `data → domain` PARTAGÉE (`firestore-failure`) : extraite d'ici à l'arrivée du
// second consommateur, l'adapter recettes. Deux adapters, un seul point de passage — sinon
// un écran dirait « aucune connexion » là où l'autre dirait « impossible de charger ».
import { asDomainFailure } from './firestore-failure';

export type FirestoreConviveRepositoryOptions = {
  ackTimeoutMs?: number;
};

export class FirestoreConviveRepository implements ConviveRepository {
  private constructor(
    private readonly db: Firestore,
    private readonly ackTimeoutMs: number,
  ) {}

  static create(
    db: Firestore,
    options?: FirestoreConviveRepositoryOptions,
  ): FirestoreConviveRepository {
    return new FirestoreConviveRepository(db, options?.ackTimeoutMs ?? DEFAULT_ACK_TIMEOUT_MS);
  }

  async save(convive: Convive): Promise<void> {
    // Hors ligne, `setDoc` ne rejette pas : il met l'écriture en file locale et n'acquitte
    // qu'au serveur — la promesse ne se règle jamais. Sans borne, l'écran resterait figé
    // sur « ajout en cours » sans jamais rien dire.
    await withAckDeadline(
      setDoc(doc(this.db, 'convives', convive.id), conviveToDocument(convive)),
      this.ackTimeoutMs,
    );
  }

  async findAll(): Promise<Convive[]> {
    // `getDocsFromServer` et non `getDocs` : hors ligne, `getDocs` ne rejette pas, il sert
    // le cache et renvoie un snapshot VIDE. L'app affichait alors un foyer vide inventé, et
    // l'utilisateur re-saisissait ses convives — doublons au retour du réseau. On veut la
    // vérité du serveur, ou l'aveu qu'on ne l'a pas.
    // Rien n'est sacrifié en ligne : mesuré sur la vraie base, `getDocs` interroge DÉJÀ le
    // serveur à chaque appel (`fromCache=false`, médiane 63 ms) et la lecture serveur est
    // même plus rapide et plus régulière (31 ms). Il n'y a aucun repli cache à perdre.
    let snapshot;
    try {
      snapshot = await getDocsFromServer(collection(this.db, 'convives'));
    } catch (error) {
      throw asDomainFailure(error);
    }
    return snapshot.docs.map((snapshotDoc) =>
      documentToConvive(snapshotDoc.id, snapshotDoc.data()),
    );
  }

  async updateExisting(
    id: string,
    transform: (existing: Convive) => Convive,
  ): Promise<Convive | undefined> {
    const ref = doc(this.db, 'convives', id);
    // Une transaction, et non `getDocFromServer` puis `setDoc` : ces deux-là laissent entre
    // eux un intervalle pendant lequel l'autre compte du board peut supprimer le convive,
    // et l'écriture — un upsert — le ressusciterait. Ici la lecture et l'écriture sont
    // indivisibles ; si le document a changé entre-temps, Firestore rejoue tout le corps.
    //
    // Aucune décision n'est prise ici : le domaine fournit `transform`, l'adapter ne fait
    // que garantir l'atomicité et rapporter l'absence.
    //
    // Bornée comme `save` et `remove` : sur un réseau qui rampe, les cinq tentatives de
    // Firestore peuvent s'étirer bien au-delà de ce que l'écran peut taire.
    return await withAckDeadline(
      runTransaction(this.db, async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) return undefined;
        const updated = transform(documentToConvive(snapshot.id, snapshot.data()));
        transaction.set(ref, conviveToDocument(updated));
        return updated;
      }),
      this.ackTimeoutMs,
    );
  }

  async remove(id: string): Promise<void> {
    // Bornée comme `save`, et pour le même défaut mesuré : hors ligne `deleteDoc` ne rejette
    // pas non plus, il met l'effacement en file locale et n'acquitte qu'au serveur — la
    // promesse ne se règle jamais. Sans borne, l'écran resterait figé sur « suppression en
    // cours », bouton verrouillé, sans jamais rien dire. La borne est ce qui permet à l'UI
    // d'avouer qu'elle ne sait pas, au lieu de se taire indéfiniment.
    await withAckDeadline(deleteDoc(doc(this.db, 'convives', id)), this.ackTimeoutMs);
  }
}
