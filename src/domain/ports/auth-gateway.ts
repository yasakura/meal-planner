import { type Account } from '../entities/account';

export type Unsubscribe = () => void;

export interface AuthGateway {
  signIn(email: string, password: string): Promise<Account>;
  observeAuthState(listener: (account: Account | null) => void): Unsubscribe;
}
