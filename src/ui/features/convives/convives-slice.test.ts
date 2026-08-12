import { describe, it, expect } from 'vitest';

import { type Convive } from '../../../domain/entities/convive';
import { type AddConvive } from '../../../domain/use-cases/add-convive';
import { type ListConvives } from '../../../domain/use-cases/list-convives';
import { ConviveBuilder } from '../../../domain/test-builders/convive.builder';
import { createTestStore } from '../../store/create-test-store';
import { addConvive, loadConvives, selectConvives } from './convives-slice';

function twoConvives(): Convive[] {
  return [
    ConviveBuilder.aConvive().withId('c1').withName('Aurélie').build(),
    ConviveBuilder.aConvive().withId('c2').withName('Lionel').build(),
  ];
}

describe('convives slice', () => {
  it('un store neuf est idle, sans convives ni erreur', () => {
    const store = createTestStore();

    expect(selectConvives(store.getState())).toEqual({
      status: 'idle',
      convives: [],
      error: null,
      addStatus: 'idle',
      addError: null,
    });
  });

  it('loadConvives réussi passe en success avec les convives renvoyés par le use case injecté', async () => {
    const convives = twoConvives();
    const listConvives: ListConvives = async () => convives;
    const store = createTestStore({ listConvives });

    await store.dispatch(loadConvives());

    expect(selectConvives(store.getState())).toEqual({
      status: 'success',
      convives,
      error: null,
      addStatus: 'idle',
      addError: null,
    });
  });

  it('loadConvives en échec passe en error avec le message du use case et conserve les convives déjà chargés', async () => {
    const convives = twoConvives();
    let shouldFail = false;
    const listConvives: ListConvives = async () => {
      if (shouldFail) throw new Error('Firestore indisponible');
      return convives;
    };
    const store = createTestStore({ listConvives });

    await store.dispatch(loadConvives());
    shouldFail = true;
    await store.dispatch(loadConvives());

    expect(selectConvives(store.getState())).toEqual({
      status: 'error',
      convives,
      error: 'Firestore indisponible',
      addStatus: 'idle',
      addError: null,
    });
  });

  it('pendant un loadConvives en vol, le status passe à loading', () => {
    const pending: ListConvives = () => new Promise<Convive[]>(() => {});
    const store = createTestStore({ listConvives: pending });

    void store.dispatch(loadConvives());

    expect(selectConvives(store.getState())).toEqual({
      status: 'loading',
      convives: [],
      error: null,
      addStatus: 'idle',
      addError: null,
    });
  });

  it('addConvive appelle le use case avec le prénom saisi et ajoute le convive créé à la liste', async () => {
    const existing = twoConvives();
    const captured: { input: { name: string } | undefined } = { input: undefined };
    const addConviveUseCase: AddConvive = async (input) => {
      captured.input = input;
      return ConviveBuilder.aConvive().withId('c3').withName(input.name).build();
    };
    const store = createTestStore({
      listConvives: async () => existing,
      addConvive: addConviveUseCase,
    });
    await store.dispatch(loadConvives());

    await store.dispatch(addConvive({ name: 'Rory' }));

    expect(captured.input).toEqual({ name: 'Rory' });
    expect(selectConvives(store.getState())).toEqual({
      status: 'success',
      convives: [...existing, ConviveBuilder.aConvive().withId('c3').withName('Rory').build()],
      error: null,
      addStatus: 'idle',
      addError: null,
    });
  });

  it('range le convive ajouté à sa place alphabétique, avec la même collation que la liste chargée', async () => {
    const loaded = [
      ConviveBuilder.aConvive().withId('c1').withName('Emma').build(),
      ConviveBuilder.aConvive().withId('c2').withName('Zoé').build(),
    ];
    const addElise: AddConvive = async (input) =>
      ConviveBuilder.aConvive().withId('c3').withName(input.name).build();
    const store = createTestStore({ listConvives: async () => loaded, addConvive: addElise });
    await store.dispatch(loadConvives());

    await store.dispatch(addConvive({ name: 'Élise' }));

    // Jeu DISCRIMINANT : un `push` en fin de liste donnerait ['Emma', 'Zoé', 'Élise'],
    // et un insert trié par code-point aussi (É=201 > Z=90). Seule la collation
    // française — la même règle que celle appliquée par le use-case au chargement —
    // place Élise en tête.
    expect(selectConvives(store.getState()).convives.map((c) => c.name)).toEqual([
      'Élise',
      'Emma',
      'Zoé',
    ]);
  });

  it('un ajout en échec est enregistré dans le cycle de vie de l’ajout, sans altérer la liste ni son status', async () => {
    const existing = twoConvives();
    const failingAdd: AddConvive = () => Promise.reject(new Error('Firestore indisponible'));
    const store = createTestStore({
      listConvives: async () => existing,
      addConvive: failingAdd,
    });
    await store.dispatch(loadConvives());

    await store.dispatch(addConvive({ name: 'Rory' }));

    expect(selectConvives(store.getState())).toEqual({
      status: 'success',
      convives: existing,
      error: null,
      addStatus: 'error',
      addError: 'Firestore indisponible',
    });
  });

  it('pendant un ajout en vol, addStatus passe à adding et le status de la liste reste success', async () => {
    const existing = twoConvives();
    const pendingAdd: AddConvive = () => new Promise<Convive>(() => {});
    const store = createTestStore({
      listConvives: async () => existing,
      addConvive: pendingAdd,
    });
    await store.dispatch(loadConvives());

    void store.dispatch(addConvive({ name: 'Rory' }));

    expect(selectConvives(store.getState())).toEqual({
      status: 'success',
      convives: existing,
      error: null,
      addStatus: 'adding',
      addError: null,
    });
  });

  it('un ajout réussi ramène le cycle de vie au repos et efface l’erreur de l’échec précédent', async () => {
    const existing = twoConvives();
    let shouldFail = true;
    const flakyAdd: AddConvive = async (input) => {
      if (shouldFail) throw new Error('Firestore indisponible');
      return ConviveBuilder.aConvive().withId('c3').withName(input.name).build();
    };
    const store = createTestStore({
      listConvives: async () => existing,
      addConvive: flakyAdd,
    });
    await store.dispatch(loadConvives());
    await store.dispatch(addConvive({ name: 'Rory' }));
    shouldFail = false;

    await store.dispatch(addConvive({ name: 'Rory' }));

    expect(selectConvives(store.getState())).toEqual({
      status: 'success',
      convives: [...existing, ConviveBuilder.aConvive().withId('c3').withName('Rory').build()],
      error: null,
      addStatus: 'idle',
      addError: null,
    });
  });
});
