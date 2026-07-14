import { type AuthGateway } from '../ports/auth-gateway';
import { type Account } from '../entities/account';

type StubBehaviour =
  | { readonly kind: 'resolve'; readonly account: Account }
  | { readonly kind: 'reject'; readonly message: string }
  | { readonly kind: 'pending' };

export class StubAuthGateway implements AuthGateway {
  public lastEmail: string | null = null;
  public lastPassword: string | null = null;

  private constructor(private readonly behaviour: StubBehaviour) {}

  static resolvingWith(account: Account): StubAuthGateway {
    return new StubAuthGateway({ kind: 'resolve', account });
  }

  static rejectingWith(message: string): StubAuthGateway {
    return new StubAuthGateway({ kind: 'reject', message });
  }

  static pending(): StubAuthGateway {
    return new StubAuthGateway({ kind: 'pending' });
  }

  signIn(email: string, password: string): Promise<Account> {
    this.lastEmail = email;
    this.lastPassword = password;
    if (this.behaviour.kind === 'reject') {
      return Promise.reject(new Error(this.behaviour.message));
    }
    if (this.behaviour.kind === 'pending') {
      return new Promise<Account>(() => {});
    }
    return Promise.resolve(this.behaviour.account);
  }
}
