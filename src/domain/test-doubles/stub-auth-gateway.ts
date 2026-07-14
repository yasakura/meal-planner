import { type AuthGateway, type Unsubscribe } from '../ports/auth-gateway';
import { type Account } from '../entities/account';

type StubBehaviour =
  | { readonly kind: 'resolve'; readonly account: Account }
  | { readonly kind: 'reject'; readonly message: string }
  | { readonly kind: 'pending' };

export class StubAuthGateway implements AuthGateway {
  public lastEmail: string | null = null;
  public lastPassword: string | null = null;
  public unsubscribed = false;
  public signOutCalled = false;
  private listener: ((account: Account | null) => void) | null = null;
  private signOutFailureMessage: string | null = null;

  private constructor(
    private readonly behaviour: StubBehaviour,
    private readonly session: Account | null = null,
    private readonly emitsSession: boolean = true,
  ) {}

  static resolvingWith(account: Account): StubAuthGateway {
    return new StubAuthGateway({ kind: 'resolve', account });
  }

  static rejectingWith(message: string): StubAuthGateway {
    return new StubAuthGateway({ kind: 'reject', message });
  }

  static pending(): StubAuthGateway {
    return new StubAuthGateway({ kind: 'pending' });
  }

  static withSession(account: Account): StubAuthGateway {
    return new StubAuthGateway({ kind: 'pending' }, account);
  }

  static withoutSession(): StubAuthGateway {
    return new StubAuthGateway({ kind: 'pending' }, null);
  }

  static withPendingSession(): StubAuthGateway {
    return new StubAuthGateway({ kind: 'pending' }, null, false);
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

  observeAuthState(listener: (account: Account | null) => void): Unsubscribe {
    this.listener = listener;
    if (this.emitsSession) {
      listener(this.session);
    }
    return () => {
      this.unsubscribed = true;
    };
  }

  failingSignOut(message: string): this {
    this.signOutFailureMessage = message;
    return this;
  }

  signOut(): Promise<void> {
    this.signOutCalled = true;
    if (this.signOutFailureMessage !== null) {
      // Comme Firebase en cas d'échec : le rejet remonte et onAuthStateChanged ne fire pas.
      return Promise.reject(new Error(this.signOutFailureMessage));
    }
    this.listener?.(null);
    return Promise.resolve();
  }
}
