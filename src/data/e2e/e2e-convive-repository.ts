import { type Convive } from '../../domain/entities/convive';
import { type ConviveRepository } from '../../domain/ports/convive-repository';
import { type Unsubscribe } from '../../domain/ports/unsubscribe';
import { type E2eFailureSwitch } from './e2e-failure-switch';
import { E2eOptimisticCollection } from './e2e-optimistic-collection';

export class E2eConviveRepository implements ConviveRepository {
  private constructor(
    private readonly convives: E2eOptimisticCollection<Convive>,
    private readonly failures: E2eFailureSwitch,
  ) {}

  static seededWith(
    convives: readonly Convive[],
    failures: E2eFailureSwitch,
  ): E2eConviveRepository {
    return new E2eConviveRepository(
      E2eOptimisticCollection.seededWith(
        convives.map((convive) => [convive.id, convive] as const),
        failures,
      ),
      failures,
    );
  }

  save(convive: Convive): Promise<void> {
    return this.convives.accepte((contenu) => {
      contenu.set(convive.id, convive);
    });
  }

  async findAll(): Promise<Convive[]> {
    return this.convives.lireTout();
  }

  updateOnlyIfExists(convive: Convive): Promise<void> {
    if (!this.convives.contient(convive.id)) {
      this.failures.refuseNotFound();
      return Promise.resolve();
    }
    return this.convives.accepte((contenu) => {
      contenu.set(convive.id, convive);
    });
  }

  remove(id: string): Promise<void> {
    return this.convives.accepte((contenu) => {
      contenu.delete(id);
    });
  }

  observeAll(
    listener: (convives: Convive[]) => void,
    onError: (error: unknown) => void,
  ): Unsubscribe {
    return this.convives.observeAll(listener, onError);
  }
}
