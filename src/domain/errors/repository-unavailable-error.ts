/**
 * Signal de domaine : le dépôt n'a pas pu répondre. Ce n'est ni un résultat vide, ni un
 * échec métier — c'est l'absence de réponse.
 *
 * CONVENTION (première de `domain/errors/`) : tout adapter `data/` traduit ses pannes
 * d'infrastructure dans ce vocabulaire au lieu de laisser fuiter une erreur de SDK. Le
 * domaine n'a ainsi jamais à connaître Firestore, et l'UI dispose d'un seul critère pour
 * choisir entre « aucune connexion » et « impossible de charger ».
 */
const REPOSITORY_UNAVAILABLE_NAME = 'RepositoryUnavailableError';

export class RepositoryUnavailableError extends Error {
  private constructor() {
    super("Le dépôt n'a pas répondu.");
    this.name = REPOSITORY_UNAVAILABLE_NAME;
  }

  static create(): RepositoryUnavailableError {
    return new RepositoryUnavailableError();
  }
}

/**
 * Reconnaissance NOMINALE, délibérément pas `instanceof` : Redux Toolkit ne stocke jamais
 * l'instance rejetée par un thunk, il la remplace par une copie plate (`miniSerializeError`)
 * qui a perdu son prototype. Un `instanceof` laisserait l'UI aveugle exactement là où la
 * distinction doit servir.
 */
export function isRepositoryUnavailable(candidate: unknown): boolean {
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    'name' in candidate &&
    (candidate as { name: unknown }).name === REPOSITORY_UNAVAILABLE_NAME
  );
}
