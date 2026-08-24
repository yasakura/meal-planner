import { type Convive } from '../../domain/entities/convive';
import { type ObserveConvives } from '../../domain/use-cases/observe-convives';

type Subscriber = {
  listener: (convives: Convive[]) => void;
  onError: (error: unknown) => void;
};

export class ConviveChannel {
  public subscriptions = 0;

  private readonly subscribers = new Set<Subscriber>();

  private constructor(
    private emission: Convive[] | null,
    private failure: unknown | null,
  ) {}

  static seededWith(convives: Convive[]): ConviveChannel {
    return new ConviveChannel(convives, null);
  }

  static silent(): ConviveChannel {
    return new ConviveChannel(null, null);
  }

  static refusingWith(error: unknown): ConviveChannel {
    return new ConviveChannel(null, error);
  }

  get observeConvives(): ObserveConvives {
    return (listener, onError) => {
      const subscriber: Subscriber = { listener, onError };
      this.subscribers.add(subscriber);
      this.subscriptions += 1;
      if (this.failure !== null) onError(this.failure);
      else if (this.emission !== null) listener(this.emission);
      return () => {
        this.subscribers.delete(subscriber);
      };
    };
  }

  get live(): number {
    return this.subscribers.size;
  }

  willEmit(convives: Convive[]): void {
    this.emission = convives;
    this.failure = null;
  }

  emit(convives: Convive[]): void {
    this.emission = convives;
    this.failure = null;
    for (const subscriber of this.subscribers) subscriber.listener(convives);
  }

  fail(error: unknown): void {
    this.failure = error;
    for (const subscriber of this.subscribers) subscriber.onError(error);
  }
}
