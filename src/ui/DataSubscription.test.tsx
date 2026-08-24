import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { ConviveBuilder } from '../domain/test-builders/convive.builder';
import { RecipeBuilder } from '../domain/test-builders/recipe.builder';
import { createTestStore } from '../test/create-test-store';
import { ConviveChannel } from './test-utils/convive-channel';
import { RecipeChannel } from './test-utils/recipe-channel';
import { catalogueRetried, selectCatalogue } from './features/catalogue/catalogue-slice';
import { convivesRetried, selectConvives } from './features/convives/convives-slice';
import { DataSubscription } from './DataSubscription';

function renderSubscription(channel: RecipeChannel) {
  return renderChannels(channel, ConviveChannel.silent());
}

function renderConvives(convives: ConviveChannel) {
  return renderChannels(RecipeChannel.silent(), convives);
}

function renderChannels(recipes: RecipeChannel, convives: ConviveChannel) {
  const store = createTestStore({
    observeRecipes: recipes.observeRecipes,
    observeConvives: convives.observeConvives,
  });
  const view = render(
    <Provider store={store}>
      <DataSubscription>
        <div>CONTENU</div>
      </DataSubscription>
    </Provider>,
  );
  return { store, ...view };
}

function uneRecette() {
  return [RecipeBuilder.aRecipe().withId('r-1').withTitle('Ratatouille').build()];
}

function unConvive() {
  return [ConviveBuilder.aConvive().withId('c-1').withName('Aurélie').build()];
}

describe('DataSubscription', () => {
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

  it('monté, il pousse dans le store ce que le canal des convives émet', () => {
    const channel = ConviveChannel.seededWith(unConvive());

    const { store } = renderConvives(channel);

    expect(selectConvives(store.getState()).convives).toEqual(unConvive());
  });

  it('n’ouvre qu’un seul abonnement aux convives, et le démontage le referme', () => {
    const channel = ConviveChannel.seededWith(unConvive());

    const { unmount } = renderConvives(channel);
    expect(channel.subscriptions).toBe(1);
    expect(channel.live).toBe(1);

    unmount();

    expect(channel.live).toBe(0);
  });

  it('une relance du foyer rouvre un abonnement neuf, et n’en laisse pas deux ouverts', () => {
    const channel = ConviveChannel.refusingWith(new Error('Firestore down'));
    const { store } = renderConvives(channel);
    expect(channel.subscriptions).toBe(1);

    act(() => {
      store.dispatch(convivesRetried());
    });

    expect(channel.subscriptions).toBe(2);
    expect(channel.live).toBe(1);
  });

  it('une émission de convives qui arrive après le montage remplace ce qui est en store', () => {
    const channel = ConviveChannel.seededWith(unConvive());
    const { store } = renderConvives(channel);

    const frais = [ConviveBuilder.aConvive().withId('c-2').withName('Lionel').build()];
    act(() => {
      channel.emit(frais);
    });

    expect(selectConvives(store.getState()).convives).toEqual(frais);
  });

  it('une relance du catalogue ne rouvre pas l’abonnement aux convives', () => {
    const convives = ConviveChannel.seededWith(unConvive());
    const store = createTestStore({
      observeRecipes: RecipeChannel.silent().observeRecipes,
      observeConvives: convives.observeConvives,
    });
    render(
      <Provider store={store}>
        <DataSubscription>
          <div>CONTENU</div>
        </DataSubscription>
      </Provider>,
    );
    expect(convives.subscriptions).toBe(1);

    act(() => {
      store.dispatch(catalogueRetried());
    });

    expect(convives.subscriptions).toBe(1);
  });
});
