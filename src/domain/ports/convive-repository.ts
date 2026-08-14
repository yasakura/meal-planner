import { type Convive } from '../entities/convive';

export interface ConviveRepository {
  /**
   * UPSERT : crée le convive d'id donné, ou remplace intégralement celui qui existe déjà.
   * C'est aussi le chemin d'écriture du **renommage** — un convive renommé est le même
   * convive (même id) avec un autre prénom, pas une nouvelle entrée.
   * Conséquence : `save` ne peut pas servir de garde d'existence (il ressusciterait un
   * convive supprimé). Toute écriture qui exige que le convive existe passe par
   * `updateExisting`, jamais par `save`.
   */
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
  /**
   * Lecture-écriture ATOMIQUE du convive d'id donné.
   *
   * L'adapter lit, applique `transform`, et réécrit — le tout dans une seule opération
   * indivisible. C'est la seule forme qui tienne la garde anti-résurrection : un
   * `findById` suivi d'un `save` est un check-then-act, et entre les deux l'autre compte du
   * board peut supprimer le convive que `save`, upsert, ferait alors réapparaître.
   *
   * Le domaine fournit `transform` : c'est LUI qui construit l'entité (donc qui applique
   * les invariants de `createConvive`). L'adapter n'orchestre que l'atomicité, il ne décide
   * rien — ni la forme du convive, ni ce qu'il faut faire de son absence.
   *
   * `undefined` : le convive n'existait pas au moment de l'écriture, et RIEN n'a été écrit.
   * C'est un fait rapporté, pas un verdict — au domaine de décider si c'est une erreur.
   *
   * `transform` DOIT être PURE et sans effet de bord : une transaction Firestore rejoue son
   * corps entier en cas de contention, donc `transform` peut être appelée plusieurs fois
   * pour une seule écriture. Si elle lève, rien n'est écrit et l'erreur remonte telle quelle
   * à l'appelant.
   */
  updateExisting(
    id: string,
    transform: (existing: Convive) => Convive,
  ): Promise<Convive | undefined>;
  /**
   * Efface DÉFINITIVEMENT le convive d'id donné. Pas de tombstone, pas de champ « retiré » :
   * le document disparaît et le prénom est perdu (décision assumée — deux convives supprimés
   * seront indiscernables dans un historique futur).
   *
   * IDEMPOTENT : effacer un id inconnu est un succès silencieux, jamais un rejet. L'appel
   * énonce un état cible (« ce convive n'est plus là ») qui est déjà atteint. Exiger un rejet
   * imposerait une lecture préalable — un round-trip de plus, et un garde intenable sur un
   * board à deux comptes qui peuvent supprimer le même convive au même instant.
   */
  remove(id: string): Promise<void>;
}
