import { type Firestore, collection, doc, getDocsFromServer, setDoc } from 'firebase/firestore';

import { type ConviveRepository } from '../domain/ports/convive-repository';
import { type Convive } from '../domain/entities/convive';
import { RepositoryUnavailableError } from '../domain/errors/repository-unavailable-error';
import { conviveToDocument, documentToConvive } from './convive-mapper';
// Traduction `data → domain` PARTAGÉE (`firestore-failure`) : extraite d'ici à l'arrivée du
// second consommateur, l'adapter recettes. Deux adapters, un seul point de passage — sinon
// un écran dirait « aucune connexion » là où l'autre dirait « impossible de charger ».
import { asDomainFailure } from './firestore-failure';

/**
 * Borne au-delà de laquelle une écriture non acquittée est déclarée non confirmée.
 * Volontairement tolérante : un réseau qui rampe (signal faible mais présent) ne doit pas
 * produire un faux constat hors-ligne.
 */
const DEFAULT_ACK_TIMEOUT_MS = 5000;

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
    await this.withAckDeadline(
      setDoc(doc(this.db, 'convives', convive.id), conviveToDocument(convive)),
    );
  }

  private withAckDeadline(write: Promise<void>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const deadline = setTimeout(
        () => reject(RepositoryUnavailableError.create()),
        this.ackTimeoutMs,
      );
      write
        .then(resolve, (error: unknown) => reject(asDomainFailure(error)))
        .finally(() => clearTimeout(deadline));
    });
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
}
