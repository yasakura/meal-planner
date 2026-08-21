import { type Account } from '../../domain/entities/account';
import { type AuthGateway, type Unsubscribe } from '../../domain/ports/auth-gateway';

export class E2eAuthGateway implements AuthGateway {
  private listeners: ((account: Account | null) => void)[] = [];

  private constructor(private readonly account: Account) {}

  static signedInAs(account: Account): E2eAuthGateway {
    return new E2eAuthGateway(account);
  }

  signIn(): Promise<Account> {
    return Promise.resolve(this.account);
  }

  observeAuthState(listener: (account: Account | null) => void): Unsubscribe {
    this.listeners.push(listener);
    listener(this.account);
    return () => {
      this.listeners = this.listeners.filter((registered) => registered !== listener);
    };
  }

  signOut(): Promise<void> {
    for (const listener of this.listeners) listener(null);
    return Promise.resolve();
  }
}
