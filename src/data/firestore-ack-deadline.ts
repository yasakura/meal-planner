import { RepositoryUnavailableError } from '../domain/errors/repository-unavailable-error';
import { asDomainFailure } from './firestore-failure';

/**
 * Borne au-delà de laquelle une écriture non acquittée est déclarée non confirmée.
 * Volontairement tolérante : un réseau qui rampe (signal faible mais présent) ne doit pas
 * produire un faux constat hors-ligne.
 */
export const DEFAULT_ACK_TIMEOUT_MS = 5000;

/**
 * Borne d'acquittement des ÉCRITURES Firestore, partagée par tous les adapters.
 *
 * Vit ici, et non dans un adapter, parce que le défaut qu'elle borne est celui du SDK, pas
 * celui d'une collection : hors ligne, `setDoc` et `deleteDoc` ne rejettent pas, ils mettent
 * l'écriture en file locale et n'acquittent qu'au serveur — la promesse ne se règle jamais.
 * Un écran qui l'attend reste figé sur « enregistrement en cours », sans porte de sortie et
 * sans jamais rien dire. Extrait de `firestore-convive-repository` à l'arrivée des menus et
 * des recettes : un seul point de passage, sinon un écran avouerait son ignorance là où un
 * autre se tairait indéfiniment.
 *
 * Les LECTURES ne passent pas par ici : `getDocsFromServer` et `getDocFromServer` rejettent
 * correctement hors ligne.
 */
export function withAckDeadline<T>(write: Promise<T>, ackTimeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const deadline = setTimeout(() => reject(RepositoryUnavailableError.create()), ackTimeoutMs);
    write
      .then(resolve, (error: unknown) => reject(asDomainFailure(error)))
      .finally(() => clearTimeout(deadline));
  });
}
