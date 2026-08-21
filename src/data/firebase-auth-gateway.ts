import {
  type Auth,
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';

import { type AuthGateway, type Unsubscribe } from '../domain/ports/auth-gateway';
import { createAccount, type Account } from '../domain/entities/account';

export class FirebaseAuthGateway implements AuthGateway {
  private constructor(private readonly auth: Auth) {}

  static create(auth: Auth): FirebaseAuthGateway {
    return new FirebaseAuthGateway(auth);
  }

  async signIn(email: string, password: string): Promise<Account> {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    return createAccount({ id: credential.user.uid, email: credential.user.email ?? '' });
  }

  observeAuthState(listener: (account: Account | null) => void): Unsubscribe {
    return onAuthStateChanged(this.auth, (user) => listener(this.toAccount(user)));
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(this.auth);
  }

  private toAccount(user: User | null): Account | null {
    if (!user) return null;
    try {
      return createAccount({ id: user.uid, email: user.email ?? '' });
    } catch {
      return null;
    }
  }
}
