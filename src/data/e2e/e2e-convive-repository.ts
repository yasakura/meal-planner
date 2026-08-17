import { type Convive } from '../../domain/entities/convive';
import { type ConviveRepository } from '../../domain/ports/convive-repository';
import { type E2eFailureSwitch } from './e2e-failure-switch';

/**
 * Dépôt de convives en mémoire, embarqué dans l'application en mode e2e uniquement.
 * Même statut que `E2eRecipeRepository` : un adapter, pas un test-double, mais tenu à la même
 * hostilité — il n'offre aucune garantie que le port ne promet pas.
 */
export class E2eConviveRepository implements ConviveRepository {
  private readonly convives: Map<string, Convive>;

  private constructor(
    convives: readonly Convive[],
    private readonly failures: E2eFailureSwitch,
  ) {
    this.convives = new Map(convives.map((convive) => [convive.id, convive]));
  }

  static seededWith(
    convives: readonly Convive[],
    failures: E2eFailureSwitch,
  ): E2eConviveRepository {
    return new E2eConviveRepository(convives, failures);
  }

  /** UPSERT, comme le port l'exige : même id, entrée remplacée — pas une seconde entrée. */
  async save(convive: Convive): Promise<void> {
    this.failures.guardWrite();
    this.convives.set(convive.id, convive);
  }

  /**
   * Ordre d'insertion INVERSÉ, délibérément — Firestore rend l'ordre des identifiants (cuid2,
   * non triable par construction) et le port ne promet donc rien. Vécu FR-3 : un double qui
   * rendait l'ordre d'insertion, une suite verte, et un écran qui se réordonnait au hasard à
   * chaque rechargement.
   */
  async findAll(): Promise<Convive[]> {
    this.failures.guardRead();
    return [...this.convives.values()].reverse();
  }

  /**
   * Atomique par construction (synchrone, mono-thread) : il n'y a rien à protéger ici. Mais le
   * port prévient qu'une transaction Firestore REJOUE son corps en cas de contention — cet
   * adapter exerce donc l'absence de garantie en appelant `transform` deux fois et en ne
   * retenant que le second résultat. Une transformation impure casse ici, en scénario, et non
   * des mois plus tard sur une écriture concurrente réelle.
   *
   * Écrit sous l'id DEMANDÉ : l'adapter Firestore réécrit le document qu'il vient de lire, il
   * n'en déplace aucun.
   */
  async updateExisting(
    id: string,
    transform: (existing: Convive) => Convive,
  ): Promise<Convive | undefined> {
    this.failures.guardWrite();
    const existing = this.convives.get(id);
    if (existing === undefined) return undefined;
    transform(existing);
    const updated = transform(existing);
    this.convives.set(id, updated);
    return updated;
  }

  /** IDEMPOTENT : effacer un id inconnu est un succès silencieux, jamais un rejet. */
  async remove(id: string): Promise<void> {
    this.failures.guardWrite();
    this.convives.delete(id);
  }
}
