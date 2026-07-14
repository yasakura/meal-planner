import { createAccount, type Account } from '../entities/account';

export class AccountBuilder {
  private constructor(
    private id: string,
    private email: string,
  ) {}

  static anAccount(): AccountBuilder {
    return new AccountBuilder('account-1', 'aurelie@foyer.test');
  }

  withId(id: string): AccountBuilder {
    return new AccountBuilder(id, this.email);
  }

  withEmail(email: string): AccountBuilder {
    return new AccountBuilder(this.id, email);
  }

  withoutId(): AccountBuilder {
    return this.withId('');
  }

  withoutEmail(): AccountBuilder {
    return this.withEmail('');
  }

  build(): Account {
    return createAccount({ id: this.id, email: this.email });
  }
}
