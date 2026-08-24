import { act, render, screen, within, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { createCalendarDate } from '../../../domain/entities/calendar-date';
import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { MenuBuilder } from '../../../domain/test-builders/menu.builder';
import { createTestStore } from '../../../test/create-test-store';
import { DataSubscription } from '../../DataSubscription';
import { MenuChannel } from '../../test-utils/menu-channel';
import { RecipeChannel } from '../../test-utils/recipe-channel';
import { MenuContainer } from './MenuContainer';
import { MenuCreateContainer } from './MenuCreateContainer';

const HORS_LIGNE = 'Aucune connexion — le menu n’a pas pu être chargé.';

function bloc(vue: RenderResult): string {
  const constat = within(vue.container).getByRole('status');
  return (constat.parentElement as HTMLElement).outerHTML;
}

async function consultationHorsLigne(): Promise<RenderResult> {
  const store = createTestStore({
    observeMenus: MenuChannel.refusingWith(RepositoryUnavailableError.create()).observeMenus,
    observeRecipes: RecipeChannel.silent().observeRecipes,
  });
  const vue = render(
    <Provider store={store}>
      <MemoryRouter>
        <DataSubscription>
          <MenuContainer />
        </DataSubscription>
      </MemoryRouter>
    </Provider>,
  );
  expect(await within(vue.container).findByText(HORS_LIGNE)).toBeInTheDocument();
  return vue;
}

async function generationHorsLigne(): Promise<RenderResult> {
  const user = userEvent.setup();
  const store = createTestStore({
    listRecipes: () => Promise.reject(RepositoryUnavailableError.create()),
    generateMenu: async () =>
      MenuBuilder.aMenu()
        .startingOn(createCalendarDate({ year: 2026, month: 8, day: 24 }))
        .build(),
  });
  const vue = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/menu/nouveau']}>
        <MenuCreateContainer />
      </MemoryRouter>
    </Provider>,
  );
  await act(async () => {});
  await user.click(within(vue.container).getByRole('button', { name: /générer un menu/i }));
  expect(await within(vue.container).findByText(HORS_LIGNE)).toBeInTheDocument();
  return vue;
}

describe('Le constat hors ligne des deux écrans du menu', () => {
  it('est rendu à l’identique sur l’écran des menus et sur celui de la génération', async () => {
    const consultation = await consultationHorsLigne();
    const generation = await generationHorsLigne();

    expect(bloc(consultation)).toBe(bloc(generation));
  });

  it('porte de part et d’autre le même message et le même « Réessayer »', async () => {
    const consultation = await consultationHorsLigne();
    const generation = await generationHorsLigne();

    for (const vue of [consultation, generation]) {
      expect(within(vue.container).getByRole('status')).toHaveTextContent(HORS_LIGNE);
      expect(within(vue.container).getAllByRole('button', { name: 'Réessayer' })).toHaveLength(1);
    }
    expect(screen.getAllByRole('button', { name: 'Réessayer' })).toHaveLength(2);
  });
});
