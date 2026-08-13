import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { type GetRecipe } from '../../../domain/use-cases/get-recipe';
import { IngredientBuilder } from '../../../domain/test-builders/ingredient.builder';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../store/create-test-store';
import { RecipeDetailContainer } from './RecipeDetailContainer';

const OFFLINE_NOTICE = 'Aucune connexion — la recette n’a pas pu être chargée.';

function renderAt(id: string, getRecipe: GetRecipe) {
  const store = createTestStore({ getRecipe });
  return { store, ...renderAtWith(store, id) };
}

// Monte le container sur un store DONNÉ. Indispensable pour rejouer un aller-retour sur la
// route : en prod le store est un singleton de session (main.tsx), seul le container est
// démonté. Un test qui recréerait le store ne reproduirait aucune rémanence.
function renderAtWith(store: ReturnType<typeof createTestStore>, id: string) {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/catalogue/${id}`]}>
        <Routes>
          <Route path="/catalogue/:id" element={<RecipeDetailContainer />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('RecipeDetailContainer', () => {
  it('charge la recette de l’URL et affiche titre, personnes et ingrédients', async () => {
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
    expect(screen.getByText(/Pour 4 personnes/)).toBeInTheDocument();
    expect(screen.getByText('Tomates')).toBeInTheDocument();
    expect(screen.getByText('200 g')).toBeInTheDocument();
    expect(screen.getByText('Œufs')).toBeInTheDocument();
    expect(screen.getByText('3 pièce')).toBeInTheDocument();
  });

  it('accorde « personne » au singulier pour une recette à 1 personne', async () => {
    const recipe = RecipeBuilder.aRecipe().withId('r-solo').withConvivesReference(1).build();
    const getRecipe: GetRecipe = async () => recipe;

    renderAt('r-solo', getRecipe);

    expect(await screen.findByText('Pour 1 personne')).toBeInTheDocument();
    expect(screen.queryByText('Pour 1 personnes')).not.toBeInTheDocument();
  });

  it('accorde « personnes » au pluriel dès 2 personnes', async () => {
    const recipe = RecipeBuilder.aRecipe().withId('r-duo').withConvivesReference(2).build();
    const getRecipe: GetRecipe = async () => recipe;

    renderAt('r-duo', getRecipe);

    expect(await screen.findByText('Pour 2 personnes')).toBeInTheDocument();
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

  it('offre toujours un lien retour vers la liste des recettes', async () => {
    const recipe = RecipeBuilder.aRecipe().withId('r-1').withTitle('Ratatouille').build();

    renderAt('r-1', async () => recipe);
    await screen.findByText('Ratatouille');

    // Libellé « ← Recettes » (renommage visible) ; la route de retour reste /catalogue.
    const link = screen.getByRole('link', { name: /recettes/i });
    expect(link).toHaveAttribute('href', '/catalogue');
  });

  // Hors ligne, `getDoc` servait le cache et rendait un snapshot inexistant : l'écran
  // affirmait « Recette introuvable ». Il affirmait l'inexistence d'une recette qu'il
  // n'avait pas pu lire — le pire des trois constats possibles, parce qu'il est définitif.
  it('hors ligne, l’app dit qu’elle n’a pas pu charger la recette — jamais qu’elle est introuvable', async () => {
    renderAt('r-1', () => Promise.reject(RepositoryUnavailableError.create()));

    expect(await screen.findByText(OFFLINE_NOTICE)).toBeInTheDocument();
    expect(screen.queryByText('Recette introuvable')).not.toBeInTheDocument();
    expect(screen.queryByText('Impossible de charger la recette.')).not.toBeInTheDocument();
  });

  // Filet sur la couche de RENDU : stryker ne mute pas les .tsx, `RecipeDetailScreen.tsx`
  // n'a donc aucun mutant pour attraper une fusion de `unavailable` avec `error` ou
  // `notFound`, qui s'annoncent tous deux en `alert`. Une absence de réseau est un constat,
  // pas une alerte : rien n'est attendu de l'utilisateur dans l'immédiat.
  it('le constat hors-ligne est annoncé poliment, jamais comme une alerte', async () => {
    renderAt('r-1', () => Promise.reject(RepositoryUnavailableError.create()));
    await screen.findByText(OFFLINE_NOTICE);

    expect(screen.getByRole('status')).toHaveTextContent(OFFLINE_NOTICE);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // Un écran qui ne peut rien afficher doit au minimum rester quittable : sans le lien
  // retour, l'utilisateur hors ligne se retrouve coincé sur une page vide.
  it('hors ligne, le lien retour vers la liste reste accessible', async () => {
    renderAt('r-1', () => Promise.reject(RepositoryUnavailableError.create()));
    await screen.findByText(OFFLINE_NOTICE);

    expect(screen.getByRole('link', { name: /recettes/i })).toHaveAttribute('href', '/catalogue');
  });

  // Rémanence : le store est un singleton de session, seul le container est démonté quand on
  // quitte la route. Le constat hors-ligne ne doit pas survivre à la consultation suivante,
  // sinon l'écran afficherait la recette ET « aucune connexion » (le défaut vécu sur le
  // foyer).
  it('un rechargement réussi au remontage efface le constat hors-ligne, sur le MÊME store', async () => {
    let offline = true;
    const flaky: GetRecipe = async () => {
      if (offline) throw RepositoryUnavailableError.create();
      return RecipeBuilder.aRecipe().withId('r-1').withTitle('Ratatouille').build();
    };
    const store = createTestStore({ getRecipe: flaky });
    const { unmount } = renderAtWith(store, 'r-1');
    await screen.findByText(OFFLINE_NOTICE);

    offline = false;
    unmount();
    renderAtWith(store, 'r-1');

    expect(await screen.findByText('Ratatouille')).toBeInTheDocument();
    expect(screen.queryByText(OFFLINE_NOTICE)).not.toBeInTheDocument();
  });
});
