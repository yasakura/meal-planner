import { RepositoryUnavailableError } from '../domain/errors/repository-unavailable-error';

/**
 * Traduction des pannes du SDK Firestore vers le vocabulaire du domaine.
 *
 * Vit ici, et non dans un adapter, parce que c'est un CONTRAT et pas un détail : tout
 * adapter `data/` doit rendre la même réponse à la même panne, sinon un écran dirait
 * « aucune connexion » là où un autre dirait « impossible de charger ». Extrait de
 * `firestore-convive-repository` à l'arrivée du second consommateur (les recettes).
 */

// Le SDK signale une panne réseau par ce code ; tout autre code (permission-denied,
// not-found…) décrit un serveur qui a bel et bien répondu.
// Lecture totale par `?.` : le canal de rejet n'est pas typé, et une valeur sans `code`
// — voire non-objet — doit répondre « non », jamais faire crasher la traduction.
function isNetworkUnavailable(error: unknown): boolean {
  return (error as { code?: unknown } | null | undefined)?.code === 'unavailable';
}

/**
 * Frontière `data → domain` : point de passage UNIQUE des pannes, lecture comme écriture,
 * pour tous les adapters. Une asymétrie ici se paierait cher — une écriture refusée pour
 * panne réseau qui remonterait brute passerait pour un échec, et le formulaire se
 * réarmerait alors que l'écriture peut encore aboutir.
 */
export function asDomainFailure(error: unknown): unknown {
  return isNetworkUnavailable(error) ? RepositoryUnavailableError.create() : error;
}
