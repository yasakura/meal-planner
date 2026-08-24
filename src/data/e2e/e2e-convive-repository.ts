import { type Convive } from '../../domain/entities/convive';
import { RepositoryUnavailableError } from '../../domain/errors/repository-unavailable-error';
import { type ConviveRepository } from '../../domain/ports/convive-repository';
import { type Unsubscribe } from '../../domain/ports/unsubscribe';
import { type E2eFailureSwitch } from './e2e-failure-switch';

export class E2eConviveRepository implements ConviveRepository {
  private convives: Map<string, Convive>;

  private readonly listeners = new Set<(convives: Convive[]) => void>();

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

  save(convive: Convive): Promise<void> {
    return this.accepteLocalement(() => {
      this.convives.set(convive.id, convive);
    });
  }

  async findAll(): Promise<Convive[]> {
    this.failures.guardRead();
    return this.snapshot();
  }

  updateOnlyIfExists(convive: Convive): Promise<void> {
    return this.accepteLocalement(() => {
      if (!this.convives.has(convive.id)) return;
      this.convives.set(convive.id, convive);
    });
  }

  remove(id: string): Promise<void> {
    return this.accepteLocalement(() => {
      this.convives.delete(id);
    });
  }

  observeAll(
    listener: (convives: Convive[]) => void,
    onError: (error: unknown) => void,
  ): Unsubscribe {
    this.listeners.add(listener);
    if (this.failures.readsAreDown()) onError(RepositoryUnavailableError.create());
    else listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private accepteLocalement(ecriture: () => void): Promise<void> {
    const avantEcriture = new Map(this.convives);
    ecriture();
    this.emit();
    this.failures.refuseAfterwards(() => {
      this.convives = avantEcriture;
      this.emit();
    });
    return Promise.resolve();
  }

  private snapshot(): Convive[] {
    return [...this.convives.values()].reverse();
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.snapshot());
  }
}
