import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { beforeEach, describe, it, expect, vi } from 'vitest';

import { type Recipe } from '../../../domain/entities/recipe';
import { type CreateRecipe, type CreateRecipeInput } from '../../../domain/use-cases/create-recipe';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../store/create-test-store';
import { RecipeCreateContainer } from './RecipeCreateContainer';

// La page de création navigue vers /catalogue à l'enregistrement réussi (useNavigate) et expose
// un lien retour (Link) → montage sous <Router> requis ; on espionne la navigation.
const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

beforeEach(() => {
  mockNavigate.mockClear();
});

type TestStore = ReturnType<typeof createTestStore>;

// Monter sur une instance de store DONNÉE est la seule façon de reproduire la rémanence :
// le store applicatif est un singleton de session, un store neuf par montage la masque.
function renderOn(store: TestStore) {
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <RecipeCreateContainer />
      </MemoryRouter>
    </Provider>,
  );
}

function renderWithStore(createRecipe?: CreateRecipe) {
  const store = createTestStore(createRecipe ? { createRecipe } : undefined);
  return { store, ...renderOn(store) };
}

function capturingSpy() {
  const savedRecipe: Recipe = RecipeBuilder.aRecipe().build();
  const state: { captured: CreateRecipeInput | undefined } = { captured: undefined };
  const fn: CreateRecipe = async (input) => {
    state.captured = input;
    return savedRecipe;
  };
  return { fn, state };
}

describe('RecipeCreateContainer', () => {
  it('rend le titre, une ligne ingrédient, le champ personnes (=4) et les boutons ajouter/enregistrer', () => {
    renderWithStore();

    expect(screen.getByLabelText(/titre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nom/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/quantité/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/unité/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/personnes/i)).toHaveValue(4);
    expect(screen.getByRole('button', { name: /ajouter un ingrédient/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeInTheDocument();
  });

  it('offre un lien retour « ← Recettes » vers /catalogue', () => {
    renderWithStore();

    expect(screen.getByRole('link', { name: /recettes/i })).toHaveAttribute('href', '/catalogue');
  });

  it('navigue vers /catalogue après un enregistrement réussi', async () => {
    const user = userEvent.setup();
    const spy = capturingSpy();
    renderWithStore(spy.fn);

    await user.type(screen.getByLabelText(/titre/i), 'Poulet rôti');
    await user.type(screen.getByLabelText(/nom/i), 'Poulet');
    await user.type(screen.getByLabelText(/quantité/i), '500');
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/catalogue'));
  });

  it('ne navigue pas si l’enregistrement échoue (reste sur la page)', async () => {
    const user = userEvent.setup();
    const failing: CreateRecipe = () => Promise.reject(new Error('Firestore indisponible'));
    renderWithStore(failing);

    await user.type(screen.getByLabelText(/titre/i), 'Poulet rôti');
    await user.type(screen.getByLabelText(/nom/i), 'Poulet');
    await user.type(screen.getByLabelText(/quantité/i), '500');
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    await screen.findByRole('alert');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('rend un intitulé de section « Ingrédients »', () => {
    renderWithStore();

    expect(screen.getByText('Ingrédients')).toBeInTheDocument();
  });

  it('désactive « Enregistrer » à l’ouverture (titre vide, ligne vide)', () => {
    renderWithStore();

    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeDisabled();
  });

  it('« Ajouter un ingrédient » ajoute une seconde ligne', async () => {
    const user = userEvent.setup();
    renderWithStore();

    expect(screen.getAllByLabelText(/nom/i)).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /ajouter un ingrédient/i }));

    expect(screen.getAllByLabelText(/nom/i)).toHaveLength(2);
  });

  it('supprimer une ligne la retire', async () => {
    const user = userEvent.setup();
    renderWithStore();

    await user.click(screen.getByRole('button', { name: /ajouter un ingrédient/i }));
    expect(screen.getAllByLabelText(/nom/i)).toHaveLength(2);

    const [firstRemove] = screen.getAllByRole('button', { name: /retirer l'ingrédient/i });
    if (!firstRemove) throw new Error('bouton « Retirer » introuvable');
    await user.click(firstRemove);

    expect(screen.getAllByLabelText(/nom/i)).toHaveLength(1);
  });

  // [guard] vert à l'écriture (activation dérivée du calcul submitDisabled de #2).
  // Verrouille la direction complémentaire + le câblage onChange→state des 3 champs
  // (titre + nom + quantité) qui pilotent l'activation.
  it('active « Enregistrer » une fois titre + nom + quantité (>0) saisis', async () => {
    const user = userEvent.setup();
    renderWithStore();

    await user.type(screen.getByLabelText(/titre/i), 'Poulet rôti');
    await user.type(screen.getByLabelText(/nom/i), 'Poulet');
    await user.type(screen.getByLabelText(/quantité/i), '500');

    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeEnabled();
  });

  it('submit réussi : mappe les lignes valides et forwarde l’input, puis confirme', async () => {
    const user = userEvent.setup();
    const spy = capturingSpy();
    renderWithStore(spy.fn);

    await user.type(screen.getByLabelText(/titre/i), 'Poulet rôti');
    await user.type(screen.getByLabelText(/nom/i), 'Poulet');
    await user.type(screen.getByLabelText(/quantité/i), '500');
    await user.selectOptions(screen.getByLabelText(/unité/i), 'kg');
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(await screen.findByRole('status')).toHaveTextContent('Recette enregistrée.');
    expect(spy.state.captured).toEqual({
      title: 'Poulet rôti',
      ingredients: [{ name: 'Poulet', quantity: 500, unit: 'kg' }],
      convivesReference: 4,
      instructions: '',
    });
  });

  it('submit en échec : message sobre via role alert, sans le message technique', async () => {
    const user = userEvent.setup();
    const failing: CreateRecipe = () => Promise.reject(new Error('Firestore indisponible'));
    renderWithStore(failing);

    await user.type(screen.getByLabelText(/titre/i), 'Poulet rôti');
    await user.type(screen.getByLabelText(/nom/i), 'Poulet');
    await user.type(screen.getByLabelText(/quantité/i), '500');
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible d’enregistrer la recette.',
    );
    expect(screen.queryByText(/Firestore/i)).not.toBeInTheDocument();
  });

  it('le select d’unité propose les 5 unités (g, kg, ml, l, pièce)', () => {
    renderWithStore();

    const select = screen.getByLabelText(/unité/i);
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);

    expect(options).toEqual(['g', 'kg', 'ml', 'l', 'pièce']);
  });

  it('personnes éditable : passé à 2, il est forwardé comme convivesReference', async () => {
    const user = userEvent.setup();
    const spy = capturingSpy();
    renderWithStore(spy.fn);

    const convives = screen.getByLabelText(/personnes/i);
    await user.clear(convives);
    await user.type(convives, '2');

    await user.type(screen.getByLabelText(/titre/i), 'Poulet rôti');
    await user.type(screen.getByLabelText(/nom/i), 'Poulet');
    await user.type(screen.getByLabelText(/quantité/i), '500');
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(spy.state.captured?.convivesReference).toBe(2);
  });

  // [guard] vert à l'écriture (l'état saving existe déjà). Verrouille que pendant que
  // le save est en vol le bouton est désactivé ET porte le label « Enregistrement… ».
  // Tue : `status === 'saving'` dans submitDisabled ET/OU dans submitLabel (l.26-27).
  it('désactive « Enregistrer » et affiche « Enregistrement… » pendant que le save est en vol', async () => {
    const user = userEvent.setup();
    const pending: CreateRecipe = () => new Promise<Recipe>(() => {});
    renderWithStore(pending);

    await user.type(screen.getByLabelText(/titre/i), 'Poulet rôti');
    await user.type(screen.getByLabelText(/nom/i), 'Poulet');
    await user.type(screen.getByLabelText(/quantité/i), '500');
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    const button = await screen.findByRole('button', { name: /enregistrement/i });
    expect(button).toBeDisabled();
  });

  // [guard] vert à l'écriture. Verrouille que le titre est requis isolément :
  // une ligne valide ne suffit pas si le titre est vide.
  // Tue : `title.trim() === ''` dans submitDisabled (l.26).
  it('garde « Enregistrer » désactivé si le titre est vide malgré une ligne valide', async () => {
    const user = userEvent.setup();
    renderWithStore();

    await user.type(screen.getByLabelText(/nom/i), 'Poulet');
    await user.type(screen.getByLabelText(/quantité/i), '500');

    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeDisabled();
  });

  // [guard] vert à l'écriture. Verrouille qu'au moins une ligne valide est requise :
  // un titre ne suffit pas si aucune ligne n'est complète (nom sans quantité).
  // Tue : `validRows.length === 0` dans submitDisabled (l.26).
  it('garde « Enregistrer » désactivé si le titre est rempli mais aucune ligne valide', async () => {
    const user = userEvent.setup();
    renderWithStore();

    await user.type(screen.getByLabelText(/titre/i), 'Poulet rôti');
    await user.type(screen.getByLabelText(/nom/i), 'Poulet');
    // quantité laissée vide => ligne non valide

    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeDisabled();
  });

  // [guard] vert à l'écriture. Verrouille que la ligne résiduelle vide est filtrée au submit :
  // elle ne bloque pas l'activation ET n'est PAS mappée en ingrédient.
  // Tue : `.filter(isValidRow)` (l.25/32) -> createIngredient({name:''}) throw ou 2 ingrédients.
  it('filtre la ligne vide résiduelle au submit : une seule ligne valide est forwardée', async () => {
    const user = userEvent.setup();
    const spy = capturingSpy();
    renderWithStore(spy.fn);

    await user.type(screen.getByLabelText(/titre/i), 'Poulet rôti');
    await user.type(screen.getByLabelText(/nom/i), 'Tomates');
    await user.type(screen.getByLabelText(/quantité/i), '500');
    await user.click(screen.getByRole('button', { name: /ajouter un ingrédient/i }));

    const submit = screen.getByRole('button', { name: /enregistrer/i });
    expect(submit).toBeEnabled();
    await user.click(submit);

    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(spy.state.captured?.ingredients).toEqual([
      { name: 'Tomates', quantity: 500, unit: 'g' },
    ]);
  });

  // [guard] vert à l'écriture. Verrouille la borne stricte de quantité :
  // quantité = 0 => ligne non valide => bouton désactivé.
  // Tue : `quantity > 0` dans isValidRow (l.14) muté en `>= 0`.
  it('garde « Enregistrer » désactivé si la quantité vaut 0', async () => {
    const user = userEvent.setup();
    renderWithStore();

    await user.type(screen.getByLabelText(/titre/i), 'Poulet rôti');
    await user.type(screen.getByLabelText(/nom/i), 'Poulet');
    await user.type(screen.getByLabelText(/quantité/i), '0');

    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeDisabled();
  });

  // [guard] vert à l'écriture. Verrouille que le titre est trimé :
  // un titre composé uniquement d'espaces est traité comme vide => bouton désactivé.
  // Tue : `.trim()` sur le titre dans submitDisabled (l.26).
  it('garde « Enregistrer » désactivé si le titre ne contient que des espaces', async () => {
    const user = userEvent.setup();
    renderWithStore();

    await user.type(screen.getByLabelText(/titre/i), '   ');
    await user.type(screen.getByLabelText(/nom/i), 'Poulet');
    await user.type(screen.getByLabelText(/quantité/i), '500');

    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeDisabled();
  });

  it('rend un champ multi-lignes « Préparation »', () => {
    renderWithStore();

    const preparation = screen.getByRole('textbox', { name: /préparation/i });
    expect(preparation.tagName).toBe('TEXTAREA');
  });

  // Test clé : le textarea préserve les sauts de ligne à l'identique (\n et \n\n)
  // et l'input brut est forwardé au use-case sans normalisation dans le container.
  it('préserve les sauts de ligne de la préparation et forwarde l’input brut', async () => {
    const user = userEvent.setup();
    const spy = capturingSpy();
    renderWithStore(spy.fn);

    await user.type(screen.getByLabelText(/titre/i), 'Poulet rôti');
    await user.type(screen.getByLabelText(/nom/i), 'Poulet');
    await user.type(screen.getByLabelText(/quantité/i), '500');

    const preparation = screen.getByRole('textbox', { name: /préparation/i });
    fireEvent.change(preparation, { target: { value: 'Étape 1\n\n- sel\n- poivre' } });
    expect(preparation).toHaveValue('Étape 1\n\n- sel\n- poivre');

    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(spy.state.captured?.instructions).toBe('Étape 1\n\n- sel\n- poivre');
  });

  // [guard] vert à l'écriture : submitDisabled ne référence pas instructions.
  // Verrouille que la préparation ne gate PAS le submit et que l'input est forwardé
  // avec instructions vide (chaîne brute, non normalisée) quand rien n'est saisi.
  it('n’exige pas la préparation : submit activé et forwardé avec instructions vide', async () => {
    const user = userEvent.setup();
    const spy = capturingSpy();
    renderWithStore(spy.fn);

    await user.type(screen.getByLabelText(/titre/i), 'Poulet rôti');
    await user.type(screen.getByLabelText(/nom/i), 'Poulet');
    await user.type(screen.getByLabelText(/quantité/i), '500');

    const submit = screen.getByRole('button', { name: /enregistrer/i });
    expect(submit).toBeEnabled();
    await user.click(submit);

    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(spy.state.captured?.instructions).toBe('');
  });

  // Cycle de vie : le bouton « Enregistrer » est verrouillé pendant l'enregistrement, la barre de
  // navigation du bas ne l'est PAS. L'utilisateur peut donc quitter le formulaire pendant que la
  // sauvegarde est en vol. L'enregistrement aboutit normalement — la recette est bien créée, le
  // statut passe à 'success' —, mais un geste de navigation explicite prime sur la suite d'une
  // opération de fond : l'application ne le ramène pas au catalogue.
  it('un enregistrement qui aboutit après le départ de l’utilisateur ne le ramène pas au catalogue', async () => {
    const user = userEvent.setup();
    let resolveSave: ((recipe: Recipe) => void) | undefined;
    const deferred: CreateRecipe = () =>
      new Promise<Recipe>((resolve) => {
        resolveSave = resolve;
      });
    const { store, unmount } = renderWithStore(deferred);

    await user.type(screen.getByLabelText(/titre/i), 'Poulet rôti');
    await user.type(screen.getByLabelText(/nom/i), 'Poulet');
    await user.type(screen.getByLabelText(/quantité/i), '500');
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    // L'utilisateur quitte la page pendant que l'enregistrement est en vol.
    unmount();
    if (!resolveSave) throw new Error('l’enregistrement n’a pas été déclenché');
    resolveSave(RecipeBuilder.aRecipe().build());

    // L'enregistrement aboutit bel et bien : c'est ce qui rend l'absence de navigation ci-dessous
    // discriminante — la promesse s'est résolue, la suite du `then` a eu lieu.
    await vi.waitFor(() => expect(store.getState().recipe.status).toBe('success'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // Rémanence (issue #27) : en session réelle, revenir au catalogue puis rouvrir « + » est une
  // navigation CLIENT — le store survit, le container se remonte sur un statut resté 'success'.
  // Le montage doit donc repartir d'un formulaire neuf : pas de renavigation, pas de
  // confirmation périmée. Le store est délibérément RÉUTILISÉ d'un render à l'autre : un store
  // recréé ferait de chaque montage un « premier de la session » et ne pourrait rien détecter.
  it('remonté sur le MÊME store après une création réussie, rouvre un formulaire neuf sans renavigüer', async () => {
    const user = userEvent.setup();
    const spy = capturingSpy();
    const { store, unmount } = renderWithStore(spy.fn);

    await user.type(screen.getByLabelText(/titre/i), 'Poulet rôti');
    await user.type(screen.getByLabelText(/nom/i), 'Poulet');
    await user.type(screen.getByLabelText(/quantité/i), '500');
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    // Le localisateur de la confirmation, vu ici en train de la trouver : c'est ce qui rend
    // son absence plus bas discriminante plutôt que décorative.
    expect(await screen.findByRole('status')).toHaveTextContent('Recette enregistrée.');
    await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/catalogue'));

    unmount();
    mockNavigate.mockClear();
    renderOn(store);

    expect(screen.getByLabelText(/titre/i)).toHaveValue('');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
