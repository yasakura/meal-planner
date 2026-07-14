import { type Account } from '../entities/account';

export interface AuthGateway {
  signIn(email: string, password: string): Promise<Account>;
}
