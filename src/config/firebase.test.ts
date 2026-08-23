import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

import { persistenceIsAvailable } from './persistence-probe';

const app = { marker: 'app-sentinel' };
const db = { marker: 'db-sentinel' };
const memoryDb = { marker: 'memory-db-sentinel' };
const cache = { marker: 'cache-sentinel' };
const tabManager = { marker: 'tab-manager-sentinel' };

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => app) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ marker: 'auth-sentinel' })) }));
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => memoryDb),
  initializeFirestore: vi.fn(() => db),
  persistentLocalCache: vi.fn(() => cache),
  persistentMultipleTabManager: vi.fn(() => tabManager),
}));
vi.mock('./persistence-probe', () => ({ persistenceIsAvailable: vi.fn() }));

const mockedInitializeApp = vi.mocked(initializeApp);
const mockedGetFirestore = vi.mocked(getFirestore);
const mockedInitializeFirestore = vi.mocked(initializeFirestore);
const mockedPersistentLocalCache = vi.mocked(persistentLocalCache);
const mockedPersistentMultipleTabManager = vi.mocked(persistentMultipleTabManager);
const mockedPersistenceIsAvailable = vi.mocked(persistenceIsAvailable);

describe('firebase config', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'api-key');
    vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'auth-domain');
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'project-id');
    vi.stubEnv('VITE_FIREBASE_APP_ID', 'app-id');
    vi.resetModules();
    mockedInitializeApp.mockClear();
    mockedGetFirestore.mockClear();
    mockedInitializeFirestore.mockClear();
    mockedPersistentLocalCache.mockClear();
    mockedPersistentMultipleTabManager.mockClear();
    mockedPersistenceIsAvailable.mockReset();
    mockedPersistenceIsAvailable.mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('adosse Firestore à un cache persistant, pour que la donnée survive au rechargement', async () => {
    const { db: exposed } = await import('./firebase');

    expect(mockedPersistentLocalCache).toHaveBeenCalledWith({ tabManager });
    expect(mockedInitializeFirestore).toHaveBeenCalledWith(app, { localCache: cache });
    expect(exposed).toBe(db);
  });

  it('partage ce cache entre les onglets, plutôt que de le réserver au premier ouvert', async () => {
    await import('./firebase');

    expect(mockedPersistentMultipleTabManager).toHaveBeenCalledWith();
  });

  it('se rabat sur une instance mémoire quand la sonde refuse la persistance', async () => {
    mockedPersistenceIsAvailable.mockReturnValue(false);

    const { db: exposed } = await import('./firebase');

    expect(mockedGetFirestore).toHaveBeenCalledWith(app);
    expect(exposed).toBe(memoryDb);
  });

  it('n’ouvre aucun cache persistant quand la sonde refuse la persistance', async () => {
    mockedPersistenceIsAvailable.mockReturnValue(false);

    await import('./firebase');

    expect(mockedPersistentLocalCache).not.toHaveBeenCalled();
    expect(mockedInitializeFirestore).not.toHaveBeenCalled();
  });

  it('ne double pas le cache persistant d’une instance mémoire quand la sonde accepte la persistance', async () => {
    await import('./firebase');

    expect(mockedGetFirestore).not.toHaveBeenCalled();
  });
});
