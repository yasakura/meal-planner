import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { AccountBuilder } from '../domain/test-builders/account.builder';
import { ConviveBuilder } from '../domain/test-builders/convive.builder';
import { RecipeBuilder } from '../domain/test-builders/recipe.builder';
import { createTestStore } from '../test/create-test-store';
import { DataSubscription } from './DataSubscription';
import { ConviveChannel } from './test-utils/convive-channel';
import { RecipeChannel } from './test-utils/recipe-channel';
import { authStateChanged } from './features/auth/auth-slice';
import { CatalogueContainer } from './features/catalogue/CatalogueContainer';
import { LinkBanner } from './LinkBanner';
import { recipesObservationFailed, recipesObserved } from './features/catalogue/catalogue-slice';
import { convivesObservationFailed, convivesObserved } from './features/convives/convives-slice';

const LIEN_PERDU = 'Lien perdu — l’écran ne se met plus à jour.';

function uneRecette() {
  return [RecipeBuilder.aRecipe().withId('r-1').withTitle('Ratatouille').build()];
}

function renderAbonne(channel: RecipeChannel, convives = ConviveChannel.silent()) {
  const store = createTestStore({
    observeRecipes: channel.observeRecipes,
    observeConvives: convives.observeConvives,
  });
  const view = render(
    <Provider store={store}>
      <MemoryRouter>
        <DataSubscription>
          <CatalogueContainer />
          <LinkBanner />
        </DataSubscription>
      </MemoryRouter>
    </Provider>,
  );
  return { store, channel, convives, ...view };
}

function renderBandeauSeul(store: ReturnType<typeof createTestStore>) {
  return render(
    <Provider store={store}>
      <LinkBanner />
    </Provider>,
  );
}

describe('LinkBanner', () => {
  it('une panne après émission annonce le lien perdu, là où la même panne sans émission n’annonce rien du tout', async () => {
    const { channel } = renderAbonne(RecipeChannel.seededWith(uneRecette()));
    await screen.findByText('Ratatouille');

    act(() => {
      channel.fail(new Error('Firestore down'));
    });

    expect(screen.getByText(LIEN_PERDU)).toBeInTheDocument();

    renderAbonne(RecipeChannel.refusingWith(new Error('Firestore down')));

    expect(screen.getAllByText(LIEN_PERDU)).toHaveLength(1);
  });

  it('le bandeau s’ajoute aux recettes déjà affichées, il ne les remplace pas', async () => {
    const { channel } = renderAbonne(RecipeChannel.seededWith(uneRecette()));
    await screen.findByText('Ratatouille');

    act(() => {
      channel.fail(new Error('Firestore down'));
    });

    expect(screen.getByText(LIEN_PERDU)).toBeInTheDocument();
    expect(screen.getByText('Ratatouille')).toBeInTheDocument();
  });

  it('« Réessayer » rouvre un abonnement neuf, et le bandeau s’efface dès que l’émission arrive', async () => {
    const user = userEvent.setup();
    const { channel } = renderAbonne(RecipeChannel.seededWith(uneRecette()));
    await screen.findByText('Ratatouille');
    act(() => {
      channel.fail(new Error('Firestore down'));
    });
    expect(screen.getByText(LIEN_PERDU)).toBeInTheDocument();

    channel.willEmit(uneRecette());
    await user.click(screen.getByRole('button', { name: /réessayer/i }));

    expect(channel.subscriptions).toBe(2);
    expect(screen.queryByText(LIEN_PERDU)).not.toBeInTheDocument();
    expect(screen.getByText('Ratatouille')).toBeInTheDocument();
  });

  it('une relance qui échoue à nouveau ramène le bandeau, sans vider l’écran des recettes déjà lues', async () => {
    const user = userEvent.setup();
    const { channel } = renderAbonne(RecipeChannel.seededWith(uneRecette()));
    await screen.findByText('Ratatouille');
    act(() => {
      channel.fail(new Error('Firestore down'));
    });

    await user.click(screen.getByRole('button', { name: /réessayer/i }));

    expect(channel.subscriptions).toBe(2);
    expect(screen.getByText(LIEN_PERDU)).toBeInTheDocument();
    expect(screen.getByText('Ratatouille')).toBeInTheDocument();
  });

  it('démonté puis remonté sur le MÊME store, le bandeau est toujours là : un remontage ne rétablit aucun lien', () => {
    const store = createTestStore();
    store.dispatch(recipesObserved(uneRecette()));
    store.dispatch(recipesObservationFailed({ unavailable: true }));
    const { unmount } = renderBandeauSeul(store);
    expect(screen.getByText(LIEN_PERDU)).toBeInTheDocument();

    unmount();
    renderBandeauSeul(store);

    expect(screen.getByText(LIEN_PERDU)).toBeInTheDocument();
  });

  it('la déconnexion emporte le bandeau, et la session suivante ne le retrouve pas au remontage', () => {
    const store = createTestStore();
    store.dispatch(recipesObserved(uneRecette()));
    store.dispatch(recipesObservationFailed({ unavailable: true }));
    const { unmount } = renderBandeauSeul(store);
    expect(screen.getByText(LIEN_PERDU)).toBeInTheDocument();

    act(() => {
      store.dispatch(authStateChanged(null));
    });

    expect(screen.queryByText(LIEN_PERDU)).not.toBeInTheDocument();

    unmount();
    act(() => {
      store.dispatch(authStateChanged(AccountBuilder.anAccount().build()));
    });
    renderBandeauSeul(store);

    expect(screen.queryByText(LIEN_PERDU)).not.toBeInTheDocument();
  });

  it('une panne du flux convives après émission annonce le même lien perdu que celle des recettes', async () => {
    const { convives } = renderAbonne(
      RecipeChannel.seededWith(uneRecette()),
      ConviveChannel.seededWith([ConviveBuilder.aConvive().withId('c-1').withName('Zoé').build()]),
    );
    await screen.findByText('Ratatouille');
    expect(screen.queryByText(LIEN_PERDU)).not.toBeInTheDocument();

    act(() => {
      convives.fail(new Error('Firestore down'));
    });

    expect(screen.getByText(LIEN_PERDU)).toBeInTheDocument();
  });

  it('une panne du flux convives SANS émission n’annonce rien : l’écran du foyer porte déjà son constat', async () => {
    renderAbonne(
      RecipeChannel.seededWith(uneRecette()),
      ConviveChannel.refusingWith(new Error('Firestore down')),
    );
    await screen.findByText('Ratatouille');

    expect(screen.queryByText(LIEN_PERDU)).not.toBeInTheDocument();
  });

  it('les deux flux tombés, le retour des seules recettes ne relève pas le bandeau : le foyer reste perdu', async () => {
    const { channel, convives } = renderAbonne(
      RecipeChannel.seededWith(uneRecette()),
      ConviveChannel.seededWith([ConviveBuilder.aConvive().withId('c-1').withName('Zoé').build()]),
    );
    await screen.findByText('Ratatouille');

    act(() => {
      channel.fail(new Error('Firestore down'));
      convives.fail(new Error('Firestore down'));
    });
    expect(screen.getAllByText(LIEN_PERDU)).toHaveLength(1);

    act(() => {
      channel.emit(uneRecette());
    });

    expect(screen.getAllByText(LIEN_PERDU)).toHaveLength(1);
  });

  it('« Réessayer » relance les deux flux, pas seulement celui qui est tombé', async () => {
    const user = userEvent.setup();
    const { channel, convives } = renderAbonne(
      RecipeChannel.seededWith(uneRecette()),
      ConviveChannel.seededWith([ConviveBuilder.aConvive().withId('c-1').withName('Zoé').build()]),
    );
    await screen.findByText('Ratatouille');
    act(() => {
      convives.fail(new Error('Firestore down'));
    });
    expect(screen.getByText(LIEN_PERDU)).toBeInTheDocument();

    convives.willEmit([ConviveBuilder.aConvive().withId('c-1').withName('Zoé').build()]);
    await user.click(screen.getByRole('button', { name: /réessayer/i }));

    expect(convives.subscriptions).toBe(2);
    expect(channel.subscriptions).toBe(2);
    expect(screen.queryByText(LIEN_PERDU)).not.toBeInTheDocument();
  });

  it('la déconnexion emporte aussi le bandeau né d’une panne du flux convives', () => {
    const store = createTestStore();
    store.dispatch(
      convivesObserved([ConviveBuilder.aConvive().withId('c-1').withName('Zoé').build()]),
    );
    store.dispatch(convivesObservationFailed({ unavailable: true }));
    renderBandeauSeul(store);
    expect(screen.getByText(LIEN_PERDU)).toBeInTheDocument();

    act(() => {
      store.dispatch(authStateChanged(null));
    });

    expect(screen.queryByText(LIEN_PERDU)).not.toBeInTheDocument();
  });
});
