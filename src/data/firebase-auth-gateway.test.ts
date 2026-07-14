import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Auth, signInWithEmailAndPassword } from 'firebase/auth';
import { FirebaseAuthGateway } from './firebase-auth-gateway';

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
}));

const mockedSignIn = vi.mocked(signInWithEmailAndPassword);

describe('FirebaseAuthGateway', () => {
  const auth = { marker: 'auth-sentinel' } as unknown as Auth;

  beforeEach(() => {
    mockedSignIn.mockReset();
  });

  it('mappe le UserCredential Firebase vers un Account et forwarde (auth, email, password)', async () => {
    mockedSignIn.mockResolvedValue({
      user: { uid: 'uid-1', email: 'aurelie@foyer.test' },
    } as never);
    const gateway = FirebaseAuthGateway.create(auth);

    const account = await gateway.signIn('aurelie@foyer.test', 'secret');

    expect(account).toEqual({ id: 'uid-1', email: 'aurelie@foyer.test' });
    expect(mockedSignIn).toHaveBeenCalledWith(auth, 'aurelie@foyer.test', 'secret');
  });

  it("propage l'erreur Firebase sans l'avaler", async () => {
    mockedSignIn.mockRejectedValue(new Error('auth/wrong-password'));
    const gateway = FirebaseAuthGateway.create(auth);

    await expect(gateway.signIn('aurelie@foyer.test', 'mauvais')).rejects.toThrow(
      'auth/wrong-password',
    );
  });

  it('email null côté Firebase → erreur domaine (frontière donnée incomplète)', async () => {
    mockedSignIn.mockResolvedValue({
      user: { uid: 'uid-1', email: null },
    } as never);
    const gateway = FirebaseAuthGateway.create(auth);

    await expect(gateway.signIn('aurelie@foyer.test', 'secret')).rejects.toThrow(
      "L'email du compte est obligatoire",
    );
  });

  // [GUARD] Symétrie avec le test email null (green-on-arrival) : createAccount valide déjà
  // l'id via sa branche id vide. Documente que l'adapter fait porter l'invariant des DEUX
  // champs Firebase (uid + email) par la factory domaine, pas seulement l'email.
  it('uid vide côté Firebase → erreur domaine (frontière donnée incomplète)', async () => {
    mockedSignIn.mockResolvedValue({
      user: { uid: '', email: 'aurelie@foyer.test' },
    } as never);
    const gateway = FirebaseAuthGateway.create(auth);

    await expect(gateway.signIn('aurelie@foyer.test', 'secret')).rejects.toThrow(
      "L'identifiant du compte est obligatoire",
    );
  });
});
