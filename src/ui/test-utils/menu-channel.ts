import { type ObserveMenus, type MenuNavigation } from '../../domain/use-cases/observe-menus';

type Subscriber = {
  listener: (navigation: MenuNavigation) => void;
  onError: (error: unknown) => void;
};

export class MenuChannel {
  public subscriptions = 0;

  private readonly subscribers = new Set<Subscriber>();

  private constructor(
    private emission: MenuNavigation | null,
    private failure: unknown | null,
  ) {}

  static seededWith(navigation: MenuNavigation): MenuChannel {
    return new MenuChannel(navigation, null);
  }

  static silent(): MenuChannel {
    return new MenuChannel(null, null);
  }

  static refusingWith(error: unknown): MenuChannel {
    return new MenuChannel(null, error);
  }

  get observeMenus(): ObserveMenus {
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

  willEmit(navigation: MenuNavigation): void {
    this.emission = navigation;
    this.failure = null;
  }

  emit(navigation: MenuNavigation): void {
    this.emission = navigation;
    this.failure = null;
    for (const subscriber of this.subscribers) subscriber.listener(navigation);
  }

  fail(error: unknown): void {
    this.failure = error;
    for (const subscriber of this.subscribers) subscriber.onError(error);
  }
}

export function emittingMenus(navigation: MenuNavigation): ObserveMenus {
  return MenuChannel.seededWith(navigation).observeMenus;
}
