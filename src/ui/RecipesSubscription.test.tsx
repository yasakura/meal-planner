import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { RecipeBuilder } from '../domain/test-builders/recipe.builder';
import { createTestStore } from '../test/create-test-store';
import { RecipeChannel } from './test-utils/recipe-channel';
import { catalogueRetried, selectCatalogue } from './features/catalogue/catalogue-slice';
import { RecipesSubscription } from './RecipesSubscription';

function renderSubscription(channel: RecipeChannel) {
  const store = createTestStore({ observeRecipes: channel.observeRecipes });
  const view = render(
    <Provider store={store}>
      <RecipesSubscription>
        <div>CONTENU</div>
      </RecipesSubscription>
    </Provider>,
  );
  return { store, ...view };
}

function uneRecette() {
  return [RecipeBuilder.aRecipe().withId('r-1').withTitle('Ratatouille').build()];
}

describe('RecipesSubscription', () => {
  it('monté, il pousse dans le store ce que le canal émet', () => {
    const channel = RecipeChannel.seededWith(uneRecette());

    const { store } = renderSubscription(channel);

    expect(selectCatalogue(store.getState()).recipes).toEqual(uneRecette());
  });

  it('rend ses children', () => {
    renderSubscription(RecipeChannel.seededWith(uneRecette()));

    expect(screen.getByText('CONTENU')).toBeInTheDocument();
  });

  it('n’ouvre qu’un seul abonnement, et le démontage le referme', () => {
    const channel = RecipeChannel.seededWith(uneRecette());

    const { unmount } = renderSubscription(channel);
    expect(channel.subscriptions).toBe(1);
    expect(channel.live).toBe(1);

    unmount();

    expect(channel.live).toBe(0);
  });

  it('une relance du catalogue rouvre un abonnement neuf, et n’en laisse pas deux ouverts', () => {
    const channel = RecipeChannel.refusingWith(new Error('Firestore down'));
    const { store } = renderSubscription(channel);
    expect(channel.subscriptions).toBe(1);

    act(() => {
      store.dispatch(catalogueRetried());
    });

    expect(channel.subscriptions).toBe(2);
    expect(channel.live).toBe(1);
  });

  it('une émission qui arrive après le montage remplace ce qui est en store', () => {
    const channel = RecipeChannel.seededWith(uneRecette());
    const { store } = renderSubscription(channel);

    const fraiches = [RecipeBuilder.aRecipe().withId('r-2').withTitle('Tian').build()];
    act(() => {
      channel.emit(fraiches);
    });

    expect(selectCatalogue(store.getState()).recipes).toEqual(fraiches);
  });
});
