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
import { createTestStore } from '../../../test/create-test-store';
import { ConvivesContainer } from './ConvivesContainer';

function renderWithStore(overrides?: Partial<AppDependencies>) {
  const store = createTestStore(overrides);
  return { store, ...renderWith(store) };
}

function renderWith(store: ReturnType<typeof createTestStore>) {
  return render(
    <Provider store={store}>
      <ConvivesContainer />
    </Provider>,
  );
}

function spyReturning(convives: Convive[]): { fn: ListConvives; callCount: () => number } {
  let count = 0;
  const fn: ListConvives = async () => {
    count += 1;
    return convives;
  };
  return { fn, callCount: () => count };
}

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

  it('hors ligne, l’app dit qu’elle n’a pas pu charger le foyer — jamais qu’il est vide', async () => {
    const offline: ListConvives = () => Promise.reject(RepositoryUnavailableError.create());
    renderWithStore({ listConvives: offline });

    expect(
      await screen.findByText('Aucune connexion — le foyer n’a pas pu être chargé.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Personne dans le foyer pour le moment.')).not.toBeInTheDocument();
    expect(screen.queryByText('Impossible de charger les convives.')).not.toBeInTheDocument();
  });

  it('le constat hors-ligne ne propose pas « Réessayer », contrairement à l’échec de chargement', async () => {
    const offline: ListConvives = () => Promise.reject(RepositoryUnavailableError.create());
    renderWithStore({ listConvives: offline });
    await screen.findByText('Aucune connexion — le foyer n’a pas pu être chargé.');

    expect(screen.queryByRole('button', { name: /réessayer/i })).not.toBeInTheDocument();
  });

  it('le constat hors-ligne est annoncé poliment, jamais comme une alerte', async () => {
    const offline: ListConvives = () => Promise.reject(RepositoryUnavailableError.create());
    renderWithStore({ listConvives: offline });
    await screen.findByText('Aucune connexion — le foyer n’a pas pu être chargé.');

    expect(screen.getByRole('status')).toHaveTextContent(
      'Aucune connexion — le foyer n’a pas pu être chargé.',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

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

  it('le champ prénom est verrouillé pendant un ajout en vol', async () => {
    const user = userEvent.setup();
    const neverResolvingAdd: AddConvive = () => new Promise<Convive>(() => {});
    renderWithStore({ listConvives: spyReturning([]).fn, addConvive: neverResolvingAdd });
    await screen.findByText('Personne dans le foyer pour le moment.');

    await user.type(screen.getByLabelText(/prénom/i), 'Rory');
    await user.click(screen.getByRole('button', { name: /ajouter/i }));

    expect(screen.getByLabelText(/prénom/i)).toBeDisabled();
  });

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

    sheet.unmount();
    renderWith(store);

    expect(await screen.findByText('Aurélie')).toBeInTheDocument();
    expect(
      screen.queryByText('Aucune connexion — l’ajout de Rory n’a pas pu être confirmé.'),
    ).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/prénom/i), 'Rory');
    expect(screen.getByRole('button', { name: /ajouter/i })).toBeEnabled();
  });

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
    expect(ids).toEqual(['generated-id-1', 'generated-id-1']);
  });

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
    expect(notice).toHaveAttribute('role', 'status');
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
    expect(screen.queryByLabelText('Nouveau prénom pour Lionel')).not.toBeInTheDocument();
  });

  it('n’autorise pas à enregistrer un prénom identique à celui déjà porté', async () => {
    const user = userEvent.setup();
    renderWithStore({ listConvives: spyReturning(twoConvives()).fn });
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
      listConvives: spyReturning(twoConvives()).fn,
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
    expect(constat).toBeInTheDocument();
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

    expect(screen.getByRole('button', { name: 'Renommer Aurélie' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Retirer Lionel' })).toBeEnabled();
  });

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

  it('garde des libellés de boutons de longueur fixe, quel que soit le prénom', async () => {
    renderWithStore({
      listConvives: spyReturning([
        ConviveBuilder.aConvive().withId('c-1').withName('Christophe').build(),
      ]).fn,
    });
    await screen.findByText('Christophe');

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

    expect(screen.getByTestId('convive-name').textContent).toBe('Bénédicte');
  });
});
