import { type Convive } from '../entities/convive';
import { type ConviveRepository } from '../ports/convive-repository';
import { type Unsubscribe } from '../ports/unsubscribe';
import { seededShuffle } from '../lib/seeded-shuffle';

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

  updateOnlyIfExists(convive: Convive): Promise<void> {
    this.updateCount += 1;
    if (!this.convives.has(convive.id)) return Promise.resolve();
    this.convives.set(convive.id, convive);
    this.emit();
    return Promise.resolve();
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
    return seededShuffle(this.all());
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.snapshot());
  }
}
