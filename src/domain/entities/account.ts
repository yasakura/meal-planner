export type Account = {
  readonly id: string;
  readonly email: string;
};

export type AccountProps = {
  id: string;
  email: string;
};

export function createAccount(props: AccountProps): Account {
  const id = props.id.trim();
  if (id === '') {
    throw new Error("L'identifiant du compte est obligatoire");
  }
  const email = props.email.trim();
  if (email === '') {
    throw new Error("L'email du compte est obligatoire");
  }
  return Object.freeze({ id, email });
}
