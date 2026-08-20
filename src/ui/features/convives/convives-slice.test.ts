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

// Identifiants de brouillon DISTINCTS d'un appel à l'autre. Un stub à valeur constante rendrait
// vrai « deux saisies successives portent le même identifiant » — le défaut même qu'on traque.
function sequentialDraftIds(): NewConviveId {
  let count = 0;
  return () => `draft-${(count += 1)}`;
}

// Stub-spy d'ajout : retient l'identifiant sous lequel chaque écriture est partie.
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

  // Le dépôt injoignable n'est ni un succès (foyer vide) ni un échec quelconque : c'est un
  // état à part, sinon l'UI n'a aucun moyen de choisir le bon constat.
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

  // Troisième issue de l'ajout : ni confirmé, ni perdu. La liste ne bouge pas — afficher le
  // convive laisserait croire qu'il est enregistré, alors que la file d'écritures Firestore
  // est en mémoire seulement et ne survit pas à la fermeture de l'onglet.
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

  // Le store est un SINGLETON DE SESSION (main.tsx) : sans remise à zéro, un constat d'ajout
  // survit à la fermeture de la sheet et l'écran finit par se contredire — il affiche le
  // convive dans la liste tout en affirmant que l'ajout n'a pas pu être confirmé, bouton
  // verrouillé jusqu'au rechargement de l'onglet.
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

  // Chemin RÉEL, pas théorique : la sheet démonte le container à la fermeture et le remonte à
  // l'ouverture, ce qui redéclenche `loadConvives`. Un thunk RTK n'est pas annulé par un
  // démontage — fermer puis rouvrir pendant les 5 s de la borne fait donc partir un
  // chargement alors que l'écriture est TOUJOURS en vol. Réarmer le bouton à cet instant
  // rendrait un second appui possible, donc un second id, donc le doublon.
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

  // Après un remontage réel pendant un ajout en vol, le container repart avec un `name` vide
  // (useState frais) : sans mémoire côté store, le constat ne saurait plus de quel ajout il
  // parle. Le prénom doit donc vivre dans le slice, et survivre au rejet.
  it('un ajout non acquitté retient le prénom soumis pour pouvoir le nommer', async () => {
    const unacknowledged: AddConvive = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({ addConvive: unacknowledged });

    await store.dispatch(addConvive({ name: 'Rory' }));

    expect(selectConvives(store.getState()).addSubjectName).toBe('Rory');
  });

  // Même règle que `addStatus`/`addError`, sans exception : un prénom orphelin qui survivrait
  // à un rechargement ferait parler un constat d'un ajout qui n'existe plus.
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

  // DÉCISION, pas effet de bord de la garde générique : ré-entrer dans l'écran repart propre,
  // quelle qu'ait été l'issue de l'ajout précédent. Un échec d'ajout est un constat aussi
  // périmé qu'un ajout non confirmé une fois qu'on recharge le foyer.
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

  // Déclencheur qui ne suppose RIEN du cycle de montage. `AccountSheet` garde son panneau
  // monté pendant les 200 ms de sa transition de sortie : rouvrir avant la fin annule le
  // démontage sans qu'aucun cycle n'ait lieu, et `loadConvives` n'est jamais rejoué.
  // Mesuré : réouverture à 80 ms → pas de remontage ; à 700 ms → remontage.
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

  // La sheet démonte le container à la fermeture ; un thunk RTK n'est PAS annulé pour autant.
  // Fermer pendant un chargement lent puis rouvrir en relance un second : sans garde, le
  // rejet tardif du premier écrase le foyer qui vient de s'afficher.
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
    // Le rejet arrive APRÈS que le chargement courant a abouti : c'est tout l'enjeu.
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

  // Conséquence la plus coûteuse sur l'ajout : un rejet tardif repasserait en `unconfirmed`,
  // ce qui VERROUILLE le bouton « Ajouter » jusqu'à ce que l'utilisateur retape quelque
  // chose — alors même que l'ajout courant vient de réussir.
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

  // Symétrique du rejet tardif, sur l'autre issue — trouvé par un mutant survivant, pas par
  // relecture. Sans garde, le succès tardif d'un ajout abandonné fait DEUX dégâts d'un coup :
  // son convive rejoint une liste que plus rien ne concerne, et `restAddLifecycle` efface le
  // constat de l'ajout COURANT — déverrouillant le bouton alors que l'écriture en cours n'est
  // toujours pas confirmée, ce qui invite le second appui, donc le doublon.
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
    // Le succès tardif arrive APRÈS que l'ajout courant s'est soldé par un non-acquittement.
    slow.resolve(ConviveBuilder.aConvive().withId('c3').withName('Sacha').build());
    await abandoned;

    expect(selectConvives(store.getState()).addStatus).toBe('unconfirmed');
    expect(selectConvives(store.getState()).addSubjectName).toBe('Rory');
    expect(selectConvives(store.getState()).convives.map((c) => c.name)).toEqual([
      'Aurélie',
      'Lionel',
    ]);
  });

  // Les deux thunks ont des cycles de vie SÉPARÉS : une seule mémoire de fraîcheur partagée
  // ferait qu'un rechargement invaliderait l'ajout en vol, et l'écriture réellement partie
  // n'apparaîtrait jamais dans la liste.
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

  // Réciproque exacte du test précédent.
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
    // Le serveur a bien enregistré l'ajout : le chargement lent le rapporte avec le reste.
    slowLoad.resolve([...existing, rory]);
    await load;

    expect(selectConvives(store.getState()).status).toBe('success');
    expect(selectConvives(store.getState()).convives.map((c) => c.name)).toEqual([
      'Aurélie',
      'Lionel',
      'Rory',
    ]);
  });

  // Symétrique du renommage : le VERDICT SUIVANT est le déclencheur garanti de la remise à
  // zéro du constat d'ajout — celui qu'aucun cycle de montage ne conditionne, depuis que la
  // frappe ne joue plus ce rôle.
  it('un nouvel envoi chasse le constat de l’ajout précédent', async () => {
    const unacknowledged: AddConvive = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({ addConvive: unacknowledged });
    await store.dispatch(addConvive({ name: 'Rory' }));
    expect(selectConvives(store.getState()).addStatus).toBe('unconfirmed');

    const renvoi = store.dispatch(addConvive({ name: 'Rory' }));

    expect(selectConvives(store.getState()).addStatus).toBe('adding');
    await renvoi;
  });

  // Et sur le troisième cycle, pour la même raison.
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

  // ─── L'identifiant du brouillon ────────────────────────────────────────────────────

  // Rend le doublon IMPOSSIBLE au lieu de l'empêcher par un verrou : l'écriture vise un
  // document décidé à l'avance, pas un cuid tiré au moment de partir.
  it('écrit l’ajout sous l’identifiant du brouillon courant', async () => {
    const add = recordingAdd(async (input) =>
      ConviveBuilder.aConvive().withId(input.id).withName(input.name).build(),
    );
    const store = createTestStore({ newConviveId: sequentialDraftIds(), addConvive: add.fn });

    await store.dispatch(addConvive({ name: 'Rory' }));

    expect(add.ids).toEqual(['draft-1']);
    expect(selectConvives(store.getState()).convives.map((c) => c.id)).toEqual(['draft-1']);
  });

  // LE point du lot : réappuyer après un non-acquitté réécrit le MÊME document. C'est ce qui
  // autorise à retirer le verrou — il n'y a plus rien à empêcher.
  it('réenvoie un ajout non acquitté sous le MÊME identifiant, sans fabriquer de doublon', async () => {
    const add = recordingAdd(() => Promise.reject(RepositoryUnavailableError.create()));
    const store = createTestStore({ newConviveId: sequentialDraftIds(), addConvive: add.fn });

    await store.dispatch(addConvive({ name: 'Rory' }));
    await store.dispatch(addConvive({ name: 'Rory' }));

    expect(add.ids).toEqual(['draft-1', 'draft-1']);
  });

  // Le pendant indispensable du précédent : un identifiant MÉMORISÉ ferait de la seconde
  // saisie l'écrasement de la première. Deux convives ajoutés à la suite sont deux documents.
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
    // Le store naît avec l'identifiant du premier brouillon : un `initialState` statique ne
    // peut appeler aucun port, c'est la naissance du store qui le pose.
    expect(selectConvives(store.getState()).draftConviveId).toBe('draft-1');

    store.dispatch(conviveFormScreenOpened());

    expect(selectConvives(store.getState()).draftConviveId).toBe('draft-2');
  });

  // Un thunk RTK n'est pas annulé par le démontage : rouvrir la sheet pendant les 5 s de la
  // borne ne doit PAS donner un identifiant neuf, sinon le réenvoi redevient le doublon qu'on
  // vient de rendre impossible.
  it('rouvrir l’écran pendant un ajout en vol garde l’identifiant de l’écriture partie', () => {
    const pendingAdd: AddConvive = () => new Promise<Convive>(() => {});
    const store = createTestStore({ newConviveId: sequentialDraftIds(), addConvive: pendingAdd });
    void store.dispatch(addConvive({ name: 'Rory' }));
    expect(selectConvives(store.getState()).addStatus).toBe('adding');

    store.dispatch(conviveFormScreenOpened());

    expect(selectConvives(store.getState()).draftConviveId).toBe('draft-1');
  });

  // Symétrique du garde de fraîcheur qui protège déjà le constat : un succès dépassé ne doit
  // pas tourner la page du formulaire courant, sinon la saisie en cours change de document
  // en plein vol.
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
    // L'ajout courant a abouti : le brouillon a tourné une fois, et une seule.
    expect(selectConvives(store.getState()).draftConviveId).toBe('draft-2');
    slow.resolve(ConviveBuilder.aConvive().withId('draft-1').withName('Rory').build());
    await abandoned;

    expect(selectConvives(store.getState()).draftConviveId).toBe('draft-2');
  });

  // ─── Renommer (FR-3) ────────────────────────────────────────────────────────────────

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
    // Remplacement EN PLACE : le convive garde son id, la liste garde sa taille.
    expect(selectConvives(store.getState()).convives).toEqual([
      ConviveBuilder.aConvive().withId('c1').withName('Aurélie').build(),
      ConviveBuilder.aConvive().withId('c2').withName('Lio').build(),
    ]);
  });

  // Jeu DISCRIMINANT : un remplacement en place sans retri laisserait ['Aurélie', 'Alix'],
  // c'est-à-dire un foyer qui n'est plus dans l'ordre qu'il affiche depuis le chargement.
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
    // L'édition reste ouverte : c'est la ligne en cours d'écriture qui porte le verrou.
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
    // L'édition reste ouverte : refermer effacerait la saisie de l'utilisateur au moment
    // précis où il doit pouvoir réessayer.
    expect(selectConvives(store.getState()).editingConviveId).toBe('c2');
    expect(selectConvives(store.getState()).convives.map((c) => c.name)).toEqual([
      'Aurélie',
      'Lionel',
    ]);
  });

  // Troisième issue, comme pour l'ajout : ni renommé, ni refusé. La liste ne bouge pas —
  // afficher le nouveau prénom laisserait croire qu'il est enregistré.
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

  // Asymétrie ASSUMÉE avec le retrait : un renommage n'est pas monotone. Appliquer un succès
  // tardif écraserait une valeur plus fraîche par une plus ancienne — le prénom afficherait
  // « Lio » alors que le dernier renommage demandé était « Lionelle ».
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

  // Le constat SURVIT à la frappe : c'est le verdict suivant qui le chasse, jamais la saisie.
  // Un renommage vise un id qui EXISTE déjà, donc rien n'exige de l'utilisateur qu'il tape
  // pour se libérer — il n'y avait rien à libérer.
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
    // L'édition NE se referme PAS : l'utilisateur est en train de taper dedans.
    expect(selectConvives(store.getState()).editingConviveId).toBe('c2');
    expect(selectConvives(store.getState()).renameDraft).toBe('Li');
  });

  // Le VERDICT SUIVANT, lui, chasse le constat : c'est le seul déclencheur qu'aucun cycle de
  // montage ne conditionne, et il ne demande rien d'autre à l'utilisateur que de réessayer.
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

  // Rémanence : le store est un singleton de session. Sans cette remise à zéro, rouvrir la
  // sheet retrouverait une ligne ouverte en édition, avec un constat d'échec périmé, sur un
  // brouillon vide — le container repart avec un `useState` neuf.
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

  // Symétrique de la garde posée sur l'ajout : une écriture en vol ne se déverrouille pas.
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

  // ─── Retirer (FR-3) ─────────────────────────────────────────────────────────────────

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
    // Rien ne prouve encore que l'effacement a eu lieu : le retirer de la liste tout de suite
    // serait affirmer un fait non acquitté, et le convive réapparaîtrait au chargement suivant.
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

    // Le constat courant est « non acquitté » ; le rejet périmé ne doit pas le transformer
    // en « refusé », ce qui armerait une alerte là où il n'y a rien à faire.
    expect(selectConvives(store.getState()).removeStatus).toBe('unconfirmed');
    expect(selectConvives(store.getState()).latestRemoveRequestId).toBe(current.requestId);
  });

  // Asymétrie ASSUMÉE avec le renommage : un retrait est MONOTONE — une fois le convive
  // effacé du serveur, cela ne redevient jamais faux. La liste se corrige donc même sur un
  // succès périmé, alors que le CONSTAT, lui, reste celui du retrait courant.
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
    // La confirmation ouverte porte sur c2 : c'est elle que le succès périmé de c1 ne doit
    // pas refermer.
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

  // La suppression est DÉFINITIVE et sans undo : demander le retrait ne retire rien, ça ouvre
  // une confirmation. Aucun tap unique n'efface une personne.
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

  // ─── Lignes prêtes à afficher ───────────────────────────────────────────────────────

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

  // Renommer vers le prénom déjà porté PAR CE convive n'est pas un renommage : l'écriture
  // partirait pour rien, et hors ligne elle produirait un constat « le renommage de Lionel
  // n'a pas pu être confirmé » pour une opération qui ne changeait rien.
  it('verrouille l’enregistrement quand le brouillon est le prénom actuel du convive', async () => {
    const store = createTestStore({ listConvives: async () => twoConvives() });
    await store.dispatch(loadConvives());
    store.dispatch(conviveEditRequested('c2'));

    // Le brouillon est pré-rempli avec le prénom courant : la ligne s'ouvre donc déjà
    // verrouillée, sans que l'utilisateur ait rien tapé.
    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.saveDisabled).toBe(true);
    // Trimé de la même façon que le domaine : « Lionel » entouré d'espaces reste le même
    // prénom, et `createConvive` le prouverait après coup.
    store.dispatch(renameDraftEdited('  Lionel  '));
    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.saveDisabled).toBe(true);
    // La casse, elle, EST un renommage : « lionel » et « Lionel » ne s'écrivent pas pareil.
    store.dispatch(renameDraftEdited('lionel'));
    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.saveDisabled).toBe(false);
    // Le prénom d'un AUTRE convive reste un renommage valide — les homonymes sont permis.
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
    // Brouillon DIFFÉRENT du prénom courant : sinon le verrou viendrait de l'égalité des
    // prénoms, et ce test ne dirait plus rien du verrou dû à l'écriture en vol.
    store.dispatch(renameDraftEdited('Lio'));
    void store.dispatch(renameConvive({ id: 'c2', name: 'Lio' }));

    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.saveDisabled).toBe(true);
    // Le CHAMP, lui, se verrouille pendant l'écriture seulement.
    expect(conviveRowsOf(selectConvives(store.getState()))[1]?.editInputDisabled).toBe(true);
  });

  // Le verrou tient le temps de l'écriture, et rien de plus : dès qu'un verdict tombe — même
  // « on ne sait pas » —, les DEUX se réarment. Un second envoi vise le même id : il réécrit,
  // il ne duplique pas.
  it('après un renommage non acquitté, le bouton et le champ se réarment tous les deux', async () => {
    const unacknowledged: RenameConvive = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      renameConvive: unacknowledged,
    });
    await store.dispatch(loadConvives());
    store.dispatch(conviveEditRequested('c2'));
    // Brouillon DIFFÉRENT du prénom courant, même raison : c'est le non-acquittement qui
    // doit verrouiller ici, pas l'absence de changement.
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
    // Message sobre, sans le détail technique : « Firestore indisponible » ne veut rien dire
    // pour l'utilisateur.
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

    // ANCIEN prénom : c'est celui que la ligne affiche, et le renommage n'a rien changé.
    // Élision française par la même fonction que l'ajout : « d’Aurélie », pas « de Aurélie ».
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

  // ─── Filets posés en réponse à des mutants survivants (run isolé) ───────────────────

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

    // Sans cet effacement, la ligne d'Aurélie s'ouvrirait en portant le constat du renommage
    // de Lionel — et son bouton « Enregistrer » naîtrait verrouillé.
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

    // Déplacer l'édition déverrouillerait la ligne en cours d'écriture : un second envoi
    // deviendrait possible pendant les 5 s de la borne d'acquittement.
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

  // L'autre compte du board a supprimé le convive pendant que celui-ci le renommait, et le
  // rechargement l'a fait disparaître de la liste. Le succès du renommage ne doit RESSUSCITER
  // personne : le domaine a rejeté, mais si le rejet arrive après coup, la liste fait foi.
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
    // Le bouton « Retirer » n'est verrouillé QUE pendant l'écriture : sinon la confirmation
    // s'ouvrirait déjà morte.
    expect(row?.confirmDisabled).toBe(false);
  });

  // ─── Verrou des autres lignes tant qu'un cycle n'est pas au repos ───────────────────

  it('laisse toutes les lignes actionnables quand les deux cycles sont au repos', async () => {
    const store = createTestStore({ listConvives: async () => twoConvives() });
    await store.dispatch(loadConvives());

    // Jeu DISCRIMINANT : un verrou posé sans condition figerait l'écran en permanence.
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

    // La ligne en écriture n'est pas « au repos » : ce sont les AUTRES qu'on fige, pour que
    // le `useState` du brouillon ne puisse pas diverger de la ligne que le store tient.
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

    // Le constat est bien LÀ — sans quoi ce test ne dirait rien du verrou qu'il nie.
    expect(selectConvives(store.getState()).renameStatus).toBe('unconfirmed');
    // Et il ne retient personne : l'utilisateur va ailleurs sans avoir à taper quoi que ce soit.
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

  // ─── Le brouillon vit dans le store, pas dans le container ──────────────────────────

  // Racine des défauts de cette feature : un état d'UI hors du store. Le container repart
  // d'un `useState` vide à chaque montage, le store non — et les deux divergent.
  it('ouvrir l’édition pré-remplit le brouillon avec le prénom courant', async () => {
    const store = createTestStore({ listConvives: async () => twoConvives() });
    await store.dispatch(loadConvives());

    store.dispatch(conviveEditRequested('c2'));

    // Corriger une faute de frappe est le cas courant : on repart du prénom affiché.
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

  // La contrepartie de la garde « une écriture en vol ne se déverrouille pas » : le
  // brouillon doit survivre au rechargement déclenché par une réouverture de la sheet,
  // exactement comme l'édition qu'il accompagne.
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
