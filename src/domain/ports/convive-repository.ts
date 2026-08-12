import { type Convive } from '../entities/convive';

export interface ConviveRepository {
  save(convive: Convive): Promise<void>;
  /**
   * Retourne TOUS les convives du foyer, dans un ordre **non garanti** : l'adapter
   * Firestore lit la collection sans `orderBy` et restitue donc l'ordre des identifiants
   * de documents (cuid2, délibérément non triable). Aucun adapter n'est tenu de
   * reproduire un ordre d'insertion — il n'en a pas la trace.
   * L'ordre d'affichage est décidé par `listConvivesUseCase` (alphabétique par prénom,
   * collation française).
   * Contrat : le tableau renvoyé est **frais** (propriété exclusive de l'appelant) —
   * `listConvivesUseCase` le trie EN PLACE sans copie défensive, donc un adapter ne doit
   * jamais exposer une référence vers son état interne mutable.
   */
  findAll(): Promise<Convive[]>;
}
