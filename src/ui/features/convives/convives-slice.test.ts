import { describe, it, expect } from 'vitest';

import { type Convive } from '../../../domain/entities/convive';
import { type AddConvive } from '../../../domain/use-cases/add-convive';
import { type ListConvives } from '../../../domain/use-cases/list-convives';
import { ConviveBuilder } from '../../../domain/test-builders/convive.builder';
import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { createTestStore } from '../../store/create-test-store';
import { deferred } from '../../test-utils/deferred';
import { addConvive, conviveNameEdited, loadConvives, selectConvives } from './convives-slice';

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
      latestLoadRequestId: null,
      addStatus: 'idle',
      addError: null,
      addSubjectName: null,
      latestAddRequestId: null,
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
      latestAddRequestId: null,
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
      latestAddRequestId: null,
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
      latestAddRequestId: null,
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
    const loaded = await store.dispatch(loadConvives());

    const added = await store.dispatch(addConvive({ name: 'Rory' }));

    expect(captured.input).toEqual({ name: 'Rory' });
    expect(selectConvives(store.getState())).toEqual({
      status: 'success',
      convives: [...existing, ConviveBuilder.aConvive().withId('c3').withName('Rory').build()],
      error: null,
      latestLoadRequestId: loaded.meta.requestId,
      addStatus: 'idle',
      addError: null,
      addSubjectName: null,
      latestAddRequestId: added.meta.requestId,
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
      latestAddRequestId: failed.meta.requestId,
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
      latestAddRequestId: inFlight.requestId,
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
      latestAddRequestId: null,
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
      latestAddRequestId: unacked.meta.requestId,
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

  it('saisir un prénom oublie le prénom soumis avec le reste du cycle de vie', async () => {
    const unacknowledged: AddConvive = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({ addConvive: unacknowledged });
    await store.dispatch(addConvive({ name: 'Rory' }));

    store.dispatch(conviveNameEdited());

    expect(selectConvives(store.getState()).addSubjectName).toBeNull();
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
  it('saisir un prénom remet le cycle de vie de l’ajout au repos', async () => {
    const unacknowledged: AddConvive = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({
      listConvives: async () => twoConvives(),
      addConvive: unacknowledged,
    });
    await store.dispatch(loadConvives());
    await store.dispatch(addConvive({ name: 'Rory' }));
    expect(selectConvives(store.getState()).addStatus).toBe('unconfirmed');

    store.dispatch(conviveNameEdited());

    expect(selectConvives(store.getState()).addStatus).toBe('idle');
    expect(selectConvives(store.getState()).addError).toBeNull();
  });

  // Symétrique de la condition posée sur `loadConvives.pending`, pour la même raison : une
  // écriture en vol ne se déverrouille pas. Taper pendant les 5 s de la borne ne doit rien
  // débloquer, sinon un second appui produit un second id, donc le doublon.
  it('saisir un prénom pendant un ajout en vol ne déverrouille rien', () => {
    const pendingAdd: AddConvive = () => new Promise<Convive>(() => {});
    const store = createTestStore({ addConvive: pendingAdd });
    void store.dispatch(addConvive({ name: 'Rory' }));
    expect(selectConvives(store.getState()).addStatus).toBe('adding');

    store.dispatch(conviveNameEdited());

    expect(selectConvives(store.getState()).addStatus).toBe('adding');
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
      latestAddRequestId: retried.meta.requestId,
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
      latestAddRequestId: null,
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
});
