import { RepositoryUnavailableError } from '../../domain/errors/repository-unavailable-error';
import { seededShuffle } from '../../domain/lib/seeded-shuffle';
import { type Unsubscribe } from '../../domain/ports/unsubscribe';
import { type E2eFailureSwitch } from './e2e-failure-switch';

export type EcritureLocale<T> = (contenu: Map<string, T>) => void;

export class E2eOptimisticCollection<T> {
  private readonly origine: Map<string, T>;
  private readonly enAttente: EcritureLocale<T>[] = [];
  private readonly listeners = new Set<(valeurs: T[]) => void>();

  private constructor(
    origine: Map<string, T>,
    private readonly failures: E2eFailureSwitch,
  ) {
    this.origine = origine;
  }

  static seededWith<T>(
    entrees: readonly (readonly [string, T])[],
    failures: E2eFailureSwitch,
  ): E2eOptimisticCollection<T> {
    return new E2eOptimisticCollection<T>(new Map(entrees), failures);
  }

  accepte(ecriture: EcritureLocale<T>): Promise<void> {
    this.enAttente.push(ecriture);
    this.emit();
    this.failures.refuseAfterwards(() => {
      this.enAttente.splice(this.enAttente.indexOf(ecriture), 1);
      this.emit();
    });
    return Promise.resolve();
  }

  contient(id: string): boolean {
    return this.vue().has(id);
  }

  lireTout(): T[] {
    this.failures.guardRead();
    return this.instantane();
  }

  lireUn(id: string): T | undefined {
    this.failures.guardRead();
    return this.vue().get(id);
  }

  observeAll(listener: (valeurs: T[]) => void, onError: (error: unknown) => void): Unsubscribe {
    this.listeners.add(listener);
    if (this.failures.readsAreDown()) onError(RepositoryUnavailableError.create());
    else listener(this.instantane());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private vue(): Map<string, T> {
    const contenu = new Map(this.origine);
    for (const ecriture of this.enAttente) ecriture(contenu);
    return contenu;
  }

  private instantane(): T[] {
    return seededShuffle([...this.vue().values()]);
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.instantane());
  }
}
