import { useLayoutEffect } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { type GetRecipe } from '../../../domain/use-cases/get-recipe';
import { IngredientBuilder } from '../../../domain/test-builders/ingredient.builder';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { useAppSelector } from '../../store/hooks';
import { createTestStore } from '../../store/create-test-store';
import { RecipeDetailContainer } from './RecipeDetailContainer';
import { selectRecipeDetail } from './recipe-detail-slice';

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

type Frame = { texte: string; liensModifier: (string | null)[] };

/**
 * Le DOM tel qu'il est PEINT, frame par frame. `useLayoutEffect` s'exécute une fois le DOM du
 * commit posé et AVANT tout `useEffect` passif du même commit : la sonde voit donc l'écran tel
 * qu'il est rendu au montage, avant que le chargement déclenché par le container n'ait remis la
 * recette du store à `null`. C'est la seule fenêtre où la frame périmée existe — la RTL, qui
 * n'inspecte le DOM qu'une fois les effets purgés, ne peut pas l'observer autrement.
 *
 * La sonde s'abonne au MÊME état que le container, pour être re-rendue dans les mêmes commits
 * que lui et ne manquer aucune frame.
 */
function SondeDeFrames(props: { frames: Frame[] }) {
  useAppSelector(selectRecipeDetail);
  useLayoutEffect(() => {
    props.frames.push({
      texte: document.body.textContent ?? '',
      liensModifier: Array.from(document.querySelectorAll('a'))
        .filter((lien) => lien.textContent === 'Modifier')
        .map((lien) => lien.getAttribute('href')),
    });
  });
  return null;
}

function renderAvecSonde(store: ReturnType<typeof createTestStore>, id: string) {
  const frames: Frame[] = [];
  const vue = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/catalogue/${id}`]}>
        <Routes>
          <Route path="/catalogue/:id" element={<RecipeDetailContainer />} />
        </Routes>
        <SondeDeFrames frames={frames} />
      </MemoryRouter>
    </Provider>,
  );
  return { frames, ...vue };
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
  /**
   * Point d'entrée de la modification (FR — « Modifier une recette »). C'est un LIEN et non un
   * <button> : il ne fait que changer de route, et l'application ouvre déjà la création par un
   * lien (« Ajouter une recette »). L'affordance visuelle est celle d'un bouton ; la sémantique
   * reste celle d'une navigation, donc adressable, ouvrable dans un onglet, empilée dans
   * l'historique.
   */
  it('offre un accès « Modifier » vers le formulaire d’édition de CETTE recette', async () => {
    const recipe = RecipeBuilder.aRecipe().withId('r-1').withTitle('Ratatouille').build();

    renderAt('r-1', async () => recipe);
    await screen.findByText('Ratatouille');

    expect(screen.getByRole('link', { name: 'Modifier' })).toHaveAttribute(
      'href',
      '/catalogue/r-1/modifier',
    );
  });

  it('vise la recette RÉELLEMENT affichée, pas un identifiant figé', async () => {
    const recipe = RecipeBuilder.aRecipe().withId('r-42').withTitle('Ratatouille').build();

    renderAt('r-42', async () => recipe);
    await screen.findByText('Ratatouille');

    expect(screen.getByRole('link', { name: 'Modifier' })).toHaveAttribute(
      'href',
      '/catalogue/r-42/modifier',
    );
  });

  // Une recette qu'on n'a pas pu lire n'est pas modifiable : proposer « Modifier » ouvrirait un
  // formulaire sur du vide. Le localisateur est vu trouver son lien dans les deux tests
  // ci-dessus — c'est ce qui rend cette absence discriminante.
  it('n’offre pas « Modifier » quand la recette est introuvable', async () => {
    renderAt('r-inconnue', async () => undefined);

    expect(await screen.findByRole('alert')).toHaveTextContent('Recette introuvable');
    expect(screen.queryByRole('link', { name: 'Modifier' })).not.toBeInTheDocument();
  });
  /**
   * Catalogue → détail `r-1` → catalogue → détail `r-2`. Au montage du second écran, et AVANT
   * que l'effet n'ait lancé le chargement, le store porte encore `success` et la recette `r-1` :
   * l'écran peint une frame du détail de `r-1` sous l'URL de `r-2`, lien « Modifier » compris.
   *
   * La règle qui l'interdit — « c'est bien CELLE de la route » — vit dans `recipe-for-route.ts`,
   * dans un `.ts` que Stryker mute. Ce test-ci ne juge que sa CONSOMMATION par le container.
   */
  it('ne peint jamais, fût-ce une frame, la recette précédente sous l’URL de la suivante', async () => {
    const r1 = RecipeBuilder.aRecipe().withId('r-1').withTitle('Recette Une').build();
    const r2 = RecipeBuilder.aRecipe().withId('r-2').withTitle('Recette Deux').build();
    const getRecipe: GetRecipe = async (id) => (id === 'r-1' ? r1 : r2);
    const store = createTestStore({ getRecipe });

    const { unmount } = renderAtWith(store, 'r-1');
    await screen.findByText('Recette Une');
    unmount();

    const { frames } = renderAvecSonde(store, 'r-2');
    await screen.findByText('Recette Deux');

    // TÉMOIN des deux absences affirmées ensuite : la MÊME sonde, avec les MÊMES localisateurs,
    // vue trouver un titre et un lien « Modifier » là où ils ont le droit d'être. Sans lui, une
    // sonde aveugle rendrait les deux `toHaveLength(0)` verts sans rien garantir.
    expect(
      frames.filter(
        (frame) =>
          frame.texte.includes('Recette Deux') &&
          frame.liensModifier.includes('/catalogue/r-2/modifier'),
      ).length,
    ).toBeGreaterThan(0);

    expect(frames.filter((frame) => frame.texte.includes('Recette Une'))).toHaveLength(0);
    expect(
      frames.filter((frame) => frame.liensModifier.includes('/catalogue/r-1/modifier')),
    ).toHaveLength(0);
  });

  /**
   * Second volet de la branche `id === undefined` déjà caractérisée plus haut : sans identifiant
   * aucun chargement n'est lancé, donc RIEN ne vient chasser du store la recette précédemment
   * consultée. C'est le seul cas où la frame périmée est PERMANENTE — et le seul que la RTL
   * observe sans sonde.
   */
  it('sous une route sans identifiant, ne montre pas la dernière recette consultée', async () => {
    const r1 = RecipeBuilder.aRecipe().withId('r-1').withTitle('Recette Une').build();
    const store = createTestStore({ getRecipe: async () => r1 });

    const { unmount } = renderAtWith(store, 'r-1');
    // Le localisateur de l'absence affirmée plus bas, vu ici trouver son texte.
    expect(await screen.findByText('Recette Une')).toBeInTheDocument();
    unmount();

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/sans-id']}>
          <Routes>
            <Route path="/sans-id" element={<RecipeDetailContainer />} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByText('Chargement…')).toBeInTheDocument();
    expect(screen.queryByText('Recette Une')).not.toBeInTheDocument();
  });
});
