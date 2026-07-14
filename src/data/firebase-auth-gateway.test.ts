import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Auth, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { FirebaseAuthGateway } from './firebase-auth-gateway';

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

const mockedSignIn = vi.mocked(signInWithEmailAndPassword);
const mockedOnAuthStateChanged = vi.mocked(onAuthStateChanged);

describe('FirebaseAuthGateway', () => {
  const auth = { marker: 'auth-sentinel' } as unknown as Auth;

  beforeEach(() => {
    mockedSignIn.mockReset();
    mockedOnAuthStateChanged.mockReset();
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

  it('observeAuthState mappe un User Firebase présent vers un Account transmis au listener', () => {
    const unsub = vi.fn();
    mockedOnAuthStateChanged.mockImplementation((_auth, next) => {
      (next as (user: unknown) => void)({ uid: 'uid-1', email: 'aurelie@foyer.test' });
      return unsub;
    });
    const gateway = FirebaseAuthGateway.create(auth);
    const received: Array<unknown> = [];

    gateway.observeAuthState((account) => received.push(account));

    expect(received).toEqual([{ id: 'uid-1', email: 'aurelie@foyer.test' }]);
    expect(mockedOnAuthStateChanged).toHaveBeenCalledWith(auth, expect.any(Function));
  });

  it('observeAuthState mappe un User Firebase absent vers null', () => {
    mockedOnAuthStateChanged.mockImplementation((_auth, next) => {
      (next as (user: unknown) => void)(null);
      return vi.fn();
    });
    const gateway = FirebaseAuthGateway.create(auth);
    const received: Array<unknown> = [];

    gateway.observeAuthState((account) => received.push(account));

    expect(received).toEqual([null]);
  });

  it('observeAuthState : un User Firebase avec email null → listener reçoit null sans throw', () => {
    mockedOnAuthStateChanged.mockImplementation((_auth, next) => {
      (next as (user: unknown) => void)({ uid: 'uid-1', email: null });
      return vi.fn();
    });
    const gateway = FirebaseAuthGateway.create(auth);
    const received: Array<unknown> = [];

    expect(() => gateway.observeAuthState((account) => received.push(account))).not.toThrow();
    expect(received).toEqual([null]);
  });

  it('observeAuthState : un User Firebase avec uid vide → listener reçoit null sans throw', () => {
    mockedOnAuthStateChanged.mockImplementation((_auth, next) => {
      (next as (user: unknown) => void)({ uid: '', email: 'aurelie@foyer.test' });
      return vi.fn();
    });
    const gateway = FirebaseAuthGateway.create(auth);
    const received: Array<unknown> = [];

    expect(() => gateway.observeAuthState((account) => received.push(account))).not.toThrow();
    expect(received).toEqual([null]);
  });

  it("observeAuthState retourne l'unsubscribe fourni par Firebase", () => {
    const unsub = vi.fn();
    mockedOnAuthStateChanged.mockReturnValue(unsub);
    const gateway = FirebaseAuthGateway.create(auth);

    const unsubscribe = gateway.observeAuthState(() => {});

    expect(unsubscribe).toBe(unsub);
  });
});
