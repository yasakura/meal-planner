import { type Convive } from '../entities/convive';
import { type ConviveRepository } from '../ports/convive-repository';
import { type Unsubscribe } from '../ports/unsubscribe';

export class InMemoryConviveRepository implements ConviveRepository {
  public saveCount = 0;
  public removeCount = 0;
  public updateCount = 0;
  private readonly convives = new Map<string, Convive>();
  private readonly listeners = new Set<(convives: Convive[]) => void>();

  private constructor() {}

  static create(): InMemoryConviveRepository {
    return new InMemoryConviveRepository();
  }

  save(convive: Convive): Promise<void> {
    this.saveCount += 1;
    this.convives.set(convive.id, convive);
    this.emit();
    return Promise.resolve();
  }

  findAll(): Promise<Convive[]> {
    return Promise.resolve(this.snapshot());
  }

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
    this.emit();
    return Promise.resolve(updated);
  }

  byId(id: string): Convive | undefined {
    return this.convives.get(id);
  }

  remove(id: string): Promise<void> {
    this.removeCount += 1;
    this.convives.delete(id);
    this.emit();
    return Promise.resolve();
  }

  all(): Convive[] {
    return [...this.convives.values()];
  }

  observeAll(listener: (convives: Convive[]) => void): Unsubscribe {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private snapshot(): Convive[] {
    return this.all().reverse();
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.snapshot());
  }
}
