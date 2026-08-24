import { describe, it, expect, afterEach, vi } from 'vitest';

import { persistenceIsAvailable } from './persistence-probe';

const probeDatabase = 'meal-planner-persistence-probe';

type ProbeRequest = { result: { close: ReturnType<typeof vi.fn> }; onsuccess: (() => void) | null };

function anOpenRequest(): ProbeRequest {
  return { result: { close: vi.fn() }, onsuccess: null };
}

function indexedDBAccepting(request: ProbeRequest) {
  const opened: string[] = [];
  return {
    opened,
    deleteDatabase: vi.fn(),
    open: vi.fn((name: string) => {
      opened.push(name);
      return request;
    }),
  };
}

function indexedDBThrowingOnOpen() {
  return {
    deleteDatabase: vi.fn(),
    open: vi.fn(() => {
      throw new DOMException('Access to the Indexed Database API is denied', 'SecurityError');
    }),
  };
}

describe('sonde de persistance', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('déclare la persistance disponible quand IndexedDB accepte une ouverture', () => {
    vi.stubGlobal('indexedDB', indexedDBAccepting(anOpenRequest()));

    expect(persistenceIsAvailable()).toBe(true);
  });

  it("déclare la persistance indisponible quand l'ouverture d'IndexedDB jette, sans propager l'erreur", () => {
    vi.stubGlobal('indexedDB', indexedDBThrowingOnOpen());

    expect(persistenceIsAvailable()).toBe(false);
  });

  it('referme la connexion et supprime exactement la base qu’elle a ouverte, pour ne rien laisser derrière elle', () => {
    const request = anOpenRequest();
    const indexedDBDouble = indexedDBAccepting(request);
    vi.stubGlobal('indexedDB', indexedDBDouble);

    persistenceIsAvailable();
    request.onsuccess?.();

    expect(indexedDBDouble.opened).toEqual([probeDatabase]);
    expect(request.result.close).toHaveBeenCalledWith();
    expect(indexedDBDouble.deleteDatabase).toHaveBeenCalledWith(probeDatabase);
  });
});
