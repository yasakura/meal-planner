import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { type Convive } from '../../../domain/entities/convive';
import { type AddConvive, type AddConviveInput } from '../../../domain/use-cases/add-convive';
import { type ListConvives } from '../../../domain/use-cases/list-convives';
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
    return ConviveBuilder.aConvive().withId('c-new').withName(input.name).build();
  };
  return { fn, captured: () => captured };
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

    const names = screen.getAllByRole('listitem').map((item) => item.textContent);
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
    expect(add.captured()).toEqual({ name: 'Rory' });
    const names = screen.getAllByRole('listitem').map((item) => item.textContent);
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
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Élise',
      'Emma',
      'Zoé',
    ]);
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
    const names = screen.getAllByRole('listitem').map((item) => item.textContent);
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
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Aurélie']);
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
  it('après une écriture non acquittée, « Ajouter » reste désactivé et le prénom saisi est conservé', async () => {
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
    expect(screen.getByRole('button', { name: /ajouter/i })).toBeDisabled();
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

  // GARANTIE CARDINALE de cette passe. Verrouiller le champ sur `submitDisabled` — qui
  // inclut `unconfirmed` — retournerait le correctif contre le bug qu'il corrige : la frappe
  // ne pourrait plus effacer le constat, et l'écran redeviendrait définitivement figé.
  // Le verrou porte sur `adding` SEUL.
  it('le champ prénom reste éditable après un ajout non confirmé, bouton verrouillé ou non', async () => {
    const user = userEvent.setup();
    const unacknowledged: AddConvive = () => Promise.reject(RepositoryUnavailableError.create());
    renderWithStore({ listConvives: spyReturning([]).fn, addConvive: unacknowledged });
    await screen.findByText('Personne dans le foyer pour le moment.');
    await user.type(screen.getByLabelText(/prénom/i), 'Rory');
    await user.click(screen.getByRole('button', { name: /ajouter/i }));
    await screen.findByText(/n’a pas pu être confirmé/);

    expect(screen.getByRole('button', { name: /ajouter/i })).toBeDisabled();
    expect(screen.getByLabelText(/prénom/i)).toBeEnabled();
  });

  // Récupération qui ne dépend d'AUCUN cycle de montage : `AccountSheet` garde son panneau
  // monté pendant sa transition de sortie (200 ms), donc une réouverture rapide ne remonte
  // rien et `loadConvives` n'est jamais rejoué. Vérifier la seule disparition du message
  // laisserait passer un bouton resté verrouillé — c'est le bouton qui fige l'écran.
  it('saisir un prénom après un ajout non confirmé efface le constat et déverrouille « Ajouter »', async () => {
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
    expect(screen.getByRole('button', { name: /ajouter/i })).toBeDisabled();

    await user.type(screen.getByLabelText(/prénom/i), 'x');

    expect(
      screen.queryByText('Aucune connexion — l’ajout de Rory n’a pas pu être confirmé.'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ajouter/i })).toBeEnabled();
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
});
