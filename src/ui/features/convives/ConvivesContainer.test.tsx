import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { type Convive } from '../../../domain/entities/convive';
import { type AddConvive, type AddConviveInput } from '../../../domain/use-cases/add-convive';
import { type ListConvives } from '../../../domain/use-cases/list-convives';
import {
  type RemoveConvive,
  type RemoveConviveInput,
} from '../../../domain/use-cases/remove-convive';
import {
  type RenameConvive,
  type RenameConviveInput,
} from '../../../domain/use-cases/rename-convive';
import { ConviveBuilder } from '../../../domain/test-builders/convive.builder';
import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { type AppDependencies } from '../../store/store';
import { createTestStore } from '../../store/create-test-store';
import { ConvivesContainer } from './ConvivesContainer';

function renderWithStore(overrides?: Partial<AppDependencies>) {
  const store = createTestStore(overrides);
  return { store, ...renderWith(store) };
}

// Monte le container sur un store DONNÉ. Indispensable pour rejouer une fermeture puis une
// réouverture de la sheet : en prod le store est un singleton de session (main.tsx), seul le
// container est démonté. Un test qui recréerait le store ne reproduirait rien.
function renderWith(store: ReturnType<typeof createTestStore>) {
  return render(
    <Provider store={store}>
      <ConvivesContainer />
    </Provider>,
  );
}

// Stub-spy : compte les appels et renvoie les convives fournis.
function spyReturning(convives: Convive[]): { fn: ListConvives; callCount: () => number } {
  let count = 0;
  const fn: ListConvives = async () => {
    count += 1;
    return convives;
  };
  return { fn, callCount: () => count };
}

// Stub-spy d'ajout : capture l'input reçu par le use case et renvoie le convive créé.
function capturingAdd(): { fn: AddConvive; captured: () => AddConviveInput | undefined } {
  let captured: AddConviveInput | undefined;
  const fn: AddConvive = async (input) => {
    captured = input;
    return ConviveBuilder.aConvive().withId(input.id).withName(input.name).build();
  };
  return { fn, captured: () => captured };
}

function twoConvives(): Convive[] {
  return [
    ConviveBuilder.aConvive().withId('c-1').withName('Aurélie').build(),
    ConviveBuilder.aConvive().withId('c-2').withName('Lionel').build(),
  ];
}

describe('ConvivesContainer', () => {
  it('charge les convives au montage et affiche les prénoms dans l’ordre renvoyé par le use case', async () => {
    const spy = spyReturning([
      ConviveBuilder.aConvive().withId('c-1').withName('Aurélie').build(),
      ConviveBuilder.aConvive().withId('c-2').withName('Lionel').build(),
    ]);
    renderWithStore({ listConvives: spy.fn });

    expect(await screen.findByText('Aurélie')).toBeInTheDocument();
    expect(spy.callCount()).toBe(1);

    const names = screen
      .getAllByRole('listitem')
      .map((item) => within(item).getByTestId('convive-name').textContent);
    expect(names).toEqual(['Aurélie', 'Lionel']);
  });

  it('affiche un indicateur de chargement tant que le use case n’a pas résolu', () => {
    const pending: ListConvives = () => new Promise<Convive[]>(() => {});
    renderWithStore({ listConvives: pending });

    expect(screen.getByRole('status')).toHaveTextContent('Chargement…');
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('affiche un constat quand le foyer ne compte encore aucun convive', async () => {
    renderWithStore({ listConvives: spyReturning([]).fn });

    expect(await screen.findByText('Personne dans le foyer pour le moment.')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('affiche un message sobre en erreur, sans le détail technique, et recharge au réessai', async () => {
    const user = userEvent.setup();
    let count = 0;
    const failThenSucceed: ListConvives = async () => {
      count += 1;
      if (count === 1) throw new Error('Firestore indisponible');
      return [ConviveBuilder.aConvive().withId('c-1').withName('Aurélie').build()];
    };
    renderWithStore({ listConvives: failThenSucceed });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible de charger les convives.',
    );
    expect(screen.queryByText(/Firestore/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /réessayer/i }));

    expect(await screen.findByText('Aurélie')).toBeInTheDocument();
    expect(count).toBe(2);
  });

  // Le mensonge constaté en conditions réelles : réseau coupé, l'app affichait
  // « Personne dans le foyer pour le moment. » L'utilisateur re-saisit ses convives et
  // récolte des doublons au retour du réseau.
  it('hors ligne, l’app dit qu’elle n’a pas pu charger le foyer — jamais qu’il est vide', async () => {
    const offline: ListConvives = () => Promise.reject(RepositoryUnavailableError.create());
    renderWithStore({ listConvives: offline });

    expect(
      await screen.findByText('Aucune connexion — le foyer n’a pas pu être chargé.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Personne dans le foyer pour le moment.')).not.toBeInTheDocument();
    expect(screen.queryByText('Impossible de charger les convives.')).not.toBeInTheDocument();
  });

  // Deux constats, deux actions : un échec de chargement se réessaie, une absence de réseau
  // ne se réessaie pas — le bouton ne ferait que rejouer le même échec.
  // (`EXPERIENCE.md` : « Aucune connexion — … » ✅ n'offre aucune action ; c'est
  // « Erreur réseau ! Réessayer ? » qui est proscrit.)
  it('le constat hors-ligne ne propose pas « Réessayer », contrairement à l’échec de chargement', async () => {
    const offline: ListConvives = () => Promise.reject(RepositoryUnavailableError.create());
    renderWithStore({ listConvives: offline });
    await screen.findByText('Aucune connexion — le foyer n’a pas pu être chargé.');

    expect(screen.queryByRole('button', { name: /réessayer/i })).not.toBeInTheDocument();
  });

  // Filet sur la couche de RENDU : stryker ne mute pas les .tsx, `ConvivesSection.tsx` n'a
  // donc aucun mutant pour attraper une fusion des états `error` et `unavailable`. Un
  // constat sur lequel rien n'est attendu de l'utilisateur s'annonce poliment ; `alert` est
  // assertif et interrompt le lecteur d'écran.
  it('le constat hors-ligne est annoncé poliment, jamais comme une alerte', async () => {
    const offline: ListConvives = () => Promise.reject(RepositoryUnavailableError.create());
    renderWithStore({ listConvives: offline });
    await screen.findByText('Aucune connexion — le foyer n’a pas pu être chargé.');

    expect(screen.getByRole('status')).toHaveTextContent(
      'Aucune connexion — le foyer n’a pas pu être chargé.',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // Proposer d'ajouter alors qu'on n'a pas pu lire le foyer invite exactement la re-saisie
  // qui produit les doublons. Tient par construction du switch — donc protégé par rien.
  it('l’état hors-ligne n’expose pas le formulaire d’ajout', async () => {
    const offline: ListConvives = () => Promise.reject(RepositoryUnavailableError.create());
    renderWithStore({ listConvives: offline });
    await screen.findByText('Aucune connexion — le foyer n’a pas pu être chargé.');

    expect(screen.queryByLabelText(/prénom/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ajouter/i })).not.toBeInTheDocument();
  });

  it('ajoute le prénom saisi : le use case reçoit ce prénom et le convive rejoint la liste affichée', async () => {
    const user = userEvent.setup();
    const add = capturingAdd();
    renderWithStore({
      listConvives: spyReturning([
        ConviveBuilder.aConvive().withId('c-1').withName('Aurélie').build(),
      ]).fn,
      addConvive: add.fn,
    });
    await screen.findByText('Aurélie');

    await user.type(screen.getByLabelText(/prénom/i), 'Rory');
    await user.click(screen.getByRole('button', { name: /ajouter/i }));

    expect(await screen.findByText('Rory')).toBeInTheDocument();
    expect(add.captured()).toEqual({ id: 'generated-id-1', name: 'Rory' });
    const names = screen
      .getAllByRole('listitem')
      .map((item) => within(item).getByTestId('convive-name').textContent);
    expect(names).toEqual(['Aurélie', 'Rory']);
  });

  // Filet sur la couche de RENDU : stryker.conf.mjs ne mute que `src/ui/features/**/*.ts`,
  // donc ConvivesContainer.tsx n'a aucun mutant pour l'attraper. Ce test est le seul à
  // verrouiller l'ordre tel qu'il arrive à l'écran.
  it('affiche le convive ajouté à sa place alphabétique dans la liste rendue, pas en fin de liste', async () => {
    const user = userEvent.setup();
    renderWithStore({
      listConvives: spyReturning([
        ConviveBuilder.aConvive().withId('c-1').withName('Emma').build(),
        ConviveBuilder.aConvive().withId('c-2').withName('Zoé').build(),
      ]).fn,
      addConvive: capturingAdd().fn,
    });
    await screen.findByText('Emma');

    await user.type(screen.getByLabelText(/prénom/i), 'Élise');
    await user.click(screen.getByRole('button', { name: /ajouter/i }));

    expect(await screen.findByText('Élise')).toBeInTheDocument();
    // Jeu DISCRIMINANT : un rendu qui ajouterait en fin de liste donnerait
    // ['Emma', 'Zoé', 'Élise'], un réordonnancement par code-point aussi (É=201 > Z=90).
    expect(
      screen
        .getAllByRole('listitem')
        .map((item) => within(item).getByTestId('convive-name').textContent),
    ).toEqual(['Élise', 'Emma', 'Zoé']);
  });

  it('désactive « Ajouter » tant que le champ prénom est vide, sans message d’erreur', async () => {
    renderWithStore({ listConvives: spyReturning([]).fn });
    await screen.findByText('Personne dans le foyer pour le moment.');

    expect(screen.getByRole('button', { name: /ajouter/i })).toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('garde « Ajouter » désactivé quand le champ ne contient que des espaces', async () => {
    const user = userEvent.setup();
    renderWithStore({ listConvives: spyReturning([]).fn });
    await screen.findByText('Personne dans le foyer pour le moment.');

    await user.type(screen.getByLabelText(/prénom/i), '   ');

    expect(screen.getByRole('button', { name: /ajouter/i })).toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('vide le champ prénom après un ajout réussi', async () => {
    const user = userEvent.setup();
    renderWithStore({
      listConvives: spyReturning([]).fn,
      addConvive: capturingAdd().fn,
    });
    await screen.findByText('Personne dans le foyer pour le moment.');

    await user.type(screen.getByLabelText(/prénom/i), 'Rory');
    await user.click(screen.getByRole('button', { name: /ajouter/i }));

    expect(await screen.findByText('Rory')).toBeInTheDocument();
    expect(screen.getByLabelText(/prénom/i)).toHaveValue('');
  });

  it('un ajout en échec conserve le prénom saisi et affiche un message sobre, sans le détail technique', async () => {
    const user = userEvent.setup();
    const failingAdd: AddConvive = () => Promise.reject(new Error('Firestore indisponible'));
    renderWithStore({
      listConvives: spyReturning([
        ConviveBuilder.aConvive().withId('c-1').withName('Aurélie').build(),
      ]).fn,
      addConvive: failingAdd,
    });
    await screen.findByText('Aurélie');

    await user.type(screen.getByLabelText(/prénom/i), 'Rory');
    await user.click(screen.getByRole('button', { name: /ajouter/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible d’ajouter le convive.');
    expect(screen.getByLabelText(/prénom/i)).toHaveValue('Rory');
    expect(screen.queryByText(/Firestore/i)).not.toBeInTheDocument();
    const names = screen
      .getAllByRole('listitem')
      .map((item) => within(item).getByTestId('convive-name').textContent);
    expect(names).toEqual(['Aurélie']);
  });

  // Sans persistance Firestore (OQ-10 non tranchée), la file d'écritures vit en mémoire
  // seulement : promettre « ce sera synchronisé » serait un nouveau mensonge. Le message
  // dit le défaut de confirmation, pas un échec — et reste vrai que l'écriture parte
  // ensuite ou non. Il évite aussi le mot « personne », déjà employé au même endroit de la
  // sheet par l'état vide, où il est une négation.
  it('une écriture non acquittée le dit sans prétendre que le convive est enregistré', async () => {
    const user = userEvent.setup();
    const unacknowledged: AddConvive = () => Promise.reject(RepositoryUnavailableError.create());
    renderWithStore({
      listConvives: spyReturning([
        ConviveBuilder.aConvive().withId('c-1').withName('Aurélie').build(),
      ]).fn,
      addConvive: unacknowledged,
    });
    await screen.findByText('Aurélie');

    await user.type(screen.getByLabelText(/prénom/i), 'Rory');
    await user.click(screen.getByRole('button', { name: /ajouter/i }));

    expect(
      await screen.findByText('Aucune connexion — l’ajout de Rory n’a pas pu être confirmé.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Impossible d’ajouter le convive.')).not.toBeInTheDocument();
    expect(
      screen
        .getAllByRole('listitem')
        .map((item) => within(item).getByTestId('convive-name').textContent),
    ).toEqual(['Aurélie']);
  });

  // Même filet côté ajout : `unconfirmed` verrouille le bouton, rien n'est attendu de
  // l'utilisateur — le ton assertif de `alert`, réservé à l'échec réessayable, serait faux.
  it('le constat d’ajout non confirmé est annoncé poliment, jamais comme une alerte', async () => {
    const user = userEvent.setup();
    const unacknowledged: AddConvive = () => Promise.reject(RepositoryUnavailableError.create());
    renderWithStore({
      listConvives: spyReturning([
        ConviveBuilder.aConvive().withId('c-1').withName('Aurélie').build(),
      ]).fn,
      addConvive: unacknowledged,
    });
    await screen.findByText('Aurélie');

    await user.type(screen.getByLabelText(/prénom/i), 'Rory');
    await user.click(screen.getByRole('button', { name: /ajouter/i }));
    await screen.findByText('Aucune connexion — l’ajout de Rory n’a pas pu être confirmé.');

    expect(screen.getByRole('status')).toHaveTextContent(
      'Aucune connexion — l’ajout de Rory n’a pas pu être confirmé.',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // L'écriture est réellement partie : elle atterrira au retour du réseau. Ré-armer
  // « Ajouter » inviterait un second appui, donc un second id cuid2, donc le doublon que
  // toute cette passe cherche à éviter.
  // Le verrou tient le temps de l'écriture, et rien de plus. Un ajout non acquitté est parti
  // avec l'identifiant du brouillon : un second appui le RÉÉCRIT au même endroit, il ne peut
  // pas dupliquer. Rien ne justifie donc de figer l'écran, ni le bouton ni le champ.
  it('après une écriture non acquittée, « Ajouter » se réarme et le prénom saisi est conservé', async () => {
    const user = userEvent.setup();
    const unacknowledged: AddConvive = () => Promise.reject(RepositoryUnavailableError.create());
    renderWithStore({
      listConvives: spyReturning([]).fn,
      addConvive: unacknowledged,
    });
    await screen.findByText('Personne dans le foyer pour le moment.');

    await user.type(screen.getByLabelText(/prénom/i), 'Rory');
    await user.click(screen.getByRole('button', { name: /ajouter/i }));

    await screen.findByText('Aucune connexion — l’ajout de Rory n’a pas pu être confirmé.');
    expect(screen.getByRole('button', { name: /ajouter/i })).toBeEnabled();
    expect(screen.getByLabelText(/prénom/i)).toBeEnabled();
    expect(screen.getByLabelText(/prénom/i)).toHaveValue('Rory');
  });

  // Le constat doit être auto-attribué : après un remontage pendant un ajout en vol, le
  // container repart avec un champ vide et un message impersonnel ne dirait plus de quel
  // ajout il parle. Le prénom réel évite aussi la collision de lecture avec « Personne dans
  // le foyer… », qui nous avait fait écarter « ce convive ».
  it('le constat d’ajout non confirmé nomme le convive, élidé quand le prénom l’exige', async () => {
    const user = userEvent.setup();
    const unacknowledged: AddConvive = () => Promise.reject(RepositoryUnavailableError.create());
    renderWithStore({ listConvives: spyReturning([]).fn, addConvive: unacknowledged });
    await screen.findByText('Personne dans le foyer pour le moment.');

    await user.type(screen.getByLabelText(/prénom/i), 'Aurélie');
    await user.click(screen.getByRole('button', { name: /ajouter/i }));

    expect(
      await screen.findByText('Aucune connexion — l’ajout d’Aurélie n’a pas pu être confirmé.'),
    ).toBeInTheDocument();
  });

  it('le constat d’ajout non confirmé n’élide pas devant une consonne', async () => {
    const user = userEvent.setup();
    const unacknowledged: AddConvive = () => Promise.reject(RepositoryUnavailableError.create());
    renderWithStore({ listConvives: spyReturning([]).fn, addConvive: unacknowledged });
    await screen.findByText('Personne dans le foyer pour le moment.');

    await user.type(screen.getByLabelText(/prénom/i), 'Rory');
    await user.click(screen.getByRole('button', { name: /ajouter/i }));

    expect(
      await screen.findByText('Aucune connexion — l’ajout de Rory n’a pas pu être confirmé.'),
    ).toBeInTheDocument();
  });

  // Sans ce verrou, une saisie préparée pendant l'attente est effacée sans un mot par le
  // `setName('')` de l'ajout qui aboutit. La fenêtre va jusqu'à 5 s, et taper pendant le
  // verrouillage est un geste désormais explicitement encouragé.
  it('le champ prénom est verrouillé pendant un ajout en vol', async () => {
    const user = userEvent.setup();
    const neverResolvingAdd: AddConvive = () => new Promise<Convive>(() => {});
    renderWithStore({ listConvives: spyReturning([]).fn, addConvive: neverResolvingAdd });
    await screen.findByText('Personne dans le foyer pour le moment.');

    await user.type(screen.getByLabelText(/prénom/i), 'Rory');
    await user.click(screen.getByRole('button', { name: /ajouter/i }));

    expect(screen.getByLabelText(/prénom/i)).toBeDisabled();
  });

  // Reproduit la contradiction observée en conditions réelles : réseau coupé puis rétabli,
  // sheet fermée puis rouverte, l'écran affichait le convive dans la liste ET « l'ajout n'a
  // pas pu être confirmé », bouton verrouillé pour le reste de la session.
  it('rouvrir la sheet efface le constat d’ajout et rend le formulaire de nouveau utilisable', async () => {
    const user = userEvent.setup();
    const unacknowledged: AddConvive = () => Promise.reject(RepositoryUnavailableError.create());
    const store = createTestStore({
      listConvives: spyReturning([
        ConviveBuilder.aConvive().withId('c-1').withName('Aurélie').build(),
      ]).fn,
      addConvive: unacknowledged,
    });
    const sheet = renderWith(store);
    await screen.findByText('Aurélie');
    await user.type(screen.getByLabelText(/prénom/i), 'Rory');
    await user.click(screen.getByRole('button', { name: /ajouter/i }));
    await screen.findByText('Aucune connexion — l’ajout de Rory n’a pas pu être confirmé.');

    // Fermeture puis réouverture de la sheet : le container est démonté, le store survit.
    sheet.unmount();
    renderWith(store);

    expect(await screen.findByText('Aurélie')).toBeInTheDocument();
    expect(
      screen.queryByText('Aucune connexion — l’ajout de Rory n’a pas pu être confirmé.'),
    ).not.toBeInTheDocument();
    // Le champ repart vide, donc le bouton est désactivé pour CETTE raison-là ; saisir un
    // prénom prouve qu'il redevient actionnable, ce que le verrou de session interdisait.
    await user.type(screen.getByLabelText(/prénom/i), 'Rory');
    expect(screen.getByRole('button', { name: /ajouter/i })).toBeEnabled();
  });

  // Remplace la frappe comme sortie de l'état non-nominal : ce n'est plus l'utilisateur qui
  // doit retaper pour se libérer, c'est le second appui qui vise le MÊME document.
  it('un second appui après un ajout non confirmé réécrit le même convive, sans doublon', async () => {
    const user = userEvent.setup();
    const ids: string[] = [];
    const unacknowledged: AddConvive = (input) => {
      ids.push(input.id);
      return Promise.reject(RepositoryUnavailableError.create());
    };
    renderWithStore({ listConvives: spyReturning([]).fn, addConvive: unacknowledged });
    await screen.findByText('Personne dans le foyer pour le moment.');
    await user.type(screen.getByLabelText(/prénom/i), 'Rory');
    await user.click(screen.getByRole('button', { name: /ajouter/i }));
    await screen.findByText(/n’a pas pu être confirmé/);

    await user.click(screen.getByRole('button', { name: /ajouter/i }));

    await waitFor(() => expect(ids).toHaveLength(2));
    // Valeurs LITTÉRALES, pas `ids[0] === ids[1]` : deux `undefined` seraient égaux, et le
    // test serait vert sur une écriture sans identifiant du tout.
    expect(ids).toEqual(['generated-id-1', 'generated-id-1']);
  });

  // Le pendant du précédent, et la preuve que le container réclame bien un formulaire neuf au
  // remontage : sans lui, le convive suivant écraserait celui que la saisie précédente visait.
  it('rouvrir la sheet vise un convive NEUF : la saisie suivante n’écrase pas la précédente', async () => {
    const user = userEvent.setup();
    const ids: string[] = [];
    const unacknowledged: AddConvive = (input) => {
      ids.push(input.id);
      return Promise.reject(RepositoryUnavailableError.create());
    };
    let count = 0;
    const store = createTestStore({
      listConvives: spyReturning([]).fn,
      addConvive: unacknowledged,
      newConviveId: () => `draft-${(count += 1)}`,
    });
    const sheet = renderWith(store);
    await screen.findByText('Personne dans le foyer pour le moment.');
    await user.type(screen.getByLabelText(/prénom/i), 'Rory');
    await user.click(screen.getByRole('button', { name: /ajouter/i }));
    await screen.findByText(/n’a pas pu être confirmé/);

    sheet.unmount();
    renderWith(store);
    await screen.findByText('Personne dans le foyer pour le moment.');
    await user.type(screen.getByLabelText(/prénom/i), 'Zoé');
    await user.click(screen.getByRole('button', { name: /ajouter/i }));

    await waitFor(() => expect(ids).toHaveLength(2));
    // Décalé d'un cran, comme la création de recette : `draft-1` est celui que la naissance du
    // store pose, et le premier montage du container en réclame déjà un neuf. Ce qui compte est
    // que les deux saisies visent DEUX documents.
    expect(ids).toEqual(['draft-2', 'draft-3']);
  });

  it('pendant un ajout en vol, « Ajouter » est désactivé : un second appui n’ajoute pas un doublon', async () => {
    const user = userEvent.setup();
    let callCount = 0;
    const neverResolvingAdd: AddConvive = () => {
      callCount += 1;
      return new Promise<Convive>(() => {});
    };
    renderWithStore({
      listConvives: spyReturning([]).fn,
      addConvive: neverResolvingAdd,
    });
    await screen.findByText('Personne dans le foyer pour le moment.');

    await user.type(screen.getByLabelText(/prénom/i), 'Rory');
    await user.click(screen.getByRole('button', { name: /ajouter/i }));

    expect(screen.getByRole('button', { name: /ajouter/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /ajouter/i }));

    expect(callCount).toBe(1);
  });

  // ─── Renommer et retirer (FR-3) ─────────────────────────────────────────────────────

  it('offre à chaque convive de quoi le renommer et de quoi le retirer', async () => {
    renderWithStore({ listConvives: spyReturning(twoConvives()).fn });
    await screen.findByText('Aurélie');

    expect(screen.getByRole('button', { name: 'Renommer Aurélie' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retirer Aurélie' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Renommer Lionel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retirer Lionel' })).toBeInTheDocument();
  });

  it('renommer ouvre un champ pré-rempli avec le prénom actuel, sur cette ligne seulement', async () => {
    const user = userEvent.setup();
    renderWithStore({ listConvives: spyReturning(twoConvives()).fn });
    await screen.findByText('Aurélie');

    await user.click(screen.getByRole('button', { name: 'Renommer Lionel' }));

    // Pré-rempli : l'utilisateur corrige une faute de frappe bien plus souvent qu'il ne
    // ressaisit un prénom entier.
    expect(screen.getByLabelText('Nouveau prénom pour Lionel')).toHaveValue('Lionel');
    expect(screen.queryByLabelText('Nouveau prénom pour Aurélie')).not.toBeInTheDocument();
  });

  it('enregistrer appelle le use case avec l’id et le nouveau prénom, et la ligne affiche le résultat', async () => {
    const user = userEvent.setup();
    const captured: { input: RenameConviveInput | undefined } = { input: undefined };
    const renameConviveUseCase: RenameConvive = async (input) => {
      captured.input = input;
      return ConviveBuilder.aConvive().withId(input.id).withName(input.name).build();
    };
    renderWithStore({
      listConvives: spyReturning(twoConvives()).fn,
      renameConvive: renameConviveUseCase,
    });
    await screen.findByText('Aurélie');
    await user.click(screen.getByRole('button', { name: 'Renommer Lionel' }));

    await user.clear(screen.getByLabelText('Nouveau prénom pour Lionel'));
    await user.type(screen.getByLabelText('Nouveau prénom pour Lionel'), 'Lio');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(captured.input).toEqual({ id: 'c-2', name: 'Lio' });
    expect(await screen.findByText('Lio')).toBeInTheDocument();
    expect(screen.queryByText('Lionel')).not.toBeInTheDocument();
    // L'édition se referme d'elle-même : la ligne redevient une ligne.
    expect(screen.queryByRole('textbox', { name: /nouveau prénom/i })).not.toBeInTheDocument();
  });

  it('annuler un renommage referme l’édition sans rien appeler', async () => {
    const user = userEvent.setup();
    let called = 0;
    const renameConviveUseCase: RenameConvive = async (input) => {
      called += 1;
      return ConviveBuilder.aConvive().withId(input.id).withName(input.name).build();
    };
    renderWithStore({
      listConvives: spyReturning(twoConvives()).fn,
      renameConvive: renameConviveUseCase,
    });
    await screen.findByText('Aurélie');
    await user.click(screen.getByRole('button', { name: 'Renommer Lionel' }));

    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(called).toBe(0);
    expect(screen.queryByLabelText('Nouveau prénom pour Lionel')).not.toBeInTheDocument();
    expect(screen.getByText('Lionel')).toBeInTheDocument();
  });

  // La suppression est DÉFINITIVE et sans undo : le prénom est perdu. Un tap unique ne peut
  // pas effacer une personne.
  it('retirer demande confirmation : personne n’est effacé au premier appui', async () => {
    const user = userEvent.setup();
    let called = 0;
    const removeConviveUseCase: RemoveConvive = async () => {
      called += 1;
    };
    renderWithStore({
      listConvives: spyReturning(twoConvives()).fn,
      removeConvive: removeConviveUseCase,
    });
    await screen.findByText('Aurélie');

    await user.click(screen.getByRole('button', { name: 'Retirer Lionel' }));

    expect(called).toBe(0);
    expect(screen.getByText('Retirer Lionel du foyer ?')).toBeInTheDocument();
    // Toujours deux lignes : la confirmation transforme la ligne, elle n'en retire aucune.
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('confirmer le retrait appelle le use case et la ligne disparaît', async () => {
    const user = userEvent.setup();
    const captured: { input: RemoveConviveInput | undefined } = { input: undefined };
    const removeConviveUseCase: RemoveConvive = async (input) => {
      captured.input = input;
    };
    renderWithStore({
      listConvives: spyReturning(twoConvives()).fn,
      removeConvive: removeConviveUseCase,
    });
    await screen.findByText('Aurélie');
    await user.click(screen.getByRole('button', { name: 'Retirer Lionel' }));

    await user.click(screen.getByRole('button', { name: 'Retirer' }));

    expect(captured.input).toEqual({ id: 'c-2' });
    await waitFor(() => expect(screen.queryByText('Lionel')).not.toBeInTheDocument());
    expect(screen.getByText('Aurélie')).toBeInTheDocument();
  });

  it('renoncer au retrait referme la confirmation et ne retire personne', async () => {
    const user = userEvent.setup();
    let called = 0;
    const removeConviveUseCase: RemoveConvive = async () => {
      called += 1;
    };
    renderWithStore({
      listConvives: spyReturning(twoConvives()).fn,
      removeConvive: removeConviveUseCase,
    });
    await screen.findByText('Aurélie');
    await user.click(screen.getByRole('button', { name: 'Retirer Lionel' }));

    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(called).toBe(0);
    expect(screen.queryByText('Retirer Lionel du foyer ?')).not.toBeInTheDocument();
    expect(screen.getByText('Lionel')).toBeInTheDocument();
  });

  // Hors ligne, l'effacement part en file locale et n'est jamais acquitté : l'écran ne peut
  // ni affirmer que c'est fait, ni que c'est perdu. Le convive RESTE affiché — le retirer
  // laisserait croire à un effacement, et il réapparaîtrait au chargement suivant.
  it('hors ligne, dit que le retrait n’a pas pu être confirmé, et garde le convive affiché', async () => {
    const user = userEvent.setup();
    const offlineRemove: RemoveConvive = () => Promise.reject(RepositoryUnavailableError.create());
    renderWithStore({
      listConvives: spyReturning(twoConvives()).fn,
      removeConvive: offlineRemove,
    });
    await screen.findByText('Aurélie');
    await user.click(screen.getByRole('button', { name: 'Retirer Lionel' }));

    await user.click(screen.getByRole('button', { name: 'Retirer' }));

    const notice = await screen.findByText(
      'Aucune connexion — le retrait de Lionel n’a pas pu être confirmé.',
    );
    // Constat poli, pas alerte : rien n'est attendu de l'utilisateur.
    expect(notice).toHaveAttribute('role', 'status');
    // Le convive n'a PAS quitté la liste : rien ne prouve que l'effacement a eu lieu, et il
    // réapparaîtrait au chargement suivant.
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Retirer Lionel du foyer ?')).toBeInTheDocument();
  });

  it('un renommage refusé s’annonce comme une alerte, sans détail technique', async () => {
    const user = userEvent.setup();
    const failingRename: RenameConvive = () => Promise.reject(new Error('Firestore indisponible'));
    renderWithStore({
      listConvives: spyReturning(twoConvives()).fn,
      renameConvive: failingRename,
    });
    await screen.findByText('Aurélie');
    await user.click(screen.getByRole('button', { name: 'Renommer Lionel' }));
    await user.type(screen.getByLabelText('Nouveau prénom pour Lionel'), 'x');

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible de renommer le convive.',
    );
    expect(screen.queryByText(/Firestore/i)).not.toBeInTheDocument();
  });

  // Le store est un SINGLETON DE SESSION : seul le container est démonté quand la sheet se
  // ferme. Un constat de retrait qui survivrait afficherait, à la réouverture, un foyer
  // complet ET « le retrait n'a pas pu être confirmé », confirmation rouverte toute seule.
  it('rouvrir la sheet ne retrouve ni le constat de retrait ni la confirmation ouverte', async () => {
    const user = userEvent.setup();
    const offlineRemove: RemoveConvive = () => Promise.reject(RepositoryUnavailableError.create());
    const { store, unmount } = renderWithStore({
      listConvives: spyReturning(twoConvives()).fn,
      removeConvive: offlineRemove,
    });
    await screen.findByText('Aurélie');
    await user.click(screen.getByRole('button', { name: 'Retirer Lionel' }));
    await user.click(screen.getByRole('button', { name: 'Retirer' }));
    await screen.findByText('Aucune connexion — le retrait de Lionel n’a pas pu être confirmé.');

    unmount();
    renderWith(store);

    expect(await screen.findByText('Lionel')).toBeInTheDocument();
    expect(
      screen.queryByText('Aucune connexion — le retrait de Lionel n’a pas pu être confirmé.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Retirer Lionel du foyer ?')).not.toBeInTheDocument();
  });

  it('rouvrir la sheet ne retrouve aucune ligne ouverte en édition', async () => {
    const user = userEvent.setup();
    const { store, unmount } = renderWithStore({ listConvives: spyReturning(twoConvives()).fn });
    await screen.findByText('Aurélie');
    await user.click(screen.getByRole('button', { name: 'Renommer Lionel' }));
    expect(screen.getByLabelText('Nouveau prénom pour Lionel')).toBeInTheDocument();

    unmount();
    renderWith(store);

    await screen.findByText('Lionel');
    // Sans remise à zéro, la ligne rouvrirait en édition avec un brouillon VIDE : le
    // container repart d'un `useState` neuf, le store non.
    expect(screen.queryByLabelText('Nouveau prénom pour Lionel')).not.toBeInTheDocument();
  });

  // Renommer vers le prénom déjà porté par ce convive n'est pas un renommage : rien à écrire,
  // et hors ligne cela produirait un constat d'échec pour une opération sans effet.
  it('n’autorise pas à enregistrer un prénom identique à celui déjà porté', async () => {
    const user = userEvent.setup();
    renderWithStore({ listConvives: spyReturning(twoConvives()).fn });
    await screen.findByText('Aurélie');
    await user.click(screen.getByRole('button', { name: 'Renommer Lionel' }));

    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();

    await user.type(screen.getByLabelText('Nouveau prénom pour Lionel'), 'x');

    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeEnabled();
  });

  // ─── Une écriture en vol, ou un constat pas encore lu, fige les AUTRES lignes ────────

  // Défaut trouvé en revue : le container faisait `setRenameDraft` sans condition alors que
  // le reducer ignore l'ouverture d'une autre ligne pendant une écriture. Le `useState`
  // partait, le store restait : la ligne d'Aurélie affichait « Lionel », un texte que
  // personne n'avait tapé — et un clic renommait réellement Aurélie en Lionel.
  it('pendant un renommage en vol, ouvrir une autre ligne ne peut pas corrompre la saisie', async () => {
    const user = userEvent.setup();
    const pendingRename: RenameConvive = () => new Promise<Convive>(() => {});
    renderWithStore({
      listConvives: spyReturning(twoConvives()).fn,
      renameConvive: pendingRename,
    });
    await screen.findByText('Aurélie');
    await user.click(screen.getByRole('button', { name: 'Renommer Aurélie' }));
    await user.clear(screen.getByLabelText('Nouveau prénom pour Aurélie'));
    await user.type(screen.getByLabelText('Nouveau prénom pour Aurélie'), 'Aur');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await user.click(screen.getByRole('button', { name: 'Renommer Lionel' }));

    // La ligne éditée n'a pas changé, et son contenu non plus.
    expect(screen.getByLabelText('Nouveau prénom pour Aurélie')).toHaveValue('Aur');
    expect(screen.queryByLabelText('Nouveau prénom pour Lionel')).not.toBeInTheDocument();
  });

  it('pendant un renommage en vol, les actions des autres lignes sont verrouillées', async () => {
    const user = userEvent.setup();
    const pendingRename: RenameConvive = () => new Promise<Convive>(() => {});
    renderWithStore({
      listConvives: spyReturning(twoConvives()).fn,
      renameConvive: pendingRename,
    });
    await screen.findByText('Aurélie');
    await user.click(screen.getByRole('button', { name: 'Renommer Aurélie' }));
    await user.type(screen.getByLabelText('Nouveau prénom pour Aurélie'), 'x');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(screen.getByRole('button', { name: 'Renommer Lionel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Retirer Lionel' })).toBeDisabled();
  });

  // Reproduit dans le navigateur : renommage lancé hors ligne, puis ouverture d'une autre
  // ligne — le constat n'apparaissait JAMAIS. Le convive gardait son ancien prénom sans que
  // rien ne l'ait signalé. Contrairement à l'ajout et au retrait, un renommage hors ligne ne
  // part pas en file : la transaction rejette, l'échec est franc, et il doit se voir.
  it('un constat de renommage ne retient plus l’utilisateur sur sa ligne', async () => {
    const user = userEvent.setup();
    const offlineRename: RenameConvive = () => Promise.reject(RepositoryUnavailableError.create());
    renderWithStore({
      listConvives: spyReturning(twoConvives()).fn,
      renameConvive: offlineRename,
    });
    await screen.findByText('Aurélie');
    await user.click(screen.getByRole('button', { name: 'Renommer Aurélie' }));
    await user.type(screen.getByLabelText('Nouveau prénom pour Aurélie'), 'x');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    const constat = await screen.findByText(
      'Aucune connexion — le renommage d’Aurélie n’a pas pu être confirmé.',
    );
    // Le constat est bien LÀ — sans quoi ce test ne dirait rien du verrou qu'il nie.
    expect(constat).toBeInTheDocument();
    // Et il ne retient personne : les autres lignes restent actionnables, sans qu'aucune
    // frappe n'ait à les réveiller. Le constat reste affiché jusqu'au verdict suivant.
    expect(screen.getByRole('button', { name: 'Renommer Lionel' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Retirer Lionel' })).toBeEnabled();
  });

  it('un constat de retrait ne retient plus non plus l’utilisateur sur sa ligne', async () => {
    const user = userEvent.setup();
    const offlineRemove: RemoveConvive = () => Promise.reject(RepositoryUnavailableError.create());
    renderWithStore({
      listConvives: spyReturning(twoConvives()).fn,
      removeConvive: offlineRemove,
    });
    await screen.findByText('Aurélie');
    await user.click(screen.getByRole('button', { name: 'Retirer Lionel' }));
    await user.click(screen.getByRole('button', { name: 'Retirer' }));
    const constat = await screen.findByText(
      'Aucune connexion — le retrait de Lionel n’a pas pu être confirmé.',
    );

    expect(constat).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Renommer Aurélie' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Retirer Aurélie' })).toBeEnabled();
  });

  it('au repos, les actions de toutes les lignes sont disponibles', async () => {
    renderWithStore({ listConvives: spyReturning(twoConvives()).fn });
    await screen.findByText('Aurélie');

    // Jeu DISCRIMINANT : un verrou posé sans condition figerait tout l'écran en permanence.
    expect(screen.getByRole('button', { name: 'Renommer Aurélie' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Retirer Lionel' })).toBeEnabled();
  });

  // Le store garde `editingConviveId` et `renameStatus: 'renaming'` — on ne déverrouille pas
  // une écriture en vol. Tant que le brouillon vivait dans le `useState` du container, le
  // remontage réaffichait la ligne en édition avec un champ VIDE et désactivé : un formulaire
  // mort, sans le moindre indice que la saisie était toujours en vol.
  it('rouvrir la sheet pendant un renommage en vol retrouve la saisie en cours', async () => {
    const user = userEvent.setup();
    const pendingRename: RenameConvive = () => new Promise<Convive>(() => {});
    const { store, unmount } = renderWithStore({
      listConvives: spyReturning(twoConvives()).fn,
      renameConvive: pendingRename,
    });
    await screen.findByText('Aurélie');
    await user.click(screen.getByRole('button', { name: 'Renommer Lionel' }));
    await user.clear(screen.getByLabelText('Nouveau prénom pour Lionel'));
    await user.type(screen.getByLabelText('Nouveau prénom pour Lionel'), 'Lio');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    unmount();
    renderWith(store);

    expect(await screen.findByLabelText('Nouveau prénom pour Lionel')).toHaveValue('Lio');
  });

  // ─── Tenue de la ligne sur un prénom long (mobile 393 px) ───────────────────────────

  // Mesuré dans Chrome : avec « Christophe », le prénom était écrasé à 29 px pour 81 px de
  // texte, et s'affichait PAR-DESSUS les boutons. Cause directe : les libellés portaient le
  // prénom, donc les boutons s'élargissaient avec lui aux dépens du seul contenu qui compte.
  it('garde des libellés de boutons de longueur fixe, quel que soit le prénom', async () => {
    renderWithStore({
      listConvives: spyReturning([
        ConviveBuilder.aConvive().withId('c-1').withName('Christophe').build(),
      ]).fn,
    });
    await screen.findByText('Christophe');

    // Égalité stricte, pas `toHaveTextContent` qui passerait sur « Renommer Christophe ».
    expect(screen.getByRole('button', { name: 'Renommer Christophe' }).textContent).toBe(
      'Renommer',
    );
    expect(screen.getByRole('button', { name: 'Retirer Christophe' }).textContent).toBe('Retirer');
  });

  it('affiche le prénom long en entier, sans le tronquer', async () => {
    renderWithStore({
      listConvives: spyReturning([
        ConviveBuilder.aConvive().withId('c-1').withName('Bénédicte').build(),
      ]).fn,
    });
    await screen.findByText('Bénédicte');

    // Le seul contenu de cet écran est une liste de prénoms : en tronquer un serait
    // remplacer un défaut par un autre.
    expect(screen.getByTestId('convive-name').textContent).toBe('Bénédicte');
  });
});
