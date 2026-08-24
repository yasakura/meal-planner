import { describe, it, expect } from 'vitest';

import { type Convive } from '../../../domain/entities/convive';
import { type AddConvive, type AddConviveInput } from '../../../domain/use-cases/add-convive';
import { type NewConviveId } from '../../../domain/use-cases/new-convive-id';
import { type ObserveConvives } from '../../../domain/use-cases/observe-convives';
import { AccountBuilder } from '../../../domain/test-builders/account.builder';
import { ConviveBuilder } from '../../../domain/test-builders/convive.builder';
import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { createTestStore } from '../../../test/create-test-store';
import { deferred } from '../../test-utils/deferred';
import {
  type RemoveConvive,
  type RemoveConviveInput,
} from '../../../domain/use-cases/remove-convive';
import {
  type RenameConvive,
  type RenameConviveInput,
} from '../../../domain/use-cases/rename-convive';
import { authStateChanged } from '../auth/auth-slice';
import {
  addConvive,
  conviveEditCancelled,
  conviveFormScreenOpened,
  conviveEditRequested,
  conviveRemovalCancelled,
  conviveRemovalRequested,
  convivesObservationFailed,
  convivesObserved,
  convivesRetried,
  convivesViewOf,
  observeConvives,
  removeConvive,
  renameConvive,
  renameDraftEdited,
  conviveRowsOf,
  selectConvives,
  selectConvivesAttempt,
  selectConvivesLinkLost,
  type ConvivesState,
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
  it('un store neuf n’a rien reçu, ne constate aucune panne, et n’a tenté qu’une fois', () => {
    const store = createTestStore();

    expect(selectConvives(store.getState())).toEqual({
      convives: [],
      received: false,
      failure: null,
      attempt: 0,
      addStatus: 'idle',
      addError: null,
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

  it('addConvive appelle le use case avec le prénom saisi, et son aboutissement laisse le foyer au canal', async () => {
    const existing = twoConvives();
    const captured: { input: AddConviveInput | undefined } = { input: undefined };
    const addConviveUseCase: AddConvive = async (input) => {
      captured.input = input;
      return ConviveBuilder.aConvive().withId('c3').withName(input.name).build();
    };
    const store = createTestStore({
      addConvive: addConviveUseCase,
    });
    store.dispatch(convivesObserved(existing));

    const added = await store.dispatch(addConvive({ name: 'Rory' }));

    expect(captured.input).toEqual({ id: 'generated-id-1', name: 'Rory' });
    expect(selectConvives(store.getState())).toEqual({
      convives: existing,
      received: true,
      failure: null,
      attempt: 0,
      addStatus: 'idle',
      addError: null,
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

  it('le convive ajouté rejoint le foyer par le canal, une seule fois et à sa place alphabétique', async () => {
    const store = createTestStore({ newConviveId: sequentialDraftIds() });
    store.dispatch(observeConvives());

    await store.dispatch(addConvive({ name: 'Zoé' }));
    await store.dispatch(addConvive({ name: 'Élise' }));
    await store.dispatch(addConvive({ name: 'Emma' }));

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
      addConvive: failingAdd,
    });
    store.dispatch(convivesObserved(existing));

    const failed = await store.dispatch(addConvive({ name: 'Rory' }));

    expect(selectConvives(store.getState())).toEqual({
      convives: existing,
      received: true,
      failure: null,
      attempt: 0,
      addStatus: 'error',
      addError: 'Firestore indisponible',
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
      addConvive: pendingAdd,
    });
    store.dispatch(convivesObserved(existing));

    const inFlight = store.dispatch(addConvive({ name: 'Rory' }));

    expect(selectConvives(store.getState())).toEqual({
      convives: existing,
      received: true,
      failure: null,
      attempt: 0,
      addStatus: 'adding',
      addError: null,
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

  it('rouvrir l’écran remet le cycle de vie de l’ajout au repos', async () => {
    const refuse: AddConvive = () => Promise.reject(new Error('Le dépôt a refusé'));
    const store = createTestStore({ addConvive: refuse });
    store.dispatch(convivesObserved(twoConvives()));
    await store.dispatch(addConvive({ name: 'Rory' }));
    expect(selectConvives(store.getState()).addStatus).toBe('error');

    store.dispatch(conviveFormScreenOpened());

    expect(selectConvives(store.getState()).addStatus).toBe('idle');
    expect(selectConvives(store.getState()).addError).toBeNull();
  });

  it('rouvrir l’écran pendant un ajout en vol ne réarme pas le formulaire', async () => {
    const pendingAdd: AddConvive = () => new Promise<Convive>(() => {});
    const store = createTestStore({ addConvive: pendingAdd });
    void store.dispatch(addConvive({ name: 'Rory' }));
    expect(selectConvives(store.getState()).addStatus).toBe('adding');

    store.dispatch(conviveFormScreenOpened());

    expect(selectConvives(store.getState()).addStatus).toBe('adding');
  });

  it('rouvrir l’écran efface aussi un échec d’ajout, pas seulement un constat non confirmé', async () => {
    const failingAdd: AddConvive = () => Promise.reject(new Error('Firestore indisponible'));
    const store = createTestStore({ addConvive: failingAdd });
    store.dispatch(convivesObserved(twoConvives()));
    await store.dispatch(addConvive({ name: 'Rory' }));
    expect(selectConvives(store.getState()).addStatus).toBe('error');
    expect(selectConvives(store.getState()).addError).toBe('Firestore indisponible');

    store.dispatch(conviveFormScreenOpened());

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
      addConvive: flakyAdd,
    });
    store.dispatch(convivesObserved(existing));
    await store.dispatch(addConvive({ name: 'Rory' }));
    shouldFail = false;

    const retried = await store.dispatch(addConvive({ name: 'Rory' }));

    expect(selectConvives(store.getState())).toEqual({
      convives: existing,
      received: true,
      failure: null,
      attempt: 0,
      addStatus: 'idle',
      addError: null,
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
      addConvive: addConviveUseCase,
    });
    store.dispatch(convivesObserved(existing));

    const abandoned = store.dispatch(addConvive({ name: 'Rory' }));
    const current = store.dispatch(addConvive({ name: 'Rory' }));
    await current;
    slow.reject(new Error('Le dépôt a refusé'));
    await abandoned;

    expect(selectConvives(store.getState()).addStatus).toBe('idle');
    expect(selectConvives(store.getState()).addError).toBeNull();
    expect(selectConvives(store.getState()).latestAddRequestId).toBe(current.requestId);
  });

  it('un succès tardif d’un ajout dépassé n’efface pas le constat de l’ajout courant', async () => {
    const existing = twoConvives();
    const slow = deferred<Convive>();
    let call = 0;
    const addConviveUseCase: AddConvive = () => {
      call += 1;
      return call === 1 ? slow.promise : Promise.reject(new Error('Le dépôt a refusé'));
    };
    const store = createTestStore({
      addConvive: addConviveUseCase,
    });
    store.dispatch(convivesObserved(existing));

    const abandoned = store.dispatch(addConvive({ name: 'Sacha' }));
    const current = store.dispatch(addConvive({ name: 'Rory' }));
    await current;
    slow.resolve(ConviveBuilder.aConvive().withId('c3').withName('Sacha').build());
    await abandoned;

    expect(selectConvives(store.getState()).addStatus).toBe('error');
  });

  it('une émission du canal pendant un ajout en vol ramène quand même le cycle au repos, et le foyer reste celui du canal', async () => {
    const existing = twoConvives();
    const slowAdd = deferred<Convive>();
    const store = createTestStore({
      addConvive: () => slowAdd.promise,
    });

    const add = store.dispatch(addConvive({ name: 'Rory' }));
    store.dispatch(convivesObserved(existing));
    slowAdd.resolve(ConviveBuilder.aConvive().withId('c3').withName('Rory').build());
    await add;

    expect(selectConvives(store.getState()).addStatus).toBe('idle');
    expect(selectConvives(store.getState()).convives).toEqual(existing);
  });

  it('un nouvel envoi chasse le constat de l’ajout précédent', async () => {
    const refuse: AddConvive = () => Promise.reject(new Error('Le dépôt a refusé'));
    const store = createTestStore({ addConvive: refuse });
    await store.dispatch(addConvive({ name: 'Rory' }));
    expect(selectConvives(store.getState()).addStatus).toBe('error');

    const renvoi = store.dispatch(addConvive({ name: 'Rory' }));

    expect(selectConvives(store.getState()).addStatus).toBe('adding');
    await renvoi;
  });

  it('un nouvel envoi chasse le constat du retrait précédent', async () => {
    const refuse: RemoveConvive = () => Promise.reject(new Error('Le dépôt a refusé'));
    const store = createTestStore({
      removeConvive: refuse,
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveRemovalRequested('c2'));
    await store.dispatch(removeConvive({ id: 'c2' }));
    expect(selectConvives(store.getState()).removeStatus).toBe('error');

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
  });

  it('réenvoie un ajout refusé sous le MÊME identifiant, sans fabriquer de doublon', async () => {
    const add = recordingAdd(() => Promise.reject(new Error('Le dépôt a refusé')));
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
      renameConvive: renameConviveUseCase,
    });
    store.dispatch(convivesObserved(twoConvives()));

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
      renameConvive: renameConviveUseCase,
    });
    store.dispatch(convivesObserved(twoConvives()));

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
      renameConvive: renameConviveUseCase,
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveEditRequested('c2'));

    const renamed = await store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));

    expect(selectConvives(store.getState()).renameStatus).toBe('idle');
    expect(selectConvives(store.getState()).editingConviveId).toBeNull();
    expect(selectConvives(store.getState()).latestRenameRequestId).toBe(renamed.meta.requestId);
  });

  it('pendant un renommage en vol, renameStatus passe à renaming et la liste ne bouge pas', async () => {
    const pendingRename: RenameConvive = () => new Promise<Convive>(() => {});
    const store = createTestStore({
      renameConvive: pendingRename,
    });
    store.dispatch(convivesObserved(twoConvives()));
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
      renameConvive: failingRename,
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveEditRequested('c2'));

    await store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));

    expect(selectConvives(store.getState()).renameStatus).toBe('error');
    expect(selectConvives(store.getState()).editingConviveId).toBe('c2');
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
      renameConvive: renameConviveUseCase,
    });
    store.dispatch(convivesObserved(twoConvives()));

    const abandoned = store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));
    const current = store.dispatch(renameConvive({ id: 'c2', name: 'Lionelle' }));
    await current;
    slow.reject(new Error('Le dépôt a refusé'));
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
      renameConvive: renameConviveUseCase,
    });
    store.dispatch(convivesObserved(twoConvives()));

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
    const store = createTestStore();
    store.dispatch(convivesObserved(twoConvives()));

    store.dispatch(conviveEditRequested('c2'));
    expect(selectConvives(store.getState()).editingConviveId).toBe('c2');

    store.dispatch(conviveEditCancelled());
    expect(selectConvives(store.getState()).editingConviveId).toBeNull();
  });

  it('modifier le brouillon laisse le constat en place, sans refermer l’édition', async () => {
    const refuse: RenameConvive = () => Promise.reject(new Error('Le dépôt a refusé'));
    const store = createTestStore({
      renameConvive: refuse,
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveEditRequested('c2'));
    await store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));
    expect(selectConvives(store.getState()).renameStatus).toBe('error');

    store.dispatch(renameDraftEdited('Li'));

    expect(selectConvives(store.getState()).renameStatus).toBe('error');
    expect(selectConvives(store.getState()).editingConviveId).toBe('c2');
    expect(selectConvives(store.getState()).renameDraft).toBe('Li');
  });

  it('un nouvel envoi chasse le constat du renommage précédent', async () => {
    const refuse: RenameConvive = () => Promise.reject(new Error('Le dépôt a refusé'));
    const store = createTestStore({
      renameConvive: refuse,
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveEditRequested('c2'));
    await store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));
    expect(selectConvives(store.getState()).renameStatus).toBe('error');

    const renvoi = store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));

    expect(selectConvives(store.getState()).renameStatus).toBe('renaming');
    await renvoi;
  });

  it('rouvrir l’écran referme l’édition et remet le cycle de renommage au repos', async () => {
    const refuse: RenameConvive = () => Promise.reject(new Error('Le dépôt a refusé'));
    const store = createTestStore({
      renameConvive: refuse,
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveEditRequested('c2'));
    await store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));
    expect(selectConvives(store.getState()).renameStatus).toBe('error');

    store.dispatch(conviveFormScreenOpened());

    expect(selectConvives(store.getState()).renameStatus).toBe('idle');
    expect(selectConvives(store.getState()).editingConviveId).toBeNull();
  });

  it('rouvrir l’écran pendant un renommage en vol ne réarme pas la ligne', async () => {
    const pendingRename: RenameConvive = () => new Promise<Convive>(() => {});
    const store = createTestStore({ renameConvive: pendingRename });
    store.dispatch(conviveEditRequested('c2'));
    void store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));

    store.dispatch(conviveFormScreenOpened());

    expect(selectConvives(store.getState()).renameStatus).toBe('renaming');
    expect(selectConvives(store.getState()).editingConviveId).toBe('c2');
  });

  it('removeConvive appelle le use case avec l’id et retire le convive de la liste', async () => {
    const captured: { input: RemoveConviveInput | undefined } = { input: undefined };
    const removeConviveUseCase: RemoveConvive = async (input) => {
      captured.input = input;
    };
    const store = createTestStore({
      removeConvive: removeConviveUseCase,
    });
    store.dispatch(convivesObserved(twoConvives()));

    await store.dispatch(removeConvive({ id: 'c2' }));

    expect(captured.input).toEqual({ id: 'c2' });
    expect(selectConvives(store.getState()).convives).toEqual([
      ConviveBuilder.aConvive().withId('c1').withName('Aurélie').build(),
    ]);
  });

  it('un retrait réussi referme la confirmation et remet le cycle au repos', async () => {
    const store = createTestStore({
      removeConvive: async () => {},
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveRemovalRequested('c2'));

    const removed = await store.dispatch(removeConvive({ id: 'c2' }));

    expect(selectConvives(store.getState()).removeStatus).toBe('idle');
    expect(selectConvives(store.getState()).pendingRemovalId).toBeNull();
    expect(selectConvives(store.getState()).latestRemoveRequestId).toBe(removed.meta.requestId);
  });

  it('pendant un retrait en vol, removeStatus passe à removing et le convive reste affiché', async () => {
    const pendingRemove: RemoveConvive = () => new Promise<void>(() => {});
    const store = createTestStore({
      removeConvive: pendingRemove,
    });
    store.dispatch(convivesObserved(twoConvives()));
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
      removeConvive: failingRemove,
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveRemovalRequested('c2'));

    await store.dispatch(removeConvive({ id: 'c2' }));

    expect(selectConvives(store.getState()).removeStatus).toBe('error');
    expect(selectConvives(store.getState()).pendingRemovalId).toBe('c2');
    expect(selectConvives(store.getState()).convives.map((c) => c.name)).toEqual([
      'Aurélie',
      'Lionel',
    ]);
  });

  it('un rejet tardif d’un retrait dépassé ne rouvre pas de constat après un retrait abouti', async () => {
    const slow = deferred<void>();
    let call = 0;
    const removeConviveUseCase: RemoveConvive = () => {
      call += 1;
      return call === 1 ? slow.promise : Promise.resolve();
    };
    const store = createTestStore({
      removeConvive: removeConviveUseCase,
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveRemovalRequested('c2'));

    const abandoned = store.dispatch(removeConvive({ id: 'c1' }));
    const current = store.dispatch(removeConvive({ id: 'c2' }));
    await current;
    slow.reject(new Error('Firestore indisponible'));
    await abandoned;

    expect(selectConvives(store.getState()).removeStatus).toBe('idle');
    expect(selectConvives(store.getState()).pendingRemovalId).toBeNull();
    expect(selectConvives(store.getState()).latestRemoveRequestId).toBe(current.requestId);
  });

  it('porte le constat d’un retrait refusé sur la seule ligne concernée, comme une alerte', async () => {
    const failingRemove: RemoveConvive = () => Promise.reject(new Error('Firestore indisponible'));
    const store = createTestStore({
      removeConvive: failingRemove,
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveRemovalRequested('c2'));
    await store.dispatch(removeConvive({ id: 'c2' }));

    const rows = conviveRowsOf(selectConvives(store.getState()));

    expect(rows[0]?.notice).toBeNull();
    expect(rows[1]?.notice).toEqual({
      tone: 'error',
      message: 'Impossible de retirer le convive.',
    });
  });

  it('un rejet tardif d’un retrait dépassé ne déverrouille pas le retrait encore en vol', async () => {
    const slow = deferred<void>();
    let call = 0;
    const removeConviveUseCase: RemoveConvive = () => {
      call += 1;
      return call === 1 ? slow.promise : new Promise<void>(() => {});
    };
    const store = createTestStore({
      removeConvive: removeConviveUseCase,
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveRemovalRequested('c2'));

    const abandoned = store.dispatch(removeConvive({ id: 'c1' }));
    const current = store.dispatch(removeConvive({ id: 'c2' }));
    slow.reject(new Error('Le dépôt a refusé'));
    await abandoned;

    expect(selectConvives(store.getState()).removeStatus).toBe('removing');
    expect(selectConvives(store.getState()).latestRemoveRequestId).toBe(current.requestId);
    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.confirmDisabled).toBe(true);
  });

  it('un succès tardif d’un retrait dépassé retire quand même le convive, sans toucher au constat courant', async () => {
    const slow = deferred<void>();
    let call = 0;
    const removeConviveUseCase: RemoveConvive = () => {
      call += 1;
      return call === 1 ? slow.promise : Promise.reject(new Error('Le dépôt a refusé'));
    };
    const store = createTestStore({
      removeConvive: removeConviveUseCase,
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveRemovalRequested('c2'));

    const abandoned = store.dispatch(removeConvive({ id: 'c1' }));
    const current = store.dispatch(removeConvive({ id: 'c2' }));
    await current;
    slow.resolve();
    await abandoned;

    expect(selectConvives(store.getState()).convives.map((c) => c.name)).toEqual(['Lionel']);
    expect(selectConvives(store.getState()).removeStatus).toBe('error');
    expect(selectConvives(store.getState()).pendingRemovalId).toBe('c2');
  });

  it('demander le retrait n’appelle pas le use case et ne retire personne', async () => {
    let called = 0;
    const removeConviveUseCase: RemoveConvive = async () => {
      called += 1;
    };
    const store = createTestStore({
      removeConvive: removeConviveUseCase,
    });
    store.dispatch(convivesObserved(twoConvives()));

    store.dispatch(conviveRemovalRequested('c2'));

    expect(selectConvives(store.getState()).pendingRemovalId).toBe('c2');
    expect(called).toBe(0);
    expect(selectConvives(store.getState()).convives).toHaveLength(2);
  });

  it('annuler la confirmation oublie la demande de retrait', async () => {
    const store = createTestStore();
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveRemovalRequested('c2'));
    expect(selectConvives(store.getState()).pendingRemovalId).toBe('c2');

    store.dispatch(conviveRemovalCancelled());

    expect(selectConvives(store.getState()).pendingRemovalId).toBeNull();
  });

  it('rouvrir l’écran referme la confirmation et remet le cycle de retrait au repos', async () => {
    const refuse: RemoveConvive = () => Promise.reject(new Error('Le dépôt a refusé'));
    const store = createTestStore({ removeConvive: refuse });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveRemovalRequested('c2'));
    await store.dispatch(removeConvive({ id: 'c2' }));
    expect(selectConvives(store.getState()).removeStatus).toBe('error');

    store.dispatch(conviveFormScreenOpened());

    expect(selectConvives(store.getState()).removeStatus).toBe('idle');
    expect(selectConvives(store.getState()).pendingRemovalId).toBeNull();
  });

  it('rouvrir l’écran pendant un retrait en vol ne réarme pas la confirmation', async () => {
    const pendingRemove: RemoveConvive = () => new Promise<void>(() => {});
    const store = createTestStore({ removeConvive: pendingRemove });
    store.dispatch(conviveRemovalRequested('c2'));
    void store.dispatch(removeConvive({ id: 'c2' }));

    store.dispatch(conviveFormScreenOpened());

    expect(selectConvives(store.getState()).removeStatus).toBe('removing');
    expect(selectConvives(store.getState()).pendingRemovalId).toBe('c2');
  });

  it('rend une ligne par convive, dans l’ordre de la liste, au repos', async () => {
    const store = createTestStore();
    store.dispatch(convivesObserved(twoConvives()));

    const rows = conviveRowsOf(selectConvives(store.getState()));

    expect(rows.map((r) => [r.id, r.name, r.mode])).toEqual([
      ['c1', 'Aurélie', 'idle'],
      ['c2', 'Lionel', 'idle'],
    ]);
    expect(rows.every((r) => r.notice === null)).toBe(true);
  });

  it('seule la ligne éditée passe en mode édition', async () => {
    const store = createTestStore();
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveEditRequested('c2'));

    const rows = conviveRowsOf(selectConvives(store.getState()));

    expect(rows.map((r) => r.mode)).toEqual(['idle', 'editing']);
  });

  it('seule la ligne dont le retrait attend confirmation passe en mode confirmation', async () => {
    const store = createTestStore();
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveRemovalRequested('c1'));

    const rows = conviveRowsOf(selectConvives(store.getState()));

    expect(rows.map((r) => r.mode)).toEqual(['confirming-removal', 'idle']);
  });

  it('verrouille l’enregistrement tant que le brouillon est vide ou blanc', async () => {
    const store = createTestStore();
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveEditRequested('c2'));

    store.dispatch(renameDraftEdited(''));
    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.saveDisabled).toBe(true);
    store.dispatch(renameDraftEdited('   '));
    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.saveDisabled).toBe(true);
    store.dispatch(renameDraftEdited('Lio'));
    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.saveDisabled).toBe(false);
  });

  it('verrouille l’enregistrement quand le brouillon est le prénom actuel du convive', async () => {
    const store = createTestStore();
    store.dispatch(convivesObserved(twoConvives()));
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
      renameConvive: pendingRename,
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveEditRequested('c2'));
    store.dispatch(renameDraftEdited('Lio'));
    void store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));

    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.saveDisabled).toBe(true);
    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.editInputDisabled).toBe(true);
  });

  it('après un renommage refusé, le bouton et le champ se réarment tous les deux', async () => {
    const refuse: RenameConvive = () => Promise.reject(new Error('Le dépôt a refusé'));
    const store = createTestStore({
      renameConvive: refuse,
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveEditRequested('c2'));
    store.dispatch(renameDraftEdited('Lio'));
    await store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));

    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.saveDisabled).toBe(false);
    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.editInputDisabled).toBe(false);
  });

  it('verrouille la confirmation de retrait pendant le retrait en vol', async () => {
    const pendingRemove: RemoveConvive = () => new Promise<void>(() => {});
    const store = createTestStore({
      removeConvive: pendingRemove,
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveRemovalRequested('c2'));
    void store.dispatch(removeConvive({ id: 'c2' }));

    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.confirmDisabled).toBe(true);
  });

  it('porte le constat d’un renommage refusé sur la seule ligne concernée, comme une alerte', async () => {
    const failingRename: RenameConvive = () => Promise.reject(new Error('Firestore indisponible'));
    const store = createTestStore({
      renameConvive: failingRename,
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveEditRequested('c2'));
    await store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));

    const rows = conviveRowsOf(selectConvives(store.getState()));

    expect(rows[0]?.notice).toBeNull();
    expect(rows[1]?.notice).toEqual({
      tone: 'error',
      message: 'Impossible de renommer le convive.',
    });
  });

  it('ouvrir l’édition d’une autre ligne efface le constat périmé de la précédente', async () => {
    const refuse: RenameConvive = () => Promise.reject(new Error('Le dépôt a refusé'));
    const store = createTestStore({
      renameConvive: refuse,
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveEditRequested('c2'));
    await store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));
    expect(selectConvives(store.getState()).renameStatus).toBe('error');

    store.dispatch(conviveEditRequested('c1'));

    expect(selectConvives(store.getState()).renameStatus).toBe('idle');
    expect(selectConvives(store.getState()).editingConviveId).toBe('c1');
  });

  it('ouvrir l’édition d’une autre ligne pendant un renommage en vol ne déplace rien', async () => {
    const pendingRename: RenameConvive = () => new Promise<Convive>(() => {});
    const store = createTestStore({
      renameConvive: pendingRename,
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveEditRequested('c2'));
    void store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));

    store.dispatch(conviveEditRequested('c1'));

    expect(selectConvives(store.getState()).editingConviveId).toBe('c2');
  });

  it('annuler l’édition pendant un renommage en vol ne referme rien', async () => {
    const pendingRename: RenameConvive = () => new Promise<Convive>(() => {});
    const store = createTestStore({
      renameConvive: pendingRename,
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveEditRequested('c2'));
    void store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));

    store.dispatch(conviveEditCancelled());

    expect(selectConvives(store.getState()).editingConviveId).toBe('c2');
    expect(selectConvives(store.getState()).renameStatus).toBe('renaming');
  });

  it('demander le retrait d’un autre convive efface le constat périmé du précédent', async () => {
    const refuse: RemoveConvive = () => Promise.reject(new Error('Le dépôt a refusé'));
    const store = createTestStore({
      removeConvive: refuse,
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveRemovalRequested('c2'));
    await store.dispatch(removeConvive({ id: 'c2' }));
    expect(selectConvives(store.getState()).removeStatus).toBe('error');

    store.dispatch(conviveRemovalRequested('c1'));

    expect(selectConvives(store.getState()).removeStatus).toBe('idle');
    expect(selectConvives(store.getState()).pendingRemovalId).toBe('c1');
  });

  it('demander le retrait d’un autre convive pendant un retrait en vol ne déplace rien', async () => {
    const pendingRemove: RemoveConvive = () => new Promise<void>(() => {});
    const store = createTestStore({
      removeConvive: pendingRemove,
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveRemovalRequested('c2'));
    void store.dispatch(removeConvive({ id: 'c2' }));

    store.dispatch(conviveRemovalRequested('c1'));

    expect(selectConvives(store.getState()).pendingRemovalId).toBe('c2');
  });

  it('annuler la confirmation pendant un retrait en vol ne referme rien', async () => {
    const pendingRemove: RemoveConvive = () => new Promise<void>(() => {});
    const store = createTestStore({
      removeConvive: pendingRemove,
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveRemovalRequested('c2'));
    void store.dispatch(removeConvive({ id: 'c2' }));

    store.dispatch(conviveRemovalCancelled());

    expect(selectConvives(store.getState()).pendingRemovalId).toBe('c2');
    expect(selectConvives(store.getState()).removeStatus).toBe('removing');
  });

  it('un renommage abouti sur un convive absent de la liste n’y ajoute personne', async () => {
    const slowRename = deferred<Convive>();
    const store = createTestStore({ renameConvive: () => slowRename.promise });
    store.dispatch(convivesObserved(twoConvives()));

    const rename = store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));
    store.dispatch(
      convivesObserved([ConviveBuilder.aConvive().withId('c1').withName('Aurélie').build()]),
    );
    slowRename.resolve(ConviveBuilder.aConvive().withId('c2').withName('Lio').build());
    await rename;

    expect(selectConvives(store.getState()).convives.map((c) => c.name)).toEqual(['Aurélie']);
  });

  it('une ligne ouverte en édition, sans échec, ne porte aucun constat', async () => {
    const store = createTestStore();
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveEditRequested('c2'));

    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.notice).toBeNull();
  });

  it('une confirmation de retrait ouverte, sans échec, ne porte aucun constat et reste actionnable', async () => {
    const store = createTestStore();
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveRemovalRequested('c2'));

    const row = conviveRowsOf(selectConvives(store.getState()))[1];
    expect(row?.notice).toBeNull();
    expect(row?.confirmDisabled).toBe(false);
  });

  it('laisse toutes les lignes actionnables quand les deux cycles sont au repos', async () => {
    const store = createTestStore();
    store.dispatch(convivesObserved(twoConvives()));

    expect(conviveRowsOf(selectConvives(store.getState())).map((r) => r.actionsDisabled)).toEqual([
      false,
      false,
    ]);
  });

  it('verrouille les lignes au repos pendant un renommage en vol', async () => {
    const pendingRename: RenameConvive = () => new Promise<Convive>(() => {});
    const store = createTestStore({
      renameConvive: pendingRename,
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveEditRequested('c1'));
    void store.dispatch(renameConvive({ id: 'c1', name: 'Alix' }));

    const rows = conviveRowsOf(selectConvives(store.getState()));

    expect(rows.map((r) => [r.mode, r.actionsDisabled])).toEqual([
      ['editing', false],
      ['idle', true],
    ]);
  });

  it('un constat de renommage ne verrouille plus les autres lignes', async () => {
    const refuse: RenameConvive = () => Promise.reject(new Error('Le dépôt a refusé'));
    const store = createTestStore({
      renameConvive: refuse,
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveEditRequested('c1'));
    await store.dispatch(renameConvive({ id: 'c1', name: 'Alix' }));

    expect(selectConvives(store.getState()).renameStatus).toBe('error');
    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.actionsDisabled).toBe(false);
  });

  it('un constat de retrait ne verrouille plus les autres lignes', async () => {
    const refuse: RemoveConvive = () => Promise.reject(new Error('Le dépôt a refusé'));
    const store = createTestStore({
      removeConvive: refuse,
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveRemovalRequested('c2'));
    await store.dispatch(removeConvive({ id: 'c2' }));

    expect(selectConvives(store.getState()).removeStatus).toBe('error');
    expect(conviveRowsOf(selectConvives(store.getState()))[0]?.actionsDisabled).toBe(false);
  });

  it('verrouille les autres lignes pendant un retrait en vol', async () => {
    const pendingRemove: RemoveConvive = () => new Promise<void>(() => {});
    const store = createTestStore({
      removeConvive: pendingRemove,
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveRemovalRequested('c2'));
    void store.dispatch(removeConvive({ id: 'c2' }));

    expect(conviveRowsOf(selectConvives(store.getState()))[0]?.actionsDisabled).toBe(true);
  });

  it('ouvrir l’édition pré-remplit le brouillon avec le prénom courant', async () => {
    const store = createTestStore();
    store.dispatch(convivesObserved(twoConvives()));

    store.dispatch(conviveEditRequested('c2'));

    expect(selectConvives(store.getState()).renameDraft).toBe('Lionel');
  });

  it('ouvrir l’édition d’un convive inconnu laisse le brouillon vide', async () => {
    const store = createTestStore();
    store.dispatch(convivesObserved(twoConvives()));

    store.dispatch(conviveEditRequested('inconnu'));

    expect(selectConvives(store.getState()).renameDraft).toBe('');
  });

  it('la frappe remplace le brouillon', async () => {
    const store = createTestStore();
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveEditRequested('c2'));

    store.dispatch(renameDraftEdited('Lio'));

    expect(selectConvives(store.getState()).renameDraft).toBe('Lio');
  });

  it('annuler l’édition oublie le brouillon', async () => {
    const store = createTestStore();
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveEditRequested('c2'));
    store.dispatch(renameDraftEdited('Lio'));

    store.dispatch(conviveEditCancelled());

    expect(selectConvives(store.getState()).renameDraft).toBe('');
  });

  it('un renommage réussi oublie le brouillon avec le reste du cycle', async () => {
    const renameConviveUseCase: RenameConvive = async (input) =>
      ConviveBuilder.aConvive().withId(input.id).withName(input.name).build();
    const store = createTestStore({
      renameConvive: renameConviveUseCase,
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveEditRequested('c2'));
    store.dispatch(renameDraftEdited('Lio'));

    await store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));

    expect(selectConvives(store.getState()).renameDraft).toBe('');
  });

  it('rouvrir l’écran pendant un renommage en vol conserve le brouillon', async () => {
    const pendingRename: RenameConvive = () => new Promise<Convive>(() => {});
    const store = createTestStore({
      renameConvive: pendingRename,
    });
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveEditRequested('c2'));
    store.dispatch(renameDraftEdited('Lio'));
    void store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));

    store.dispatch(conviveFormScreenOpened());

    expect(selectConvives(store.getState()).renameDraft).toBe('Lio');
  });

  it('rouvrir l’écran hors écriture en vol oublie le brouillon', async () => {
    const store = createTestStore();
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(conviveEditRequested('c2'));
    store.dispatch(renameDraftEdited('Lio'));

    store.dispatch(conviveFormScreenOpened());

    expect(selectConvives(store.getState()).renameDraft).toBe('');
  });
});

function convivesState(overrides: Partial<ConvivesState>): ConvivesState {
  return { ...selectConvives(createTestStore().getState()), ...overrides };
}

function emittingConvives(convives: Convive[]): ObserveConvives {
  return (listener) => {
    listener(convives);
    return () => {};
  };
}

function refusingConvives(error: unknown): ObserveConvives {
  return (_listener, onError) => {
    onError(error);
    return () => {};
  };
}

describe('convives slice — le foyer observé', () => {
  it('une émission du canal remplit le foyer avec les convives émis', () => {
    const convives = twoConvives();
    const store = createTestStore();

    store.dispatch(convivesObserved(convives));

    expect(selectConvives(store.getState()).convives).toEqual(convives);
    expect(selectConvives(store.getState()).received).toBe(true);
    expect(selectConvives(store.getState()).failure).toBeNull();
  });

  it('une émission ultérieure remplace le foyer, elle ne s’y ajoute pas', () => {
    const store = createTestStore();
    store.dispatch(convivesObserved(twoConvives()));

    const frais = [ConviveBuilder.aConvive().withId('c9').withName('Zoé').build()];
    store.dispatch(convivesObserved(frais));

    expect(selectConvives(store.getState()).convives).toEqual(frais);
  });

  it('une émission vide vide le foyer, elle ne laisse pas les convives précédents', () => {
    const store = createTestStore();
    store.dispatch(convivesObserved(twoConvives()));

    store.dispatch(convivesObserved([]));

    expect(selectConvives(store.getState()).convives).toEqual([]);
    expect(selectConvives(store.getState()).received).toBe(true);
  });

  it('une panne ordinaire du canal se constate comme illisible', () => {
    const store = createTestStore();

    store.dispatch(convivesObservationFailed({ unavailable: false }));

    expect(selectConvives(store.getState()).failure).toBe('unreadable');
    expect(selectConvives(store.getState()).received).toBe(false);
  });

  it('une panne du canal sur dépôt injoignable se constate distinctement de l’illisible', () => {
    const store = createTestStore();

    store.dispatch(convivesObservationFailed({ unavailable: true }));

    expect(selectConvives(store.getState()).failure).toBe('unavailable');
    expect(selectConvives(store.getState()).received).toBe(false);
  });

  it('une émission après une panne efface le constat périmé', () => {
    const convives = twoConvives();
    const store = createTestStore();
    store.dispatch(convivesObservationFailed({ unavailable: true }));

    store.dispatch(convivesObserved(convives));

    expect(selectConvives(store.getState()).failure).toBeNull();
    expect(selectConvives(store.getState()).convives).toEqual(convives);
  });

  it('une panne après une émission garde les convives déjà lus', () => {
    const convives = twoConvives();
    const store = createTestStore();
    store.dispatch(convivesObserved(convives));

    store.dispatch(convivesObservationFailed({ unavailable: true }));

    expect(selectConvives(store.getState()).convives).toEqual(convives);
    expect(selectConvives(store.getState()).received).toBe(true);
    expect(selectConvives(store.getState()).failure).toBe('unavailable');
  });

  it('la relance efface le constat et compte une tentative de plus', () => {
    const store = createTestStore();
    store.dispatch(convivesObservationFailed({ unavailable: false }));

    store.dispatch(convivesRetried());

    expect(selectConvives(store.getState()).failure).toBeNull();
    expect(selectConvives(store.getState()).attempt).toBe(1);
    expect(selectConvivesAttempt(store.getState())).toBe(1);
  });

  it('la relance ne jette pas les convives déjà lus', () => {
    const convives = twoConvives();
    const store = createTestStore();
    store.dispatch(convivesObserved(convives));

    store.dispatch(convivesRetried());

    expect(selectConvives(store.getState()).convives).toEqual(convives);
    expect(selectConvives(store.getState()).received).toBe(true);
  });

  it('la déconnexion jette le foyer de la session précédente', () => {
    const store = createTestStore();
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(convivesObservationFailed({ unavailable: true }));
    store.dispatch(convivesRetried());

    store.dispatch(authStateChanged(null));

    expect(selectConvives(store.getState()).convives).toEqual([]);
    expect(selectConvives(store.getState()).received).toBe(false);
    expect(selectConvives(store.getState()).failure).toBeNull();
    expect(selectConvives(store.getState()).attempt).toBe(0);
  });

  it('une session qui s’ouvre ne jette pas ce que le canal vient d’émettre', () => {
    const convives = twoConvives();
    const store = createTestStore();
    store.dispatch(convivesObserved(convives));

    store.dispatch(authStateChanged(AccountBuilder.anAccount().build()));

    expect(selectConvives(store.getState()).convives).toEqual(convives);
    expect(selectConvives(store.getState()).received).toBe(true);
  });
});

describe('observeConvives — l’abonnement branché sur le store', () => {
  it('pousse dans le store les convives émis par le use case injecté', () => {
    const convives = twoConvives();
    const store = createTestStore({ observeConvives: emittingConvives(convives) });

    store.dispatch(observeConvives());

    expect(selectConvives(store.getState()).convives).toEqual(convives);
  });

  it('pousse le constat hors-ligne quand le canal refuse pour dépôt injoignable', () => {
    const store = createTestStore({
      observeConvives: refusingConvives(RepositoryUnavailableError.create()),
    });

    store.dispatch(observeConvives());

    expect(selectConvives(store.getState()).failure).toBe('unavailable');
  });

  it('pousse le constat illisible pour toute autre panne', () => {
    const store = createTestStore({
      observeConvives: refusingConvives(new Error('Firestore down')),
    });

    store.dispatch(observeConvives());

    expect(selectConvives(store.getState()).failure).toBe('unreadable');
  });

  it('rend le désabonnement du use case, et c’est bien celui-là', () => {
    let desabonne = false;
    const observe: ObserveConvives = () => () => {
      desabonne = true;
    };
    const store = createTestStore({ observeConvives: observe });

    const unsubscribe = store.dispatch(observeConvives());
    expect(desabonne).toBe(false);

    unsubscribe();

    expect(desabonne).toBe(true);
  });
});

describe('convivesViewOf', () => {
  it('tant qu’aucune émission n’est arrivée, l’écran est un chargement', () => {
    expect(convivesViewOf(convivesState({}))).toEqual({ status: 'loading' });
  });

  it('tant qu’aucune émission n’est arrivée, une panne illisible donne un constat d’échec', () => {
    expect(convivesViewOf(convivesState({ failure: 'unreadable' }))).toEqual({ status: 'error' });
  });

  it('tant qu’aucune émission n’est arrivée, un dépôt injoignable donne le constat hors-ligne', () => {
    expect(convivesViewOf(convivesState({ failure: 'unavailable' }))).toEqual({
      status: 'unavailable',
    });
  });

  it('une émission arrivée affiche une ligne par convive émis', () => {
    const view = convivesViewOf(convivesState({ convives: twoConvives(), received: true }));

    expect(view.status).toBe('loaded');
    expect(view.status === 'loaded' ? view.convives.map((row) => row.name) : []).toEqual([
      'Aurélie',
      'Lionel',
    ]);
  });

  it('une émission sans aucun convive est un foyer vide, pas une lecture manquante', () => {
    expect(convivesViewOf(convivesState({ convives: [], received: true }))).toEqual({
      status: 'empty',
    });
  });

  it('une panne après émission garde les convives à l’écran, elle ne devient pas un constat d’échec', () => {
    const view = convivesViewOf(
      convivesState({ convives: twoConvives(), received: true, failure: 'unreadable' }),
    );

    expect(view.status).toBe('loaded');
  });

  it('un dépôt injoignable après émission garde les convives à l’écran, il n’annonce pas l’absence de connexion', () => {
    const view = convivesViewOf(
      convivesState({ convives: twoConvives(), received: true, failure: 'unavailable' }),
    );

    expect(view.status).toBe('loaded');
  });

  it('un foyer émis vide reste vide quand une panne survient ensuite', () => {
    expect(
      convivesViewOf(convivesState({ convives: [], received: true, failure: 'unreadable' })),
    ).toEqual({ status: 'empty' });
  });
});

describe('selectConvivesLinkLost', () => {
  it('un store neuf n’a pas de lien perdu : rien n’a encore été observé', () => {
    const store = createTestStore();

    expect(selectConvivesLinkLost(store.getState())).toBe(false);
  });

  it('une panne sans émission n’est pas un lien perdu : l’écran porte déjà le constat en pleine page', () => {
    const store = createTestStore();

    store.dispatch(convivesObservationFailed({ unavailable: false }));

    expect(selectConvivesLinkLost(store.getState())).toBe(false);
  });

  it('une panne après émission est un lien perdu : le foyer reste mais plus rien ne le rafraîchira', () => {
    const store = createTestStore();
    store.dispatch(convivesObserved(twoConvives()));

    store.dispatch(convivesObservationFailed({ unavailable: false }));

    expect(selectConvivesLinkLost(store.getState())).toBe(true);
  });

  it('un dépôt injoignable après émission est un lien perdu au même titre qu’une panne ordinaire', () => {
    const store = createTestStore();
    store.dispatch(convivesObserved(twoConvives()));

    store.dispatch(convivesObservationFailed({ unavailable: true }));

    expect(selectConvivesLinkLost(store.getState())).toBe(true);
  });

  it('une émission qui arrive après la panne rétablit le lien', () => {
    const store = createTestStore();
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(convivesObservationFailed({ unavailable: true }));

    store.dispatch(convivesObserved(twoConvives()));

    expect(selectConvivesLinkLost(store.getState())).toBe(false);
  });

  it('la relance rétablit le lien le temps de la tentative, et une nouvelle panne le reperd', () => {
    const store = createTestStore();
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(convivesObservationFailed({ unavailable: true }));

    store.dispatch(convivesRetried());
    expect(selectConvivesLinkLost(store.getState())).toBe(false);

    store.dispatch(convivesObservationFailed({ unavailable: true }));

    expect(selectConvivesLinkLost(store.getState())).toBe(true);
  });

  it('la déconnexion oublie le lien perdu de la session précédente', () => {
    const store = createTestStore();
    store.dispatch(convivesObserved(twoConvives()));
    store.dispatch(convivesObservationFailed({ unavailable: true }));

    store.dispatch(authStateChanged(null));

    expect(selectConvivesLinkLost(store.getState())).toBe(false);
  });
});
