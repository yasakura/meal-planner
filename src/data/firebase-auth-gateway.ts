import { type Auth, signInWithEmailAndPassword } from 'firebase/auth';

import { type AuthGateway } from '../domain/ports/auth-gateway';
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
}
