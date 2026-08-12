import { describe, it, expect } from 'vitest';

import { type Convive } from '../../../domain/entities/convive';
import { type AddConvive } from '../../../domain/use-cases/add-convive';
import { type ListConvives } from '../../../domain/use-cases/list-convives';
import { ConviveBuilder } from '../../../domain/test-builders/convive.builder';
import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { createTestStore } from '../../store/create-test-store';
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
      addStatus: 'idle',
      addError: null,
      addSubjectName: null,
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
      addSubjectName: null,
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
      addSubjectName: null,
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
      addSubjectName: null,
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
      addSubjectName: null,
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
      addSubjectName: 'Rory',
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
      addSubjectName: 'Rory',
    });
  });

  // Le dépôt injoignable n'est ni un succès (foyer vide) ni un échec quelconque : c'est un
  // état à part, sinon l'UI n'a aucun moyen de choisir le bon constat.
  it('un chargement empêché par un dépôt injoignable prend un status distinct de error', async () => {
    const unavailable: ListConvives = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({ listConvives: unavailable });

    await store.dispatch(loadConvives());

    expect(selectConvives(store.getState())).toEqual({
      status: 'unavailable',
      convives: [],
      error: null,
      addStatus: 'idle',
      addError: null,
      addSubjectName: null,
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
    await store.dispatch(loadConvives());

    await store.dispatch(addConvive({ name: 'Rory' }));

    expect(selectConvives(store.getState())).toEqual({
      status: 'success',
      convives: existing,
      error: null,
      addStatus: 'unconfirmed',
      addError: null,
      addSubjectName: 'Rory',
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
      addSubjectName: null,
    });
  });
});
