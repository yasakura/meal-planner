import { type Convive } from '../entities/convive';
import { type ConviveRepository } from '../ports/convive-repository';

export class InMemoryConviveRepository implements ConviveRepository {
  public saveCount = 0;
  public removeCount = 0;
  /** Compte les APPELS, pas les écritures : un id inconnu n'écrit rien mais a bien été demandé. */
  public updateCount = 0;
  private readonly convives = new Map<string, Convive>();

  private constructor() {}

  static create(): InMemoryConviveRepository {
    return new InMemoryConviveRepository();
  }

  save(convive: Convive): Promise<void> {
    this.saveCount += 1;
    this.convives.set(convive.id, convive);
    return Promise.resolve();
  }

  /**
   * Rend l'ordre d'insertion INVERSÉ, délibérément.
   *
   * Le port déclare un ordre **non garanti** : ce double doit donc exercer activement
   * cette absence de garantie, jamais rendre l'ordre d'insertion « par gentillesse ».
   * Un double plus aimable que son contrat est un faux vert structurel — aucun test ne
   * peut l'attraper, puisque c'est le référentiel lui-même qui ment.
   *
   * Inversion et non mélange pseudo-aléatoire : c'est déterministe (suite reproductible)
   * ET garanti différent de l'ordre d'insertion dès deux éléments, là où un shuffle seedé
   * peut retomber sur l'identité et affaiblir le garde en silence.
   *
   * Vécu FR-3 : ce double rendait l'ordre d'insertion, Firestore rend l'ordre des
   * identifiants (cuid2, non triable). Suite verte, écran affichant un ordre aléatoire à
   * chaque rechargement — trouvé par la vérif navigateur seulement.
   */
  findAll(): Promise<Convive[]> {
    return Promise.resolve(this.all().reverse());
  }

  /**
   * Atomique par construction (synchrone, mono-thread) — il n'y a rien à protéger ici.
   *
   * Mais le port prévient que `transform` peut être REJOUÉE (une transaction Firestore
   * rejoue son corps en cas de contention). Ce double exerce donc activement cette absence
   * de garantie : il appelle `transform` DEUX fois et ne retient que le second résultat.
   * Une transformation impure — qui incrémenterait un compteur, consommerait un générateur
   * d'id ou lirait l'horloge — casse alors ici, dans `domain/`, et non des mois plus tard
   * sur une écriture concurrente en production.
   *
   * Écrit sous l'id DEMANDÉ, jamais sous celui du convive rendu par `transform` : l'adapter
   * Firestore réécrit le document `convives/{id}` qu'il vient de lire, il n'en déplace
   * aucun. Un double plus arrangeant rendrait vert un renommage d'identifiant que le vrai
   * adapter n'a jamais su faire.
   */
  updateExisting(
    id: string,
    transform: (existing: Convive) => Convive,
  ): Promise<Convive | undefined> {
    this.updateCount += 1;
    const existing = this.convives.get(id);
    if (existing === undefined) return Promise.resolve(undefined);
    transform(existing);
    const updated = transform(existing);
    this.convives.set(id, updated);
    return Promise.resolve(updated);
  }

  /** Inspection de test, hors contrat du port : le port n'offre aucune lecture unitaire. */
  byId(id: string): Convive | undefined {
    return this.convives.get(id);
  }

  /**
   * Efface, et ne promet rien de plus que le port : effacer un id inconnu est un succès
   * silencieux (`Map.delete` ne lève pas). `removeCount` compte les APPELS, pas les
   * effacements effectifs — sinon un test d'idempotence ne pourrait pas distinguer
   * « appelé et sans effet » de « jamais appelé ».
   */
  remove(id: string): Promise<void> {
    this.removeCount += 1;
    this.convives.delete(id);
    return Promise.resolve();
  }

  /** Inspection de test : rend l'ordre d'insertion, honnêtement. Hors contrat du port. */
  all(): Convive[] {
    return [...this.convives.values()];
  }
}
