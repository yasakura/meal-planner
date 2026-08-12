import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { type Convive } from '../../../domain/entities/convive';
import { type AddConvive, type AddConviveInput } from '../../../domain/use-cases/add-convive';
import { type ListConvives } from '../../../domain/use-cases/list-convives';
import { ConviveBuilder } from '../../../domain/test-builders/convive.builder';
import { type AppDependencies } from '../../store/store';
import { createTestStore } from '../../store/create-test-store';
import { ConvivesContainer } from './ConvivesContainer';

function renderWithStore(overrides?: Partial<AppDependencies>) {
  const store = createTestStore(overrides);
  const view = render(
    <Provider store={store}>
      <ConvivesContainer />
    </Provider>,
  );
  return { store, ...view };
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
