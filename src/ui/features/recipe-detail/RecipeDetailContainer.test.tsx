import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { type GetRecipe } from '../../../domain/use-cases/get-recipe';
import { IngredientBuilder } from '../../../domain/test-builders/ingredient.builder';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../store/create-test-store';
import { RecipeDetailContainer } from './RecipeDetailContainer';

function renderAt(id: string, getRecipe: GetRecipe) {
  const store = createTestStore({ getRecipe });
  const view = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/catalogue/${id}`]}>
        <Routes>
          <Route path="/catalogue/:id" element={<RecipeDetailContainer />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
  return { store, ...view };
}

describe('RecipeDetailContainer', () => {
  it('charge la recette de l’URL et affiche titre, convives et ingrédients', async () => {
    const recipe = RecipeBuilder.aRecipe()
      .withId('r-1')
      .withTitle('Ratatouille')
      .withConvivesReference(4)
      .withIngredients([
        IngredientBuilder.anIngredient()
          .withName('Tomates')
          .withQuantity(200)
          .withUnit('g')
          .build(),
        IngredientBuilder.anIngredient().withName('Œufs').withQuantity(3).withUnit('piece').build(),
      ])
      .build();
    const getRecipe: GetRecipe = async () => recipe;

    renderAt('r-1', getRecipe);

    expect(await screen.findByText('Ratatouille')).toBeInTheDocument();
    expect(screen.getByText(/Pour 4 convives/)).toBeInTheDocument();
    expect(screen.getByText('Tomates')).toBeInTheDocument();
    expect(screen.getByText('200 g')).toBeInTheDocument();
    expect(screen.getByText('Œufs')).toBeInTheDocument();
    expect(screen.getByText('3 pièce')).toBeInTheDocument();
  });

  it('accorde « convive » au singulier pour une recette à 1 convive', async () => {
    const recipe = RecipeBuilder.aRecipe().withId('r-solo').withConvivesReference(1).build();
    const getRecipe: GetRecipe = async () => recipe;

    renderAt('r-solo', getRecipe);

    expect(await screen.findByText('Pour 1 convive')).toBeInTheDocument();
    expect(screen.queryByText('Pour 1 convives')).not.toBeInTheDocument();
  });

  it('accorde « convives » au pluriel dès 2 convives', async () => {
    const recipe = RecipeBuilder.aRecipe().withId('r-duo').withConvivesReference(2).build();
    const getRecipe: GetRecipe = async () => recipe;

    renderAt('r-duo', getRecipe);

    expect(await screen.findByText('Pour 2 convives')).toBeInTheDocument();
  });

  it('affiche la section Préparation avec les instructions quand elles existent', async () => {
    const recipe = RecipeBuilder.aRecipe()
      .withId('r-2')
      .withInstructions('Émincer puis mijoter 30 min.')
      .build();
    const getRecipe: GetRecipe = async () => recipe;

    renderAt('r-2', getRecipe);

    expect(await screen.findByText('Préparation')).toBeInTheDocument();
    expect(screen.getByText('Émincer puis mijoter 30 min.')).toBeInTheDocument();
  });

  it('gère explicitement l’absence de préparation', async () => {
    const recipe = RecipeBuilder.aRecipe().withId('r-3').withoutInstructions().build();
    const getRecipe: GetRecipe = async () => recipe;

    renderAt('r-3', getRecipe);

    expect(await screen.findByText('Aucune préparation')).toBeInTheDocument();
  });

  it('affiche « Recette introuvable » quand le use case ne trouve pas la recette', async () => {
    const getRecipe: GetRecipe = async () => undefined;

    renderAt('inconnu', getRecipe);

    expect(await screen.findByText('Recette introuvable')).toBeInTheDocument();
  });

  it('affiche un message d’échec sobre en erreur, sans exposer le message brut', async () => {
    const getRecipe: GetRecipe = async () => {
      throw new Error('Firestore down');
    };

    renderAt('r-1', getRecipe);

    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de charger la recette.');
    expect(screen.queryByText(/Firestore/i)).not.toBeInTheDocument();
  });

  it('affiche un indicateur de chargement tant que le use case n’a pas résolu', () => {
    const pending: GetRecipe = () => new Promise(() => {});

    renderAt('r-1', pending);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('recharge la recette quand l’id de l’URL change', async () => {
    const user = userEvent.setup();
    const r1 = RecipeBuilder.aRecipe().withId('r-1').withTitle('Recette Une').build();
    const r2 = RecipeBuilder.aRecipe().withId('r-2').withTitle('Recette Deux').build();
    const getRecipe: GetRecipe = async (id) => (id === 'r-1' ? r1 : r2);
    const store = createTestStore({ getRecipe });

    function Nav() {
      const navigate = useNavigate();
      return (
        <button type="button" onClick={() => navigate('/catalogue/r-2')}>
          aller-r2
        </button>
      );
    }

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/catalogue/r-1']}>
          <Nav />
          <Routes>
            <Route path="/catalogue/:id" element={<RecipeDetailContainer />} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    expect(await screen.findByText('Recette Une')).toBeInTheDocument();

    await user.click(screen.getByText('aller-r2'));

    expect(await screen.findByText('Recette Deux')).toBeInTheDocument();
  });

  // Caractérisation d'une branche défensive existante : `if (id !== undefined)`.
  // Sous une route sans paramètre :id, useParams().id vaut undefined ; le container
  // ne doit alors déclencher AUCUN chargement (et ne pas crasher).
  it('ne déclenche aucun chargement quand la route ne fournit pas d’id', () => {
    let calls = 0;
    const getRecipe: GetRecipe = async () => {
      calls += 1;
      return undefined;
    };
    const store = createTestStore({ getRecipe });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/sans-id']}>
          <Routes>
            <Route path="/sans-id" element={<RecipeDetailContainer />} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    expect(calls).toBe(0);
  });

  it('offre toujours un lien retour vers le catalogue', async () => {
    const recipe = RecipeBuilder.aRecipe().withId('r-1').withTitle('Ratatouille').build();

    renderAt('r-1', async () => recipe);
    await screen.findByText('Ratatouille');

    const link = screen.getByRole('link', { name: /catalogue/i });
    expect(link).toHaveAttribute('href', '/catalogue');
  });
});
