import { describe, it, expect } from 'vitest';

import { type Convive } from '../../../domain/entities/convive';
import { type AddConvive, type AddConviveInput } from '../../../domain/use-cases/add-convive';
import { type NewConviveId } from '../../../domain/use-cases/new-convive-id';
import { type ListConvives } from '../../../domain/use-cases/list-convives';
import { ConviveBuilder } from '../../../domain/test-builders/convive.builder';
import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { createTestStore } from '../../store/create-test-store';
import { deferred } from '../../test-utils/deferred';
import {
  type RemoveConvive,
  type RemoveConviveInput,
} from '../../../domain/use-cases/remove-convive';
import {
  type RenameConvive,
  type RenameConviveInput,
} from '../../../domain/use-cases/rename-convive';
import {
  addConvive,
  conviveEditCancelled,
  conviveFormScreenOpened,
  conviveEditRequested,
  conviveRemovalCancelled,
  conviveRemovalRequested,
  loadConvives,
  removeConvive,
  renameConvive,
  renameDraftEdited,
  conviveRowsOf,
  selectConvives,
} from './convives-slice';

function twoConvives(): Convive[] {
  return [
    ConviveBuilder.aConvive().withId('c1').withName('Aurélie').build(),
    ConviveBuilder.aConvive().withId('c2').withName('Lionel').build(),
  ];
}

function sequentialDraftIds(): NewConviveId {
  let count = 0;
  return () => `draft-${(count += 1)}`;
}

function recordingAdd(outcome: (input: AddConviveInput) => Promise<Convive>): {
  fn: AddConvive;
  ids: string[];
} {
  const ids: string[] = [];
  return {
    ids,
    fn: (input) => {
      ids.push(input.id);
      return outcome(input);
    },
  };
}

describe('convives slice', () => {
  it('un store neuf est idle, sans convives ni erreur', () => {
    const store = createTestStore();

    expect(selectConvives(store.getState())).toEqual({
      status: 'idle',
      convives: [],
      error: null,
      latestLoadRequestId: null,
      addStatus: 'idle',
      addError: null,
      addSubjectName: null,
      draftConviveId: 'generated-id-1',
      latestAddRequestId: null,
      renameStatus: 'idle',
      renameDraft: '',
      editingConviveId: null,
      latestRenameRequestId: null,
      removeStatus: 'idle',
      pendingRemovalId: null,
      latestRemoveRequestId: null,
    });
  });

  it('loadConvives réussi passe en success avec les convives renvoyés par le use case injecté', async () => {
    const convives = twoConvives();
    const listConvives: ListConvives = async () => convives;
    const store = createTestStore({ listConvives });

    const loaded = await store.dispatch(loadConvives());

    expect(selectConvives(store.getState())).toEqual({
      status: 'success',
      convives,
      error: null,
      latestLoadRequestId: loaded.meta.requestId,
      addStatus: 'idle',
      addError: null,
      addSubjectName: null,
      draftConviveId: 'generated-id-1',
      latestAddRequestId: null,
      renameStatus: 'idle',
      renameDraft: '',
      editingConviveId: null,
      latestRenameRequestId: null,
      removeStatus: 'idle',
      pendingRemovalId: null,
      latestRemoveRequestId: null,
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
    const failed = await store.dispatch(loadConvives());

    expect(selectConvives(store.getState())).toEqual({
      status: 'error',
      convives,
      error: 'Firestore indisponible',
      latestLoadRequestId: failed.meta.requestId,
      addStatus: 'idle',
      addError: null,
      addSubjectName: null,
      draftConviveId: 'generated-id-1',
      latestAddRequestId: null,
      renameStatus: 'idle',
      renameDraft: '',
      editingConviveId: null,
      latestRenameRequestId: null,
      removeStatus: 'idle',
      pendingRemovalId: null,
      latestRemoveRequestId: null,
    });
  });

  it('pendant un loadConvives en vol, le status passe à loading', () => {
    const pending: ListConvives = () => new Promise<Convive[]>(() => {});
    const store = createTestStore({ listConvives: pending });

    const inFlight = store.dispatch(loadConvives());

    expect(selectConvives(store.getState())).toEqual({
      status: 'loading',
      convives: [],
      error: null,
      latestLoadRequestId: inFlight.requestId,
      addStatus: 'idle',
      addError: null,
      addSubjectName: null,
      draftConviveId: 'generated-id-1',
      latestAddRequestId: null,
      renameStatus: 'idle',
      renameDraft: '',
      editingConviveId: null,
      latestRenameRequestId: null,
      removeStatus: 'idle',
      pendingRemovalId: null,
      latestRemoveRequestId: null,
    });
  });

  it('addConvive appelle le use case avec le prénom saisi et ajoute le convive créé à la liste', async () => {
    const existing = twoConvives();
    const captured: { input: AddConviveInput | undefined } = { input: undefined };
    const addConviveUseCase: AddConvive = async (input) => {
      captured.input = input;
      return ConviveBuilder.aConvive().withId('c3').withName(input.name).build();
    };
    const store = createTestStore({
      listConvives: async () => existing,
      addConvive: addConviveUseCase,
    });
    const loaded = await store.dispatch(loadConvives());

    const added = await store.dispatch(addConvive({ name: 'Rory' }));

    expect(captured.input).toEqual({ id: 'generated-id-1', name: 'Rory' });
    expect(selectConvives(store.getState())).toEqual({
      status: 'success',
      convives: [...existing, ConviveBuilder.aConvive().withId('c3').withName('Rory').build()],
      error: null,
      latestLoadRequestId: loaded.meta.requestId,
      addStatus: 'idle',
      addError: null,
      addSubjectName: null,
      draftConviveId: 'generated-id-1',
      latestAddRequestId: added.meta.requestId,
      renameStatus: 'idle',
      renameDraft: '',
      editingConviveId: null,
      latestRenameRequestId: null,
      removeStatus: 'idle',
      pendingRemovalId: null,
      latestRemoveRequestId: null,
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
    const loaded = await store.dispatch(loadConvives());

    const failed = await store.dispatch(addConvive({ name: 'Rory' }));

    expect(selectConvives(store.getState())).toEqual({
      status: 'success',
      convives: existing,
      error: null,
      latestLoadRequestId: loaded.meta.requestId,
      addStatus: 'error',
      addError: 'Firestore indisponible',
      addSubjectName: 'Rory',
      draftConviveId: 'generated-id-1',
      latestAddRequestId: failed.meta.requestId,
      renameStatus: 'idle',
      renameDraft: '',
      editingConviveId: null,
      latestRenameRequestId: null,
      removeStatus: 'idle',
      pendingRemovalId: null,
      latestRemoveRequestId: null,
    });
  });

  it('pendant un ajout en vol, addStatus passe à adding et le status de la liste reste success', async () => {
    const existing = twoConvives();
    const pendingAdd: AddConvive = () => new Promise<Convive>(() => {});
    const store = createTestStore({
      listConvives: async () => existing,
      addConvive: pendingAdd,
    });
    const loaded = await store.dispatch(loadConvives());

    const inFlight = store.dispatch(addConvive({ name: 'Rory' }));

    expect(selectConvives(store.getState())).toEqual({
      status: 'success',
      convives: existing,
      error: null,
      latestLoadRequestId: loaded.meta.requestId,
      addStatus: 'adding',
      addError: null,
      addSubjectName: 'Rory',
      draftConviveId: 'generated-id-1',
      latestAddRequestId: inFlight.requestId,
      renameStatus: 'idle',
      renameDraft: '',
      editingConviveId: null,
      latestRenameRequestId: null,
      removeStatus: 'idle',
      pendingRemovalId: null,
      latestRemoveRequestId: null,
    });
  });

  it('un chargement empêché par un dépôt injoignable prend un status distinct de error', async () => {
    const unavailable: ListConvives = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({ listConvives: unavailable });

    const refused = await store.dispatch(loadConvives());

    expect(selectConvives(store.getState())).toEqual({
      status: 'unavailable',
      convives: [],
      error: null,
      latestLoadRequestId: refused.meta.requestId,
      addStatus: 'idle',
      addError: null,
      addSubjectName: null,
      draftConviveId: 'generated-id-1',
      latestAddRequestId: null,
      renameStatus: 'idle',
      renameDraft: '',
      editingConviveId: null,
      latestRenameRequestId: null,
      removeStatus: 'idle',
      pendingRemovalId: null,
      latestRemoveRequestId: null,
    });
  });

  it('un ajout que le serveur n’a pas acquitté prend un addStatus distinct de error, sans rejoindre la liste', async () => {
    const existing = twoConvives();
    const unacknowledged: AddConvive = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({
      listConvives: async () => existing,
      addConvive: unacknowledged,
    });
    const loaded = await store.dispatch(loadConvives());

    const unacked = await store.dispatch(addConvive({ name: 'Rory' }));

    expect(selectConvives(store.getState())).toEqual({
      status: 'success',
      convives: existing,
      error: null,
      latestLoadRequestId: loaded.meta.requestId,
      addStatus: 'unconfirmed',
      addError: null,
      addSubjectName: 'Rory',
      draftConviveId: 'generated-id-1',
      latestAddRequestId: unacked.meta.requestId,
      renameStatus: 'idle',
      renameDraft: '',
      editingConviveId: null,
      latestRenameRequestId: null,
      removeStatus: 'idle',
      pendingRemovalId: null,
      latestRemoveRequestId: null,
    });
  });

  it('un nouveau chargement remet le cycle de vie de l’ajout au repos', async () => {
    const unacknowledged: AddConvive = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      addConvive: unacknowledged,
    });
    await store.dispatch(loadConvives());
    await store.dispatch(addConvive({ name: 'Rory' }));
    expect(selectConvives(store.getState()).addStatus).toBe('unconfirmed');

    await store.dispatch(loadConvives());

    expect(selectConvives(store.getState()).addStatus).toBe('idle');
    expect(selectConvives(store.getState()).addError).toBeNull();
  });

  it('un chargement qui démarre pendant un ajout en vol ne réarme pas le formulaire', async () => {
    const pendingAdd: AddConvive = () => new Promise<Convive>(() => {});
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      addConvive: pendingAdd,
    });
    void store.dispatch(addConvive({ name: 'Rory' }));
    expect(selectConvives(store.getState()).addStatus).toBe('adding');

    void store.dispatch(loadConvives());

    expect(selectConvives(store.getState()).addStatus).toBe('adding');
  });

  it('un ajout non acquitté retient le prénom soumis pour pouvoir le nommer', async () => {
    const unacknowledged: AddConvive = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({ addConvive: unacknowledged });

    await store.dispatch(addConvive({ name: 'Rory' }));

    expect(selectConvives(store.getState()).addSubjectName).toBe('Rory');
  });

  it('un nouveau chargement oublie le prénom soumis, sauf si l’ajout est encore en vol', async () => {
    const unacknowledged: AddConvive = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      addConvive: unacknowledged,
    });
    await store.dispatch(addConvive({ name: 'Rory' }));

    await store.dispatch(loadConvives());

    expect(selectConvives(store.getState()).addSubjectName).toBeNull();
  });

  it('un chargement qui démarre pendant un ajout en vol conserve le prénom soumis', () => {
    const pendingAdd: AddConvive = () => new Promise<Convive>(() => {});
    const store = createTestStore({ addConvive: pendingAdd });
    void store.dispatch(addConvive({ name: 'Rory' }));

    void store.dispatch(loadConvives());

    expect(selectConvives(store.getState()).addSubjectName).toBe('Rory');
  });

  it('un nouveau chargement efface aussi un échec d’ajout, pas seulement un constat non confirmé', async () => {
    const failingAdd: AddConvive = () => Promise.reject(new Error('Firestore indisponible'));
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      addConvive: failingAdd,
    });
    await store.dispatch(loadConvives());
    await store.dispatch(addConvive({ name: 'Rory' }));
    expect(selectConvives(store.getState()).addStatus).toBe('error');
    expect(selectConvives(store.getState()).addError).toBe('Firestore indisponible');

    await store.dispatch(loadConvives());

    expect(selectConvives(store.getState()).addStatus).toBe('idle');
    expect(selectConvives(store.getState()).addError).toBeNull();
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
    const loaded = await store.dispatch(loadConvives());
    await store.dispatch(addConvive({ name: 'Rory' }));
    shouldFail = false;

    const retried = await store.dispatch(addConvive({ name: 'Rory' }));

    expect(selectConvives(store.getState())).toEqual({
      status: 'success',
      convives: [...existing, ConviveBuilder.aConvive().withId('c3').withName('Rory').build()],
      error: null,
      latestLoadRequestId: loaded.meta.requestId,
      addStatus: 'idle',
      addError: null,
      addSubjectName: null,
      draftConviveId: 'generated-id-1',
      latestAddRequestId: retried.meta.requestId,
      renameStatus: 'idle',
      renameDraft: '',
      editingConviveId: null,
      latestRenameRequestId: null,
      removeStatus: 'idle',
      pendingRemovalId: null,
      latestRemoveRequestId: null,
    });
  });

  it('un rejet tardif d’un chargement dépassé n’écrase pas le foyer fraîchement chargé', async () => {
    const fresh = twoConvives();
    const slow = deferred<Convive[]>();
    let call = 0;
    const listConvives: ListConvives = () => {
      call += 1;
      return call === 1 ? slow.promise : Promise.resolve(fresh);
    };
    const store = createTestStore({ listConvives });

    const abandoned = store.dispatch(loadConvives());
    const current = store.dispatch(loadConvives());
    await current;
    slow.reject(RepositoryUnavailableError.create());
    await abandoned;

    expect(selectConvives(store.getState())).toEqual({
      status: 'success',
      convives: fresh,
      error: null,
      latestLoadRequestId: current.requestId,
      addStatus: 'idle',
      addError: null,
      addSubjectName: null,
      draftConviveId: 'generated-id-1',
      latestAddRequestId: null,
      renameStatus: 'idle',
      renameDraft: '',
      editingConviveId: null,
      latestRenameRequestId: null,
      removeStatus: 'idle',
      pendingRemovalId: null,
      latestRemoveRequestId: null,
    });
  });

  it('un rejet tardif d’un ajout dépassé ne verrouille pas le formulaire après un ajout réussi', async () => {
    const existing = twoConvives();
    const slow = deferred<Convive>();
    let call = 0;
    const addConviveUseCase: AddConvive = (input) => {
      call += 1;
      return call === 1
        ? slow.promise
        : Promise.resolve(ConviveBuilder.aConvive().withId('c3').withName(input.name).build());
    };
    const store = createTestStore({
      listConvives: async () => existing,
      addConvive: addConviveUseCase,
    });
    await store.dispatch(loadConvives());

    const abandoned = store.dispatch(addConvive({ name: 'Rory' }));
    const current = store.dispatch(addConvive({ name: 'Rory' }));
    await current;
    slow.reject(RepositoryUnavailableError.create());
    await abandoned;

    expect(selectConvives(store.getState()).addStatus).toBe('idle');
    expect(selectConvives(store.getState()).addError).toBeNull();
    expect(selectConvives(store.getState()).addSubjectName).toBeNull();
    expect(selectConvives(store.getState()).latestAddRequestId).toBe(current.requestId);
  });

  it('un succès tardif d’un ajout dépassé n’efface pas le constat de l’ajout courant', async () => {
    const existing = twoConvives();
    const slow = deferred<Convive>();
    let call = 0;
    const addConviveUseCase: AddConvive = () => {
      call += 1;
      return call === 1 ? slow.promise : Promise.reject(RepositoryUnavailableError.create());
    };
    const store = createTestStore({
      listConvives: async () => existing,
      addConvive: addConviveUseCase,
    });
    await store.dispatch(loadConvives());

    const abandoned = store.dispatch(addConvive({ name: 'Sacha' }));
    const current = store.dispatch(addConvive({ name: 'Rory' }));
    await current;
    slow.resolve(ConviveBuilder.aConvive().withId('c3').withName('Sacha').build());
    await abandoned;

    expect(selectConvives(store.getState()).addStatus).toBe('unconfirmed');
    expect(selectConvives(store.getState()).addSubjectName).toBe('Rory');
    expect(selectConvives(store.getState()).convives.map((c) => c.name)).toEqual([
      'Aurélie',
      'Lionel',
    ]);
  });

  it('un rechargement du foyer n’invalide pas l’ajout en vol : son résultat rejoint bien la liste', async () => {
    const existing = twoConvives();
    const slowAdd = deferred<Convive>();
    const store = createTestStore({
      listConvives: async () => existing,
      addConvive: () => slowAdd.promise,
    });

    const add = store.dispatch(addConvive({ name: 'Rory' }));
    await store.dispatch(loadConvives());
    slowAdd.resolve(ConviveBuilder.aConvive().withId('c3').withName('Rory').build());
    await add;

    expect(selectConvives(store.getState()).convives.map((c) => c.name)).toEqual([
      'Aurélie',
      'Lionel',
      'Rory',
    ]);
    expect(selectConvives(store.getState()).addStatus).toBe('idle');
  });

  it('un ajout n’invalide pas le chargement en vol : la liste chargée s’affiche bien', async () => {
    const existing = twoConvives();
    const rory = ConviveBuilder.aConvive().withId('c3').withName('Rory').build();
    const slowLoad = deferred<Convive[]>();
    const store = createTestStore({
      listConvives: () => slowLoad.promise,
      addConvive: async () => rory,
    });

    const load = store.dispatch(loadConvives());
    await store.dispatch(addConvive({ name: 'Rory' }));
    slowLoad.resolve([...existing, rory]);
    await load;

    expect(selectConvives(store.getState()).status).toBe('success');
    expect(selectConvives(store.getState()).convives.map((c) => c.name)).toEqual([
      'Aurélie',
      'Lionel',
      'Rory',
    ]);
  });

  it('un nouvel envoi chasse le constat de l’ajout précédent', async () => {
    const unacknowledged: AddConvive = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({ addConvive: unacknowledged });
    await store.dispatch(addConvive({ name: 'Rory' }));
    expect(selectConvives(store.getState()).addStatus).toBe('unconfirmed');

    const renvoi = store.dispatch(addConvive({ name: 'Rory' }));

    expect(selectConvives(store.getState()).addStatus).toBe('adding');
    await renvoi;
  });

  it('un nouvel envoi chasse le constat du retrait précédent', async () => {
    const unacknowledged: RemoveConvive = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      removeConvive: unacknowledged,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveRemovalRequested('c2'));
    await store.dispatch(removeConvive({ id: 'c2' }));
    expect(selectConvives(store.getState()).removeStatus).toBe('unconfirmed');

    const renvoi = store.dispatch(removeConvive({ id: 'c2' }));

    expect(selectConvives(store.getState()).removeStatus).toBe('removing');
    await renvoi;
  });

  it('écrit l’ajout sous l’identifiant du brouillon courant', async () => {
    const add = recordingAdd(async (input) =>
      ConviveBuilder.aConvive().withId(input.id).withName(input.name).build(),
    );
    const store = createTestStore({ newConviveId: sequentialDraftIds(), addConvive: add.fn });

    await store.dispatch(addConvive({ name: 'Rory' }));

    expect(add.ids).toEqual(['draft-1']);
    expect(selectConvives(store.getState()).convives.map((c) => c.id)).toEqual(['draft-1']);
  });

  it('réenvoie un ajout non acquitté sous le MÊME identifiant, sans fabriquer de doublon', async () => {
    const add = recordingAdd(() => Promise.reject(RepositoryUnavailableError.create()));
    const store = createTestStore({ newConviveId: sequentialDraftIds(), addConvive: add.fn });

    await store.dispatch(addConvive({ name: 'Rory' }));
    await store.dispatch(addConvive({ name: 'Rory' }));

    expect(add.ids).toEqual(['draft-1', 'draft-1']);
  });

  it('pose un identifiant neuf après un ajout abouti : deux saisies successives ne s’écrasent pas', async () => {
    const add = recordingAdd(async (input) =>
      ConviveBuilder.aConvive().withId(input.id).withName(input.name).build(),
    );
    const store = createTestStore({ newConviveId: sequentialDraftIds(), addConvive: add.fn });

    await store.dispatch(addConvive({ name: 'Rory' }));
    await store.dispatch(addConvive({ name: 'Zoé' }));

    expect(add.ids).toEqual(['draft-1', 'draft-2']);
    expect(selectConvives(store.getState()).convives.map((c) => [c.id, c.name])).toEqual([
      ['draft-1', 'Rory'],
      ['draft-2', 'Zoé'],
    ]);
  });

  it('rouvrir l’écran pose un identifiant neuf pour la saisie suivante', () => {
    const store = createTestStore({ newConviveId: sequentialDraftIds() });
    expect(selectConvives(store.getState()).draftConviveId).toBe('draft-1');

    store.dispatch(conviveFormScreenOpened());

    expect(selectConvives(store.getState()).draftConviveId).toBe('draft-2');
  });

  it('rouvrir l’écran pendant un ajout en vol garde l’identifiant de l’écriture partie', () => {
    const pendingAdd: AddConvive = () => new Promise<Convive>(() => {});
    const store = createTestStore({ newConviveId: sequentialDraftIds(), addConvive: pendingAdd });
    void store.dispatch(addConvive({ name: 'Rory' }));
    expect(selectConvives(store.getState()).addStatus).toBe('adding');

    store.dispatch(conviveFormScreenOpened());

    expect(selectConvives(store.getState()).draftConviveId).toBe('draft-1');
  });

  it('un succès tardif d’un ajout dépassé ne renouvelle pas l’identifiant du brouillon', async () => {
    const slow = deferred<Convive>();
    let call = 0;
    const add: AddConvive = (input) => {
      call += 1;
      return call === 1
        ? slow.promise
        : Promise.resolve(ConviveBuilder.aConvive().withId(input.id).withName(input.name).build());
    };
    const store = createTestStore({ newConviveId: sequentialDraftIds(), addConvive: add });

    const abandoned = store.dispatch(addConvive({ name: 'Rory' }));
    await store.dispatch(addConvive({ name: 'Zoé' }));
    expect(selectConvives(store.getState()).draftConviveId).toBe('draft-2');
    slow.resolve(ConviveBuilder.aConvive().withId('draft-1').withName('Rory').build());
    await abandoned;

    expect(selectConvives(store.getState()).draftConviveId).toBe('draft-2');
  });

  it('renameConvive appelle le use case avec l’id et le nouveau prénom, et remplace le convive', async () => {
    const captured: { input: RenameConviveInput | undefined } = { input: undefined };
    const renameConviveUseCase: RenameConvive = async (input) => {
      captured.input = input;
      return ConviveBuilder.aConvive().withId(input.id).withName(input.name).build();
    };
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      renameConvive: renameConviveUseCase,
    });
    await store.dispatch(loadConvives());

    await store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));

    expect(captured.input).toEqual({ id: 'c2', name: 'Lio' });
    expect(selectConvives(store.getState()).convives).toEqual([
      ConviveBuilder.aConvive().withId('c1').withName('Aurélie').build(),
      ConviveBuilder.aConvive().withId('c2').withName('Lio').build(),
    ]);
  });

  it('range le convive renommé à sa nouvelle place alphabétique', async () => {
    const renameConviveUseCase: RenameConvive = async (input) =>
      ConviveBuilder.aConvive().withId(input.id).withName(input.name).build();
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      renameConvive: renameConviveUseCase,
    });
    await store.dispatch(loadConvives());

    await store.dispatch(renameConvive({ id: 'c2', name: 'Alix' }));

    expect(selectConvives(store.getState()).convives.map((c) => c.name)).toEqual([
      'Alix',
      'Aurélie',
    ]);
  });

  it('un renommage réussi referme l’édition et remet le cycle au repos', async () => {
    const renameConviveUseCase: RenameConvive = async (input) =>
      ConviveBuilder.aConvive().withId(input.id).withName(input.name).build();
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      renameConvive: renameConviveUseCase,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveEditRequested('c2'));

    const renamed = await store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));

    expect(selectConvives(store.getState()).renameStatus).toBe('idle');
    expect(selectConvives(store.getState()).editingConviveId).toBeNull();
    expect(selectConvives(store.getState()).latestRenameRequestId).toBe(renamed.meta.requestId);
  });

  it('pendant un renommage en vol, renameStatus passe à renaming et la liste ne bouge pas', async () => {
    const pendingRename: RenameConvive = () => new Promise<Convive>(() => {});
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      renameConvive: pendingRename,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveEditRequested('c2'));

    const inFlight = store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));

    expect(selectConvives(store.getState()).renameStatus).toBe('renaming');
    expect(selectConvives(store.getState()).latestRenameRequestId).toBe(inFlight.requestId);
    expect(selectConvives(store.getState()).convives.map((c) => c.name)).toEqual([
      'Aurélie',
      'Lionel',
    ]);
    expect(selectConvives(store.getState()).editingConviveId).toBe('c2');
  });

  it('un renommage refusé passe en error, sans altérer la liste ni refermer l’édition', async () => {
    const failingRename: RenameConvive = () => Promise.reject(new Error('Firestore indisponible'));
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      renameConvive: failingRename,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveEditRequested('c2'));

    await store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));

    expect(selectConvives(store.getState()).renameStatus).toBe('error');
    expect(selectConvives(store.getState()).editingConviveId).toBe('c2');
    expect(selectConvives(store.getState()).convives.map((c) => c.name)).toEqual([
      'Aurélie',
      'Lionel',
    ]);
  });

  it('un renommage que le serveur n’a pas acquitté prend un status distinct de error', async () => {
    const unacknowledged: RenameConvive = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      renameConvive: unacknowledged,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveEditRequested('c2'));

    await store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));

    expect(selectConvives(store.getState()).renameStatus).toBe('unconfirmed');
    expect(selectConvives(store.getState()).convives.map((c) => c.name)).toEqual([
      'Aurélie',
      'Lionel',
    ]);
  });

  it('un rejet tardif d’un renommage dépassé ne verrouille pas la ligne après un renommage réussi', async () => {
    const slow = deferred<Convive>();
    let call = 0;
    const renameConviveUseCase: RenameConvive = (input) => {
      call += 1;
      return call === 1
        ? slow.promise
        : Promise.resolve(ConviveBuilder.aConvive().withId(input.id).withName(input.name).build());
    };
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      renameConvive: renameConviveUseCase,
    });
    await store.dispatch(loadConvives());

    const abandoned = store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));
    const current = store.dispatch(renameConvive({ id: 'c2', name: 'Lionelle' }));
    await current;
    slow.reject(RepositoryUnavailableError.create());
    await abandoned;

    expect(selectConvives(store.getState()).renameStatus).toBe('idle');
    expect(selectConvives(store.getState()).latestRenameRequestId).toBe(current.requestId);
  });

  it('un succès tardif d’un renommage dépassé n’écrase pas le renommage plus frais', async () => {
    const slow = deferred<Convive>();
    let call = 0;
    const renameConviveUseCase: RenameConvive = (input) => {
      call += 1;
      return call === 1
        ? slow.promise
        : Promise.resolve(ConviveBuilder.aConvive().withId(input.id).withName(input.name).build());
    };
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      renameConvive: renameConviveUseCase,
    });
    await store.dispatch(loadConvives());

    const abandoned = store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));
    const current = store.dispatch(renameConvive({ id: 'c2', name: 'Lionelle' }));
    await current;
    slow.resolve(ConviveBuilder.aConvive().withId('c2').withName('Lio').build());
    await abandoned;

    expect(selectConvives(store.getState()).convives.map((c) => c.name)).toEqual([
      'Aurélie',
      'Lionelle',
    ]);
  });

  it('ouvrir l’édition d’une ligne mémorise le convive édité, l’annuler l’oublie', async () => {
    const store = createTestStore({ listConvives: async () => twoConvives() });
    await store.dispatch(loadConvives());

    store.dispatch(conviveEditRequested('c2'));
    expect(selectConvives(store.getState()).editingConviveId).toBe('c2');

    store.dispatch(conviveEditCancelled());
    expect(selectConvives(store.getState()).editingConviveId).toBeNull();
  });

  it('modifier le brouillon laisse le constat en place, sans refermer l’édition', async () => {
    const unacknowledged: RenameConvive = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      renameConvive: unacknowledged,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveEditRequested('c2'));
    await store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));
    expect(selectConvives(store.getState()).renameStatus).toBe('unconfirmed');

    store.dispatch(renameDraftEdited('Li'));

    expect(selectConvives(store.getState()).renameStatus).toBe('unconfirmed');
    expect(selectConvives(store.getState()).editingConviveId).toBe('c2');
    expect(selectConvives(store.getState()).renameDraft).toBe('Li');
  });

  it('un nouvel envoi chasse le constat du renommage précédent', async () => {
    const unacknowledged: RenameConvive = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      renameConvive: unacknowledged,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveEditRequested('c2'));
    await store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));
    expect(selectConvives(store.getState()).renameStatus).toBe('unconfirmed');

    const renvoi = store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));

    expect(selectConvives(store.getState()).renameStatus).toBe('renaming');
    await renvoi;
  });

  it('un nouveau chargement referme l’édition et remet le cycle de renommage au repos', async () => {
    const unacknowledged: RenameConvive = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      renameConvive: unacknowledged,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveEditRequested('c2'));
    await store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));
    expect(selectConvives(store.getState()).renameStatus).toBe('unconfirmed');

    await store.dispatch(loadConvives());

    expect(selectConvives(store.getState()).renameStatus).toBe('idle');
    expect(selectConvives(store.getState()).editingConviveId).toBeNull();
  });

  it('un chargement qui démarre pendant un renommage en vol ne réarme pas la ligne', async () => {
    const pendingRename: RenameConvive = () => new Promise<Convive>(() => {});
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      renameConvive: pendingRename,
    });
    store.dispatch(conviveEditRequested('c2'));
    void store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));

    void store.dispatch(loadConvives());

    expect(selectConvives(store.getState()).renameStatus).toBe('renaming');
    expect(selectConvives(store.getState()).editingConviveId).toBe('c2');
  });

  it('removeConvive appelle le use case avec l’id et retire le convive de la liste', async () => {
    const captured: { input: RemoveConviveInput | undefined } = { input: undefined };
    const removeConviveUseCase: RemoveConvive = async (input) => {
      captured.input = input;
    };
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      removeConvive: removeConviveUseCase,
    });
    await store.dispatch(loadConvives());

    await store.dispatch(removeConvive({ id: 'c2' }));

    expect(captured.input).toEqual({ id: 'c2' });
    expect(selectConvives(store.getState()).convives).toEqual([
      ConviveBuilder.aConvive().withId('c1').withName('Aurélie').build(),
    ]);
  });

  it('un retrait réussi referme la confirmation et remet le cycle au repos', async () => {
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      removeConvive: async () => {},
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveRemovalRequested('c2'));

    const removed = await store.dispatch(removeConvive({ id: 'c2' }));

    expect(selectConvives(store.getState()).removeStatus).toBe('idle');
    expect(selectConvives(store.getState()).pendingRemovalId).toBeNull();
    expect(selectConvives(store.getState()).latestRemoveRequestId).toBe(removed.meta.requestId);
  });

  it('pendant un retrait en vol, removeStatus passe à removing et le convive reste affiché', async () => {
    const pendingRemove: RemoveConvive = () => new Promise<void>(() => {});
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      removeConvive: pendingRemove,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveRemovalRequested('c2'));

    const inFlight = store.dispatch(removeConvive({ id: 'c2' }));

    expect(selectConvives(store.getState()).removeStatus).toBe('removing');
    expect(selectConvives(store.getState()).latestRemoveRequestId).toBe(inFlight.requestId);
    expect(selectConvives(store.getState()).convives.map((c) => c.name)).toEqual([
      'Aurélie',
      'Lionel',
    ]);
  });

  it('un retrait refusé passe en error, le convive reste dans la liste et la confirmation reste ouverte', async () => {
    const failingRemove: RemoveConvive = () => Promise.reject(new Error('Firestore indisponible'));
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      removeConvive: failingRemove,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveRemovalRequested('c2'));

    await store.dispatch(removeConvive({ id: 'c2' }));

    expect(selectConvives(store.getState()).removeStatus).toBe('error');
    expect(selectConvives(store.getState()).pendingRemovalId).toBe('c2');
    expect(selectConvives(store.getState()).convives.map((c) => c.name)).toEqual([
      'Aurélie',
      'Lionel',
    ]);
  });

  it('un retrait que le serveur n’a pas acquitté prend un status distinct de error, sans quitter la liste', async () => {
    const unacknowledged: RemoveConvive = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      removeConvive: unacknowledged,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveRemovalRequested('c2'));

    await store.dispatch(removeConvive({ id: 'c2' }));

    expect(selectConvives(store.getState()).removeStatus).toBe('unconfirmed');
    expect(selectConvives(store.getState()).convives.map((c) => c.name)).toEqual([
      'Aurélie',
      'Lionel',
    ]);
  });

  it('un rejet tardif d’un retrait dépassé n’écrase pas le constat du retrait courant', async () => {
    const slow = deferred<void>();
    let call = 0;
    const removeConviveUseCase: RemoveConvive = () => {
      call += 1;
      return call === 1 ? slow.promise : Promise.reject(RepositoryUnavailableError.create());
    };
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      removeConvive: removeConviveUseCase,
    });
    await store.dispatch(loadConvives());

    const abandoned = store.dispatch(removeConvive({ id: 'c1' }));
    const current = store.dispatch(removeConvive({ id: 'c2' }));
    await current;
    slow.reject(new Error('Firestore indisponible'));
    await abandoned;

    expect(selectConvives(store.getState()).removeStatus).toBe('unconfirmed');
    expect(selectConvives(store.getState()).latestRemoveRequestId).toBe(current.requestId);
  });

  it('un succès tardif d’un retrait dépassé retire quand même le convive, sans toucher au constat courant', async () => {
    const slow = deferred<void>();
    let call = 0;
    const removeConviveUseCase: RemoveConvive = () => {
      call += 1;
      return call === 1 ? slow.promise : Promise.reject(RepositoryUnavailableError.create());
    };
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      removeConvive: removeConviveUseCase,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveRemovalRequested('c2'));

    const abandoned = store.dispatch(removeConvive({ id: 'c1' }));
    const current = store.dispatch(removeConvive({ id: 'c2' }));
    await current;
    slow.resolve();
    await abandoned;

    expect(selectConvives(store.getState()).convives.map((c) => c.name)).toEqual(['Lionel']);
    expect(selectConvives(store.getState()).removeStatus).toBe('unconfirmed');
    expect(selectConvives(store.getState()).pendingRemovalId).toBe('c2');
  });

  it('demander le retrait n’appelle pas le use case et ne retire personne', async () => {
    let called = 0;
    const removeConviveUseCase: RemoveConvive = async () => {
      called += 1;
    };
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      removeConvive: removeConviveUseCase,
    });
    await store.dispatch(loadConvives());

    store.dispatch(conviveRemovalRequested('c2'));

    expect(selectConvives(store.getState()).pendingRemovalId).toBe('c2');
    expect(called).toBe(0);
    expect(selectConvives(store.getState()).convives).toHaveLength(2);
  });

  it('annuler la confirmation oublie la demande de retrait', async () => {
    const store = createTestStore({ listConvives: async () => twoConvives() });
    await store.dispatch(loadConvives());
    store.dispatch(conviveRemovalRequested('c2'));
    expect(selectConvives(store.getState()).pendingRemovalId).toBe('c2');

    store.dispatch(conviveRemovalCancelled());

    expect(selectConvives(store.getState()).pendingRemovalId).toBeNull();
  });

  it('un nouveau chargement referme la confirmation et remet le cycle de retrait au repos', async () => {
    const unacknowledged: RemoveConvive = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      removeConvive: unacknowledged,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveRemovalRequested('c2'));
    await store.dispatch(removeConvive({ id: 'c2' }));
    expect(selectConvives(store.getState()).removeStatus).toBe('unconfirmed');

    await store.dispatch(loadConvives());

    expect(selectConvives(store.getState()).removeStatus).toBe('idle');
    expect(selectConvives(store.getState()).pendingRemovalId).toBeNull();
  });

  it('un chargement qui démarre pendant un retrait en vol ne réarme pas la confirmation', async () => {
    const pendingRemove: RemoveConvive = () => new Promise<void>(() => {});
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      removeConvive: pendingRemove,
    });
    store.dispatch(conviveRemovalRequested('c2'));
    void store.dispatch(removeConvive({ id: 'c2' }));

    void store.dispatch(loadConvives());

    expect(selectConvives(store.getState()).removeStatus).toBe('removing');
    expect(selectConvives(store.getState()).pendingRemovalId).toBe('c2');
  });

  it('rend une ligne par convive, dans l’ordre de la liste, au repos', async () => {
    const store = createTestStore({ listConvives: async () => twoConvives() });
    await store.dispatch(loadConvives());

    const rows = conviveRowsOf(selectConvives(store.getState()));

    expect(rows.map((r) => [r.id, r.name, r.mode])).toEqual([
      ['c1', 'Aurélie', 'idle'],
      ['c2', 'Lionel', 'idle'],
    ]);
    expect(rows.every((r) => r.notice === null)).toBe(true);
  });

  it('seule la ligne éditée passe en mode édition', async () => {
    const store = createTestStore({ listConvives: async () => twoConvives() });
    await store.dispatch(loadConvives());
    store.dispatch(conviveEditRequested('c2'));

    const rows = conviveRowsOf(selectConvives(store.getState()));

    expect(rows.map((r) => r.mode)).toEqual(['idle', 'editing']);
  });

  it('seule la ligne dont le retrait attend confirmation passe en mode confirmation', async () => {
    const store = createTestStore({ listConvives: async () => twoConvives() });
    await store.dispatch(loadConvives());
    store.dispatch(conviveRemovalRequested('c1'));

    const rows = conviveRowsOf(selectConvives(store.getState()));

    expect(rows.map((r) => r.mode)).toEqual(['confirming-removal', 'idle']);
  });

  it('verrouille l’enregistrement tant que le brouillon est vide ou blanc', async () => {
    const store = createTestStore({ listConvives: async () => twoConvives() });
    await store.dispatch(loadConvives());
    store.dispatch(conviveEditRequested('c2'));

    store.dispatch(renameDraftEdited(''));
    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.saveDisabled).toBe(true);
    store.dispatch(renameDraftEdited('   '));
    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.saveDisabled).toBe(true);
    store.dispatch(renameDraftEdited('Lio'));
    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.saveDisabled).toBe(false);
  });

  it('verrouille l’enregistrement quand le brouillon est le prénom actuel du convive', async () => {
    const store = createTestStore({ listConvives: async () => twoConvives() });
    await store.dispatch(loadConvives());
    store.dispatch(conviveEditRequested('c2'));

    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.saveDisabled).toBe(true);
    store.dispatch(renameDraftEdited('  Lionel  '));
    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.saveDisabled).toBe(true);
    store.dispatch(renameDraftEdited('lionel'));
    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.saveDisabled).toBe(false);
    store.dispatch(renameDraftEdited('Aurélie'));
    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.saveDisabled).toBe(false);
  });

  it('verrouille l’enregistrement pendant le renommage en vol', async () => {
    const pendingRename: RenameConvive = () => new Promise<Convive>(() => {});
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      renameConvive: pendingRename,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveEditRequested('c2'));
    store.dispatch(renameDraftEdited('Lio'));
    void store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));

    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.saveDisabled).toBe(true);
    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.editInputDisabled).toBe(true);
  });

  it('après un renommage non acquitté, le bouton et le champ se réarment tous les deux', async () => {
    const unacknowledged: RenameConvive = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      renameConvive: unacknowledged,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveEditRequested('c2'));
    store.dispatch(renameDraftEdited('Lio'));
    await store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));

    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.saveDisabled).toBe(false);
    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.editInputDisabled).toBe(false);
  });

  it('verrouille la confirmation de retrait pendant le retrait en vol', async () => {
    const pendingRemove: RemoveConvive = () => new Promise<void>(() => {});
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      removeConvive: pendingRemove,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveRemovalRequested('c2'));
    void store.dispatch(removeConvive({ id: 'c2' }));

    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.confirmDisabled).toBe(true);
  });

  it('porte le constat d’un renommage refusé sur la seule ligne concernée, comme une alerte', async () => {
    const failingRename: RenameConvive = () => Promise.reject(new Error('Firestore indisponible'));
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      renameConvive: failingRename,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveEditRequested('c2'));
    await store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));

    const rows = conviveRowsOf(selectConvives(store.getState()));

    expect(rows[0]?.notice).toBeNull();
    expect(rows[1]?.notice).toEqual({
      tone: 'error',
      message: 'Impossible de renommer le convive.',
    });
  });

  it('nomme le convive dans le constat d’un renommage non acquitté, sur un ton de constat', async () => {
    const unacknowledged: RenameConvive = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      renameConvive: unacknowledged,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveEditRequested('c1'));
    await store.dispatch(renameConvive({ id: 'c1', name: 'Alix' }));

    const rows = conviveRowsOf(selectConvives(store.getState()));

    expect(rows[0]?.notice).toEqual({
      tone: 'unconfirmed',
      message: 'Aucune connexion — le renommage d’Aurélie n’a pas pu être confirmé.',
    });
    expect(rows[1]?.notice).toBeNull();
  });

  it('porte le constat d’un retrait refusé sur la seule ligne concernée, comme une alerte', async () => {
    const failingRemove: RemoveConvive = () => Promise.reject(new Error('Firestore indisponible'));
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      removeConvive: failingRemove,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveRemovalRequested('c2'));
    await store.dispatch(removeConvive({ id: 'c2' }));

    const rows = conviveRowsOf(selectConvives(store.getState()));

    expect(rows[0]?.notice).toBeNull();
    expect(rows[1]?.notice).toEqual({
      tone: 'error',
      message: 'Impossible de retirer le convive.',
    });
  });

  it('nomme le convive dans le constat d’un retrait non acquitté, sur un ton de constat', async () => {
    const unacknowledged: RemoveConvive = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      removeConvive: unacknowledged,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveRemovalRequested('c2'));
    await store.dispatch(removeConvive({ id: 'c2' }));

    const rows = conviveRowsOf(selectConvives(store.getState()));

    expect(rows[1]?.notice).toEqual({
      tone: 'unconfirmed',
      message: 'Aucune connexion — le retrait de Lionel n’a pas pu être confirmé.',
    });
  });

  it('ouvrir l’édition d’une autre ligne efface le constat périmé de la précédente', async () => {
    const unacknowledged: RenameConvive = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      renameConvive: unacknowledged,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveEditRequested('c2'));
    await store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));
    expect(selectConvives(store.getState()).renameStatus).toBe('unconfirmed');

    store.dispatch(conviveEditRequested('c1'));

    expect(selectConvives(store.getState()).renameStatus).toBe('idle');
    expect(selectConvives(store.getState()).editingConviveId).toBe('c1');
  });

  it('ouvrir l’édition d’une autre ligne pendant un renommage en vol ne déplace rien', async () => {
    const pendingRename: RenameConvive = () => new Promise<Convive>(() => {});
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      renameConvive: pendingRename,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveEditRequested('c2'));
    void store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));

    store.dispatch(conviveEditRequested('c1'));

    expect(selectConvives(store.getState()).editingConviveId).toBe('c2');
  });

  it('annuler l’édition pendant un renommage en vol ne referme rien', async () => {
    const pendingRename: RenameConvive = () => new Promise<Convive>(() => {});
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      renameConvive: pendingRename,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveEditRequested('c2'));
    void store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));

    store.dispatch(conviveEditCancelled());

    expect(selectConvives(store.getState()).editingConviveId).toBe('c2');
    expect(selectConvives(store.getState()).renameStatus).toBe('renaming');
  });

  it('demander le retrait d’un autre convive efface le constat périmé du précédent', async () => {
    const unacknowledged: RemoveConvive = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      removeConvive: unacknowledged,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveRemovalRequested('c2'));
    await store.dispatch(removeConvive({ id: 'c2' }));
    expect(selectConvives(store.getState()).removeStatus).toBe('unconfirmed');

    store.dispatch(conviveRemovalRequested('c1'));

    expect(selectConvives(store.getState()).removeStatus).toBe('idle');
    expect(selectConvives(store.getState()).pendingRemovalId).toBe('c1');
  });

  it('demander le retrait d’un autre convive pendant un retrait en vol ne déplace rien', async () => {
    const pendingRemove: RemoveConvive = () => new Promise<void>(() => {});
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      removeConvive: pendingRemove,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveRemovalRequested('c2'));
    void store.dispatch(removeConvive({ id: 'c2' }));

    store.dispatch(conviveRemovalRequested('c1'));

    expect(selectConvives(store.getState()).pendingRemovalId).toBe('c2');
  });

  it('annuler la confirmation pendant un retrait en vol ne referme rien', async () => {
    const pendingRemove: RemoveConvive = () => new Promise<void>(() => {});
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      removeConvive: pendingRemove,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveRemovalRequested('c2'));
    void store.dispatch(removeConvive({ id: 'c2' }));

    store.dispatch(conviveRemovalCancelled());

    expect(selectConvives(store.getState()).pendingRemovalId).toBe('c2');
    expect(selectConvives(store.getState()).removeStatus).toBe('removing');
  });

  it('un renommage abouti sur un convive absent de la liste n’y ajoute personne', async () => {
    const slowRename = deferred<Convive>();
    let load = 0;
    const listConvives: ListConvives = () => {
      load += 1;
      return Promise.resolve(
        load === 1
          ? twoConvives()
          : [ConviveBuilder.aConvive().withId('c1').withName('Aurélie').build()],
      );
    };
    const store = createTestStore({ listConvives, renameConvive: () => slowRename.promise });
    await store.dispatch(loadConvives());

    const rename = store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));
    await store.dispatch(loadConvives());
    slowRename.resolve(ConviveBuilder.aConvive().withId('c2').withName('Lio').build());
    await rename;

    expect(selectConvives(store.getState()).convives.map((c) => c.name)).toEqual(['Aurélie']);
  });

  it('une ligne ouverte en édition, sans échec, ne porte aucun constat', async () => {
    const store = createTestStore({ listConvives: async () => twoConvives() });
    await store.dispatch(loadConvives());
    store.dispatch(conviveEditRequested('c2'));

    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.notice).toBeNull();
  });

  it('une confirmation de retrait ouverte, sans échec, ne porte aucun constat et reste actionnable', async () => {
    const store = createTestStore({ listConvives: async () => twoConvives() });
    await store.dispatch(loadConvives());
    store.dispatch(conviveRemovalRequested('c2'));

    const row = conviveRowsOf(selectConvives(store.getState()))[1];
    expect(row?.notice).toBeNull();
    expect(row?.confirmDisabled).toBe(false);
  });

  it('laisse toutes les lignes actionnables quand les deux cycles sont au repos', async () => {
    const store = createTestStore({ listConvives: async () => twoConvives() });
    await store.dispatch(loadConvives());

    expect(conviveRowsOf(selectConvives(store.getState())).map((r) => r.actionsDisabled)).toEqual([
      false,
      false,
    ]);
  });

  it('verrouille les lignes au repos pendant un renommage en vol', async () => {
    const pendingRename: RenameConvive = () => new Promise<Convive>(() => {});
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      renameConvive: pendingRename,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveEditRequested('c1'));
    void store.dispatch(renameConvive({ id: 'c1', name: 'Alix' }));

    const rows = conviveRowsOf(selectConvives(store.getState()));

    expect(rows.map((r) => [r.mode, r.actionsDisabled])).toEqual([
      ['editing', false],
      ['idle', true],
    ]);
  });

  it('un constat de renommage ne verrouille plus les autres lignes', async () => {
    const unacknowledged: RenameConvive = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      renameConvive: unacknowledged,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveEditRequested('c1'));
    await store.dispatch(renameConvive({ id: 'c1', name: 'Alix' }));

    expect(selectConvives(store.getState()).renameStatus).toBe('unconfirmed');
    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.actionsDisabled).toBe(false);
  });

  it('un constat de retrait ne verrouille plus les autres lignes', async () => {
    const unacknowledged: RemoveConvive = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      removeConvive: unacknowledged,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveRemovalRequested('c2'));
    await store.dispatch(removeConvive({ id: 'c2' }));

    expect(selectConvives(store.getState()).removeStatus).toBe('unconfirmed');
    expect(conviveRowsOf(selectConvives(store.getState()))[0]?.actionsDisabled).toBe(false);
  });

  it('verrouille les autres lignes pendant un retrait en vol', async () => {
    const pendingRemove: RemoveConvive = () => new Promise<void>(() => {});
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      removeConvive: pendingRemove,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveRemovalRequested('c2'));
    void store.dispatch(removeConvive({ id: 'c2' }));

    expect(conviveRowsOf(selectConvives(store.getState()))[0]?.actionsDisabled).toBe(true);
  });

  it('ouvrir l’édition pré-remplit le brouillon avec le prénom courant', async () => {
    const store = createTestStore({ listConvives: async () => twoConvives() });
    await store.dispatch(loadConvives());

    store.dispatch(conviveEditRequested('c2'));

    expect(selectConvives(store.getState()).renameDraft).toBe('Lionel');
  });

  it('ouvrir l’édition d’un convive inconnu laisse le brouillon vide', async () => {
    const store = createTestStore({ listConvives: async () => twoConvives() });
    await store.dispatch(loadConvives());

    store.dispatch(conviveEditRequested('inconnu'));

    expect(selectConvives(store.getState()).renameDraft).toBe('');
  });

  it('la frappe remplace le brouillon', async () => {
    const store = createTestStore({ listConvives: async () => twoConvives() });
    await store.dispatch(loadConvives());
    store.dispatch(conviveEditRequested('c2'));

    store.dispatch(renameDraftEdited('Lio'));

    expect(selectConvives(store.getState()).renameDraft).toBe('Lio');
  });

  it('annuler l’édition oublie le brouillon', async () => {
    const store = createTestStore({ listConvives: async () => twoConvives() });
    await store.dispatch(loadConvives());
    store.dispatch(conviveEditRequested('c2'));
    store.dispatch(renameDraftEdited('Lio'));

    store.dispatch(conviveEditCancelled());

    expect(selectConvives(store.getState()).renameDraft).toBe('');
  });

  it('un renommage réussi oublie le brouillon avec le reste du cycle', async () => {
    const renameConviveUseCase: RenameConvive = async (input) =>
      ConviveBuilder.aConvive().withId(input.id).withName(input.name).build();
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      renameConvive: renameConviveUseCase,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveEditRequested('c2'));
    store.dispatch(renameDraftEdited('Lio'));

    await store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));

    expect(selectConvives(store.getState()).renameDraft).toBe('');
  });

  it('un chargement qui démarre pendant un renommage en vol conserve le brouillon', async () => {
    const pendingRename: RenameConvive = () => new Promise<Convive>(() => {});
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      renameConvive: pendingRename,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveEditRequested('c2'));
    store.dispatch(renameDraftEdited('Lio'));
    void store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));

    void store.dispatch(loadConvives());

    expect(selectConvives(store.getState()).renameDraft).toBe('Lio');
  });

  it('un nouveau chargement hors écriture en vol oublie le brouillon', async () => {
    const store = createTestStore({ listConvives: async () => twoConvives() });
    await store.dispatch(loadConvives());
    store.dispatch(conviveEditRequested('c2'));
    store.dispatch(renameDraftEdited('Lio'));

    await store.dispatch(loadConvives());

    expect(selectConvives(store.getState()).renameDraft).toBe('');
  });
});
