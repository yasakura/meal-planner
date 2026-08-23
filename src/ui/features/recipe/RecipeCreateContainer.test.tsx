import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { beforeEach, describe, it, expect, vi } from 'vitest';

import { type Recipe } from '../../../domain/entities/recipe';
import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { type CreateRecipe, type CreateRecipeInput } from '../../../domain/use-cases/create-recipe';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../../test/create-test-store';
import { deferred } from '../../test-utils/deferred';
import { RecipeCreateContainer } from './RecipeCreateContainer';

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

beforeEach(() => {
  mockNavigate.mockClear();
});

type TestStore = ReturnType<typeof createTestStore>;

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

const CONSTAT_NON_ACQUITTE =
  'Aucune connexion — l’enregistrement de la recette n’a pas pu être confirmé.';

const CONSTAT_ECHEC = 'Impossible d’enregistrer la recette.';

const nonAcquitte: CreateRecipe = () => Promise.reject(RepositoryUnavailableError.create());

const ID_DU_FORMULAIRE = 'generated-id-1';

function identifiantsSuccessifs() {
  let rang = 0;
  return () => `id-${++rang}`;
}

async function saisirUneRecette(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/titre/i), 'Poulet rôti');
  await user.type(screen.getByLabelText(/nom/i), 'Poulet');
  await user.type(screen.getByLabelText(/quantité/i), '500');
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
      id: ID_DU_FORMULAIRE,
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

  it('après un échec, le second envoi efface le constat de panne avant même d’aboutir', async () => {
    const user = userEvent.setup();
    const enVol = deferred<Recipe>();
    let appels = 0;
    const depot: CreateRecipe = () => {
      appels += 1;
      return appels === 1 ? Promise.reject(new Error('Firestore indisponible')) : enVol.promise;
    };
    renderWithStore(depot);

    await saisirUneRecette(user);
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));
    expect(await screen.findByText(CONSTAT_ECHEC)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(screen.queryByText(CONSTAT_ECHEC)).not.toBeInTheDocument();

    enVol.resolve(RecipeBuilder.aRecipe().build());
    expect(await screen.findByText('Recette enregistrée.')).toBeInTheDocument();
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

  it('garde « Enregistrer » désactivé si le titre est vide malgré une ligne valide', async () => {
    const user = userEvent.setup();
    renderWithStore();

    await user.type(screen.getByLabelText(/nom/i), 'Poulet');
    await user.type(screen.getByLabelText(/quantité/i), '500');

    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeDisabled();
  });

  it('garde « Enregistrer » désactivé si le titre est rempli mais aucune ligne valide', async () => {
    const user = userEvent.setup();
    renderWithStore();

    await user.type(screen.getByLabelText(/titre/i), 'Poulet rôti');
    await user.type(screen.getByLabelText(/nom/i), 'Poulet');

    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeDisabled();
  });

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

  it('refuse d’enregistrer une ligne amorcée mais incomplète, sans rien envoyer', async () => {
    const user = userEvent.setup();
    const spy = capturingSpy();
    renderWithStore(spy.fn);

    await user.type(screen.getByLabelText(/titre/i), 'Poulet rôti');
    await user.type(screen.getByLabelText(/nom/i), 'Tomates');
    await user.type(screen.getByLabelText(/quantité/i), '500');
    await user.click(screen.getByRole('button', { name: /ajouter un ingrédient/i }));

    const noms = screen.getAllByLabelText(/nom/i);
    const seconde = noms[1];
    if (!seconde) throw new Error('seconde ligne introuvable');
    await user.type(seconde, 'Basilic');

    const submit = screen.getByRole('button', { name: /enregistrer/i });
    expect(submit).toBeEnabled();
    await user.click(submit);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Complète ou retire les lignes d’ingrédient incomplètes.',
    );
    expect(spy.state.captured).toBeUndefined();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('la quantité saisie efface le constat et l’enregistrement repart', async () => {
    const user = userEvent.setup();
    const spy = capturingSpy();
    renderWithStore(spy.fn);

    await user.type(screen.getByLabelText(/titre/i), 'Poulet rôti');
    await user.type(screen.getByLabelText(/nom/i), 'Tomates');
    await user.type(screen.getByLabelText(/quantité/i), '500');
    await user.click(screen.getByRole('button', { name: /ajouter un ingrédient/i }));
    const secondNom = screen.getAllByLabelText(/nom/i)[1];
    if (!secondNom) throw new Error('seconde ligne introuvable');
    await user.type(secondNom, 'Basilic');
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));
    expect(
      await screen.findByText('Complète ou retire les lignes d’ingrédient incomplètes.'),
    ).toBeInTheDocument();

    const secondeQuantite = screen.getAllByLabelText(/quantité/i)[1];
    if (!secondeQuantite) throw new Error('seconde quantité introuvable');
    await user.type(secondeQuantite, '10');

    expect(
      screen.queryByText('Complète ou retire les lignes d’ingrédient incomplètes.'),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(spy.state.captured?.ingredients).toEqual([
      { name: 'Tomates', quantity: 500, unit: 'g' },
      { name: 'Basilic', quantity: 10, unit: 'g' },
    ]);
  });

  it('retirer la ligne incomplète efface le constat et laisse enregistrer', async () => {
    const user = userEvent.setup();
    const spy = capturingSpy();
    renderWithStore(spy.fn);

    await user.type(screen.getByLabelText(/titre/i), 'Poulet rôti');
    await user.type(screen.getByLabelText(/nom/i), 'Tomates');
    await user.type(screen.getByLabelText(/quantité/i), '500');
    await user.click(screen.getByRole('button', { name: /ajouter un ingrédient/i }));
    const secondNom = screen.getAllByLabelText(/nom/i)[1];
    if (!secondNom) throw new Error('seconde ligne introuvable');
    await user.type(secondNom, 'Basilic');
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));
    expect(
      await screen.findByText('Complète ou retire les lignes d’ingrédient incomplètes.'),
    ).toBeInTheDocument();

    const retirer = screen.getAllByRole('button', { name: /retirer l'ingrédient/i })[1];
    if (!retirer) throw new Error('bouton « Retirer » introuvable');
    await user.click(retirer);

    expect(
      screen.queryByText('Complète ou retire les lignes d’ingrédient incomplètes.'),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(spy.state.captured?.ingredients).toEqual([
      { name: 'Tomates', quantity: 500, unit: 'g' },
    ]);
  });

  it('garde « Enregistrer » désactivé si la quantité vaut 0', async () => {
    const user = userEvent.setup();
    renderWithStore();

    await user.type(screen.getByLabelText(/titre/i), 'Poulet rôti');
    await user.type(screen.getByLabelText(/nom/i), 'Poulet');
    await user.type(screen.getByLabelText(/quantité/i), '0');

    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeDisabled();
  });

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

    unmount();
    if (!resolveSave) throw new Error('l’enregistrement n’a pas été déclenché');
    resolveSave(RecipeBuilder.aRecipe().build());

    await vi.waitFor(() => expect(store.getState().recipe.status).toBe('success'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('remonté sur le MÊME store après une création réussie, rouvre un formulaire neuf sans renavigüer', async () => {
    const user = userEvent.setup();
    const spy = capturingSpy();
    const { store, unmount } = renderWithStore(spy.fn);

    await user.type(screen.getByLabelText(/titre/i), 'Poulet rôti');
    await user.type(screen.getByLabelText(/nom/i), 'Poulet');
    await user.type(screen.getByLabelText(/quantité/i), '500');
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

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
  it('hors ligne, l’enregistrement n’est pas confirmé : le constat est poli et n’accuse aucun échec', async () => {
    const user = userEvent.setup();
    renderWithStore(nonAcquitte);

    await saisirUneRecette(user);
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(CONSTAT_NON_ACQUITTE);
    expect(screen.queryByText('Impossible d’enregistrer la recette.')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('après un enregistrement non acquitté, « Enregistrer » se réarme et la saisie est conservée', async () => {
    const user = userEvent.setup();
    renderWithStore(nonAcquitte);

    await saisirUneRecette(user);
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));
    await screen.findByText(CONSTAT_NON_ACQUITTE);

    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeEnabled();
    expect(screen.getByLabelText(/titre/i)).toHaveValue('Poulet rôti');
    expect(screen.getByLabelText(/nom/i)).toHaveValue('Poulet');
  });

  it('le réseau revenu, réenvoyer réécrit le même document et solde le constat', async () => {
    const user = userEvent.setup();
    const ids: string[] = [];
    let enPanne = true;
    const depot: CreateRecipe = async (input) => {
      ids.push(input.id);
      if (enPanne) throw RepositoryUnavailableError.create();
      return RecipeBuilder.aRecipe().build();
    };
    renderWithStore(depot);

    await saisirUneRecette(user);
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));
    await screen.findByText(CONSTAT_NON_ACQUITTE);

    enPanne = false;
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(await screen.findByRole('status')).toHaveTextContent('Recette enregistrée.');
    expect(screen.queryByText(CONSTAT_NON_ACQUITTE)).not.toBeInTheDocument();
    expect(ids).toEqual([ID_DU_FORMULAIRE, ID_DU_FORMULAIRE]);
  });

  it('deux formulaires successifs sur le MÊME store écrivent deux documents distincts', async () => {
    const user = userEvent.setup();
    const ids: string[] = [];
    const depot: CreateRecipe = async (input) => {
      ids.push(input.id);
      return RecipeBuilder.aRecipe().build();
    };
    const store = createTestStore({ createRecipe: depot, newRecipeId: identifiantsSuccessifs() });
    const { unmount } = renderOn(store);

    await saisirUneRecette(user);
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));
    await vi.waitFor(() => expect(ids).toEqual(['id-2']));

    unmount();
    renderOn(store);
    await saisirUneRecette(user);
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    await vi.waitFor(() => expect(ids).toEqual(['id-2', 'id-4']));
  });

  it('rouvert PENDANT une écriture en vol, le formulaire n’écrase pas la recette en cours', async () => {
    const user = userEvent.setup();
    const ids: string[] = [];
    const enVol = deferred<Recipe>();
    let appels = 0;
    const depot: CreateRecipe = (input) => {
      ids.push(input.id);
      appels += 1;
      return appels === 1 ? enVol.promise : Promise.resolve(RecipeBuilder.aRecipe().build());
    };
    const store = createTestStore({ createRecipe: depot, newRecipeId: identifiantsSuccessifs() });
    const { unmount } = renderOn(store);

    await saisirUneRecette(user);
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));
    await vi.waitFor(() => expect(ids).toEqual(['id-2']));

    unmount();
    renderOn(store);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    enVol.resolve(RecipeBuilder.aRecipe().build());
    await vi.waitFor(() => expect(store.getState().recipe.status).toBe('success'));

    await saisirUneRecette(user);
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    await vi.waitFor(() => expect(ids).toEqual(['id-2', 'id-4']));
  });

  it('remonté sur le MÊME store après un enregistrement non acquitté, rouvre un formulaire neuf', async () => {
    const user = userEvent.setup();
    const { store, unmount } = renderWithStore(nonAcquitte);

    await saisirUneRecette(user);
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));
    expect(await screen.findByText(CONSTAT_NON_ACQUITTE)).toBeInTheDocument();

    unmount();
    renderOn(store);

    expect(screen.queryByText(CONSTAT_NON_ACQUITTE)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/titre/i)).toHaveValue('');
    expect(store.getState().recipe.status).toBe('idle');
  });
});
