import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { type Convive } from '../../../domain/entities/convive';
import {
  addConviveUseCase,
  type AddConvive,
  type AddConviveInput,
} from '../../../domain/use-cases/add-convive';
import { observeConvivesUseCase } from '../../../domain/use-cases/observe-convives';
import { InMemoryConviveRepository } from '../../../domain/test-doubles/in-memory-convive-repository';
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
import { createTestStore } from '../../../test/create-test-store';
import { DataSubscription } from '../../DataSubscription';
import { ConviveChannel } from '../../test-utils/convive-channel';
import { ConvivesContainer } from './ConvivesContainer';

function renderWithStore(overrides?: Partial<AppDependencies>) {
  const store = createTestStore(overrides);
  return { store, ...renderSubscribed(store) };
}

function renderSubscribed(store: ReturnType<typeof createTestStore>) {
  return render(
    <Provider store={store}>
      <DataSubscription>
        <ConvivesContainer />
      </DataSubscription>
    </Provider>,
  );
}

function renderWith(store: ReturnType<typeof createTestStore>) {
  return render(
    <Provider store={store}>
      <ConvivesContainer />
    </Provider>,
  );
}

function observing(convives: Convive[]): Partial<AppDependencies> {
  return { observeConvives: ConviveChannel.seededWith(convives).observeConvives };
}

function writingToAnObservedRepository(seeded: Convive[]): {
  deps: Partial<AppDependencies>;
  captured: () => AddConviveInput | undefined;
} {
  const conviveRepository = InMemoryConviveRepository.create();
  for (const convive of seeded) void conviveRepository.save(convive);
  const add = addConviveUseCase({ conviveRepository });
  let captured: AddConviveInput | undefined;
  return {
    captured: () => captured,
    deps: {
      observeConvives: observeConvivesUseCase({ conviveRepository }),
      addConvive: (input) => {
        captured = input;
        return add(input);
      },
    },
  };
}

function twoConvives(): Convive[] {
  return [
    ConviveBuilder.aConvive().withId('c-1').withName('Aurélie').build(),
    ConviveBuilder.aConvive().withId('c-2').withName('Lionel').build(),
  ];
}

describe('ConvivesContainer', () => {
  it('n’envoie pas un prénom que le domaine refuserait, ni au clic ni à la touche Entrée, et envoie celui qu’il accepte', async () => {
    const user = userEvent.setup();
    const appels: AddConviveInput[] = [];
    const espion: AddConvive = async (input) => {
      appels.push(input);
      return ConviveBuilder.aConvive().withId(input.id).withName(input.name).build();
    };
    renderWithStore({ ...observing([]), addConvive: espion });
    await screen.findByText('Personne dans le foyer pour le moment.');

    await user.type(screen.getByLabelText(/prénom/i), '   {Enter}');
    await user.click(screen.getByRole('button', { name: /ajouter/i }));

    expect(appels).toEqual([]);

    await user.clear(screen.getByLabelText(/prénom/i));
    await user.type(screen.getByLabelText(/prénom/i), 'Rory');
    await user.click(screen.getByRole('button', { name: /ajouter/i }));

    await waitFor(() => expect(appels.map((appel) => appel.name)).toEqual(['Rory']));
  });

  it('n’envoie pas un renommage que le domaine refuserait, ni au clic ni à la touche Entrée, et envoie celui qu’il accepte', async () => {
    const user = userEvent.setup();
    const appels: RenameConviveInput[] = [];
    const espion: RenameConvive = async (input) => {
      appels.push(input);
      return ConviveBuilder.aConvive().withId(input.id).withName(input.name).build();
    };
    renderWithStore({ ...observing(twoConvives()), renameConvive: espion });
    await screen.findByText('Aurélie');
    await user.click(screen.getByRole('button', { name: 'Renommer Lionel' }));

    await user.clear(screen.getByLabelText('Nouveau prénom pour Lionel'));
    await user.type(screen.getByLabelText('Nouveau prénom pour Lionel'), '   {Enter}');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(appels).toEqual([]);

    await user.clear(screen.getByLabelText('Nouveau prénom pour Lionel'));
    await user.type(screen.getByLabelText('Nouveau prénom pour Lionel'), 'Lio');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(appels.map((appel) => appel.name)).toEqual(['Lio']));
  });

  it('affiche au montage les convives émis, dans l’ordre émis, sur un seul abonnement', async () => {
    const channel = ConviveChannel.seededWith([
      ConviveBuilder.aConvive().withId('c-1').withName('Aurélie').build(),
      ConviveBuilder.aConvive().withId('c-2').withName('Lionel').build(),
    ]);
    renderWithStore({ observeConvives: channel.observeConvives });

    expect(await screen.findByText('Aurélie')).toBeInTheDocument();
    expect(channel.subscriptions).toBe(1);

    const names = screen
      .getAllByRole('listitem')
      .map((item) => within(item).getByTestId('convive-name').textContent);
    expect(names).toEqual(['Aurélie', 'Lionel']);
  });

  it('affiche un indicateur de chargement tant que le canal n’a rien émis', () => {
    renderWithStore({ observeConvives: ConviveChannel.silent().observeConvives });

    expect(screen.getByRole('status')).toHaveTextContent('Chargement…');
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('affiche un constat quand le foyer ne compte encore aucun convive', async () => {
    renderWithStore({ ...observing([]) });

    expect(await screen.findByText('Personne dans le foyer pour le moment.')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('affiche un message sobre en erreur, sans le détail technique, et se réabonne au réessai', async () => {
    const user = userEvent.setup();
    const channel = ConviveChannel.refusingWith(new Error('Firestore indisponible'));
    renderWithStore({ observeConvives: channel.observeConvives });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible de charger les convives.',
    );
    expect(screen.queryByText(/Firestore/i)).not.toBeInTheDocument();

    channel.willEmit([ConviveBuilder.aConvive().withId('c-1').withName('Aurélie').build()]);
    await user.click(screen.getByRole('button', { name: /réessayer/i }));

    expect(await screen.findByText('Aurélie')).toBeInTheDocument();
    expect(channel.subscriptions).toBe(2);
    expect(channel.live).toBe(1);
  });

  it('hors ligne, l’app dit qu’elle n’a pas pu charger le foyer — jamais qu’il est vide', async () => {
    renderWithStore({
      observeConvives: ConviveChannel.refusingWith(RepositoryUnavailableError.create())
        .observeConvives,
    });

    expect(
      await screen.findByText('Aucune connexion — le foyer n’a pas pu être chargé.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Personne dans le foyer pour le moment.')).not.toBeInTheDocument();
    expect(screen.queryByText('Impossible de charger les convives.')).not.toBeInTheDocument();
  });

  it('le constat hors-ligne propose « Réessayer », qui rouvre un abonnement neuf et ramène le foyer', async () => {
    const user = userEvent.setup();
    const channel = ConviveChannel.refusingWith(RepositoryUnavailableError.create());
    renderWithStore({ observeConvives: channel.observeConvives });
    await screen.findByText('Aucune connexion — le foyer n’a pas pu être chargé.');

    channel.willEmit([ConviveBuilder.aConvive().withId('c-1').withName('Aurélie').build()]);
    await user.click(screen.getByRole('button', { name: /réessayer/i }));

    expect(await screen.findByText('Aurélie')).toBeInTheDocument();
    expect(
      screen.queryByText('Aucune connexion — le foyer n’a pas pu être chargé.'),
    ).not.toBeInTheDocument();
    expect(channel.subscriptions).toBe(2);
    expect(channel.live).toBe(1);
  });

  it('le constat hors-ligne est annoncé poliment, jamais comme une alerte', async () => {
    renderWithStore({
      observeConvives: ConviveChannel.refusingWith(RepositoryUnavailableError.create())
        .observeConvives,
    });
    await screen.findByText('Aucune connexion — le foyer n’a pas pu être chargé.');

    expect(screen.getByRole('status')).toHaveTextContent(
      'Aucune connexion — le foyer n’a pas pu être chargé.',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('l’état hors-ligne n’expose pas le formulaire d’ajout', async () => {
    renderWithStore({
      observeConvives: ConviveChannel.refusingWith(RepositoryUnavailableError.create())
        .observeConvives,
    });
    await screen.findByText('Aucune connexion — le foyer n’a pas pu être chargé.');

    expect(screen.queryByLabelText(/prénom/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ajouter/i })).not.toBeInTheDocument();
  });

  it('ajoute le prénom saisi : le use case reçoit ce prénom et le convive rejoint la liste affichée', async () => {
    const user = userEvent.setup();
    const wiring = writingToAnObservedRepository([
      ConviveBuilder.aConvive().withId('c-1').withName('Aurélie').build(),
    ]);
    renderWithStore(wiring.deps);
    await screen.findByText('Aurélie');

    await user.type(screen.getByLabelText(/prénom/i), 'Rory');
    await user.click(screen.getByRole('button', { name: /ajouter/i }));

    expect(await screen.findByText('Rory')).toBeInTheDocument();
    expect(wiring.captured()).toEqual({ id: 'generated-id-1', name: 'Rory' });
    const names = screen
      .getAllByRole('listitem')
      .map((item) => within(item).getByTestId('convive-name').textContent);
    expect(names).toEqual(['Aurélie', 'Rory']);
  });

  it('affiche le convive ajouté à sa place alphabétique dans la liste rendue, pas en fin de liste', async () => {
    const user = userEvent.setup();
    renderWithStore(
      writingToAnObservedRepository([
        ConviveBuilder.aConvive().withId('c-1').withName('Emma').build(),
        ConviveBuilder.aConvive().withId('c-2').withName('Zoé').build(),
      ]).deps,
    );
    await screen.findByText('Emma');

    await user.type(screen.getByLabelText(/prénom/i), 'Élise');
    await user.click(screen.getByRole('button', { name: /ajouter/i }));

    expect(await screen.findByText('Élise')).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('listitem')
        .map((item) => within(item).getByTestId('convive-name').textContent),
    ).toEqual(['Élise', 'Emma', 'Zoé']);
  });

  it('désactive « Ajouter » tant que le champ prénom est vide, sans message d’erreur', async () => {
    renderWithStore({ ...observing([]) });
    await screen.findByText('Personne dans le foyer pour le moment.');

    expect(screen.getByRole('button', { name: /ajouter/i })).toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('garde « Ajouter » désactivé quand le champ ne contient que des espaces', async () => {
    const user = userEvent.setup();
    renderWithStore({ ...observing([]) });
    await screen.findByText('Personne dans le foyer pour le moment.');

    await user.type(screen.getByLabelText(/prénom/i), '   ');

    expect(screen.getByRole('button', { name: /ajouter/i })).toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('vide le champ prénom après un ajout réussi', async () => {
    const user = userEvent.setup();
    renderWithStore(writingToAnObservedRepository([]).deps);
    await screen.findByText('Personne dans le foyer pour le moment.');

    await user.type(screen.getByLabelText(/prénom/i), 'Rory');
    await user.click(screen.getByRole('button', { name: /ajouter/i }));

    expect(await screen.findByText('Rory')).toBeInTheDocument();
    expect(screen.getByLabelText(/prénom/i)).toHaveValue('');
  });

  it('le champ prénom est verrouillé pendant un ajout en vol', async () => {
    const user = userEvent.setup();
    const neverResolvingAdd: AddConvive = () => new Promise<Convive>(() => {});
    renderWithStore({ ...observing([]), addConvive: neverResolvingAdd });
    await screen.findByText('Personne dans le foyer pour le moment.');

    await user.type(screen.getByLabelText(/prénom/i), 'Rory');
    await user.click(screen.getByRole('button', { name: /ajouter/i }));

    expect(screen.getByLabelText(/prénom/i)).toBeDisabled();
  });

  it('rouvrir la sheet vise un convive NEUF : la saisie suivante n’écrase pas la précédente', async () => {
    const user = userEvent.setup();
    const ids: string[] = [];
    const accepte: AddConvive = (input) => {
      ids.push(input.id);
      return Promise.resolve(
        ConviveBuilder.aConvive().withId(input.id).withName(input.name).build(),
      );
    };
    let count = 0;
    const store = createTestStore({
      ...observing([]),
      addConvive: accepte,
      newConviveId: () => `draft-${(count += 1)}`,
    });
    const sheet = renderSubscribed(store);
    await screen.findByText('Personne dans le foyer pour le moment.');
    await user.type(screen.getByLabelText(/prénom/i), 'Rory');
    await user.click(screen.getByRole('button', { name: /ajouter/i }));
    await waitFor(() => expect(ids).toEqual(['draft-2']));

    sheet.unmount();
    renderWith(store);
    await screen.findByText('Personne dans le foyer pour le moment.');
    await user.type(screen.getByLabelText(/prénom/i), 'Zoé');
    await user.click(screen.getByRole('button', { name: /ajouter/i }));

    await waitFor(() => expect(ids).toHaveLength(2));
    expect(ids).toEqual(['draft-2', 'draft-4']);
  });

  it('pendant un ajout en vol, « Ajouter » est désactivé : un second appui n’ajoute pas un doublon', async () => {
    const user = userEvent.setup();
    let callCount = 0;
    const neverResolvingAdd: AddConvive = () => {
      callCount += 1;
      return new Promise<Convive>(() => {});
    };
    renderWithStore({
      ...observing([]),
      addConvive: neverResolvingAdd,
    });
    await screen.findByText('Personne dans le foyer pour le moment.');

    await user.type(screen.getByLabelText(/prénom/i), 'Rory');
    await user.click(screen.getByRole('button', { name: /ajouter/i }));

    expect(screen.getByRole('button', { name: /ajouter/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /ajouter/i }));

    expect(callCount).toBe(1);
  });

  it('offre à chaque convive de quoi le renommer et de quoi le retirer', async () => {
    renderWithStore({ ...observing(twoConvives()) });
    await screen.findByText('Aurélie');

    expect(screen.getByRole('button', { name: 'Renommer Aurélie' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retirer Aurélie' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Renommer Lionel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retirer Lionel' })).toBeInTheDocument();
  });

  it('renommer ouvre un champ pré-rempli avec le prénom actuel, sur cette ligne seulement', async () => {
    const user = userEvent.setup();
    renderWithStore({ ...observing(twoConvives()) });
    await screen.findByText('Aurélie');

    await user.click(screen.getByRole('button', { name: 'Renommer Lionel' }));

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
      ...observing(twoConvives()),
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
      ...observing(twoConvives()),
      renameConvive: renameConviveUseCase,
    });
    await screen.findByText('Aurélie');
    await user.click(screen.getByRole('button', { name: 'Renommer Lionel' }));

    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(called).toBe(0);
    expect(screen.queryByLabelText('Nouveau prénom pour Lionel')).not.toBeInTheDocument();
    expect(screen.getByText('Lionel')).toBeInTheDocument();
  });

  it('retirer demande confirmation : personne n’est effacé au premier appui', async () => {
    const user = userEvent.setup();
    let called = 0;
    const removeConviveUseCase: RemoveConvive = async () => {
      called += 1;
    };
    renderWithStore({
      ...observing(twoConvives()),
      removeConvive: removeConviveUseCase,
    });
    await screen.findByText('Aurélie');

    await user.click(screen.getByRole('button', { name: 'Retirer Lionel' }));

    expect(called).toBe(0);
    expect(screen.getByText('Retirer Lionel du foyer ?')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('confirmer le retrait appelle le use case et la ligne disparaît', async () => {
    const user = userEvent.setup();
    const captured: { input: RemoveConviveInput | undefined } = { input: undefined };
    const removeConviveUseCase: RemoveConvive = async (input) => {
      captured.input = input;
    };
    renderWithStore({
      ...observing(twoConvives()),
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
      ...observing(twoConvives()),
      removeConvive: removeConviveUseCase,
    });
    await screen.findByText('Aurélie');
    await user.click(screen.getByRole('button', { name: 'Retirer Lionel' }));

    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(called).toBe(0);
    expect(screen.queryByText('Retirer Lionel du foyer ?')).not.toBeInTheDocument();
    expect(screen.getByText('Lionel')).toBeInTheDocument();
  });

  it('rouvrir la sheet ne retrouve pas la confirmation de retrait ouverte', async () => {
    const user = userEvent.setup();
    const { store, unmount } = renderWithStore({ ...observing(twoConvives()) });
    await screen.findByText('Aurélie');
    await user.click(screen.getByRole('button', { name: 'Retirer Lionel' }));
    expect(screen.getByText('Retirer Lionel du foyer ?')).toBeInTheDocument();

    unmount();
    renderWith(store);

    expect(await screen.findByText('Lionel')).toBeInTheDocument();
    expect(screen.queryByText('Retirer Lionel du foyer ?')).not.toBeInTheDocument();
  });

  it('rouvrir la sheet ne retrouve aucune ligne ouverte en édition', async () => {
    const user = userEvent.setup();
    const { store, unmount } = renderWithStore({ ...observing(twoConvives()) });
    await screen.findByText('Aurélie');
    await user.click(screen.getByRole('button', { name: 'Renommer Lionel' }));
    expect(screen.getByLabelText('Nouveau prénom pour Lionel')).toBeInTheDocument();

    unmount();
    renderWith(store);

    await screen.findByText('Lionel');
    expect(screen.queryByLabelText('Nouveau prénom pour Lionel')).not.toBeInTheDocument();
  });

  it('n’autorise pas à enregistrer un prénom identique à celui déjà porté', async () => {
    const user = userEvent.setup();
    renderWithStore({ ...observing(twoConvives()) });
    await screen.findByText('Aurélie');
    await user.click(screen.getByRole('button', { name: 'Renommer Lionel' }));

    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();

    await user.type(screen.getByLabelText('Nouveau prénom pour Lionel'), 'x');

    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeEnabled();
  });

  it('pendant un renommage en vol, ouvrir une autre ligne ne peut pas corrompre la saisie', async () => {
    const user = userEvent.setup();
    const pendingRename: RenameConvive = () => new Promise<Convive>(() => {});
    renderWithStore({
      ...observing(twoConvives()),
      renameConvive: pendingRename,
    });
    await screen.findByText('Aurélie');
    await user.click(screen.getByRole('button', { name: 'Renommer Aurélie' }));
    await user.clear(screen.getByLabelText('Nouveau prénom pour Aurélie'));
    await user.type(screen.getByLabelText('Nouveau prénom pour Aurélie'), 'Aur');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await user.click(screen.getByRole('button', { name: 'Renommer Lionel' }));

    expect(screen.getByLabelText('Nouveau prénom pour Aurélie')).toHaveValue('Aur');
    expect(screen.queryByLabelText('Nouveau prénom pour Lionel')).not.toBeInTheDocument();
  });

  it('pendant un renommage en vol, les actions des autres lignes sont verrouillées', async () => {
    const user = userEvent.setup();
    const pendingRename: RenameConvive = () => new Promise<Convive>(() => {});
    renderWithStore({
      ...observing(twoConvives()),
      renameConvive: pendingRename,
    });
    await screen.findByText('Aurélie');
    await user.click(screen.getByRole('button', { name: 'Renommer Aurélie' }));
    await user.type(screen.getByLabelText('Nouveau prénom pour Aurélie'), 'x');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(screen.getByRole('button', { name: 'Renommer Lionel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Retirer Lionel' })).toBeDisabled();
  });

  it('au repos, les actions de toutes les lignes sont disponibles', async () => {
    renderWithStore({ ...observing(twoConvives()) });
    await screen.findByText('Aurélie');

    expect(screen.getByRole('button', { name: 'Renommer Aurélie' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Retirer Lionel' })).toBeEnabled();
  });

  it('rouvrir la sheet pendant un renommage en vol retrouve la saisie en cours', async () => {
    const user = userEvent.setup();
    const pendingRename: RenameConvive = () => new Promise<Convive>(() => {});
    const { store, unmount } = renderWithStore({
      ...observing(twoConvives()),
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

  it('garde des libellés de boutons de longueur fixe, quel que soit le prénom', async () => {
    renderWithStore({
      ...observing([ConviveBuilder.aConvive().withId('c-1').withName('Christophe').build()]),
    });
    await screen.findByText('Christophe');

    expect(screen.getByRole('button', { name: 'Renommer Christophe' }).textContent).toBe(
      'Renommer',
    );
    expect(screen.getByRole('button', { name: 'Retirer Christophe' }).textContent).toBe('Retirer');
  });

  it('affiche le prénom long en entier, sans le tronquer', async () => {
    renderWithStore({
      ...observing([ConviveBuilder.aConvive().withId('c-1').withName('Bénédicte').build()]),
    });
    await screen.findByText('Bénédicte');

    expect(screen.getByTestId('convive-name').textContent).toBe('Bénédicte');
  });
});
