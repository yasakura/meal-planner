import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { beforeEach, describe, it, expect, vi } from 'vitest';

import { type Recipe } from '../../../domain/entities/recipe';
import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { type CreateRecipe, type CreateRecipeInput } from '../../../domain/use-cases/create-recipe';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../store/create-test-store';
import { deferred } from '../../test-utils/deferred';
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

// Même construction que le menu et les convives : « Aucune connexion — <l'opération> n'a pas pu
// être confirmé. ». L'opération est nommée comme le bouton et comme le constat d'échec voisin
// (« Impossible d'enregistrer la recette. »), qui est déjà le MÊME sur les deux écrans.
const CONSTAT_NON_ACQUITTE =
  'Aucune connexion — l’enregistrement de la recette n’a pas pu être confirmé.';

const nonAcquitte: CreateRecipe = () => Promise.reject(RepositoryUnavailableError.create());

// L'identifiant que le store de test pose à la naissance, et que le formulaire renouvelle à
// chacune de ses ouvertures : `StubIdGenerator` rend toujours le même.
const ID_DU_FORMULAIRE = 'generated-id-1';

// Un générateur qui rend un identifiant DIFFÉRENT à chaque appel, comme celui de production :
// le stub par défaut ne saurait pas distinguer « renouvelé » de « conservé ». `id-1` part à la
// naissance du store, le premier formulaire ouvert porte donc `id-2`.
function identifiantsSuccessifs() {
  let rang = 0;
  return () => `id-${++rang}`;
}

// Une saisie complète, prête à partir : le point de départ commun des scénarios d'écriture.
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

  // [guard] vert à l'écriture (activation dérivée du verrou de #2).
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
    // L'identifiant vient du BROUILLON ouvert, jamais du formulaire : le container n'en connaît
    // aucun, c'est le slice qui le joint à ce qu'il envoie.
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
  // Tue : le statut d'enregistrement non transmis à `isSubmitDisabled`
  // (`recipe-form-submission.ts`) ET/OU perdu dans `submitLabel`, resté dans ce container.
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
  // Tue : le titre non transmis à `isSubmitDisabled` (`recipe-form-submission.ts`).
  it('garde « Enregistrer » désactivé si le titre est vide malgré une ligne valide', async () => {
    const user = userEvent.setup();
    renderWithStore();

    await user.type(screen.getByLabelText(/nom/i), 'Poulet');
    await user.type(screen.getByLabelText(/quantité/i), '500');

    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeDisabled();
  });

  // [guard] vert à l'écriture. Verrouille qu'au moins une ligne valide est requise :
  // un titre ne suffit pas si aucune ligne n'est complète (nom sans quantité).
  // Tue : les lignes non transmises à `isSubmitDisabled` (`recipe-form-submission.ts`).
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
  // Tue : `validRowsOf` (`ingredient-rows.ts`) court-circuité -> createIngredient({name:''})
  // throw, ou 2 ingrédients forwardés.
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

  /**
   * Même règle qu'à la modification, même message, un seul endroit qui décide : une ligne
   * AMORCÉE mais incomplète n'est pas jetée en silence. Le bouton reste actif — il y a bien une
   * ligne valide —, c'est le clic qui refuse.
   */
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

  /** La SORTIE du constat, remède n° 1 : la ligne complétée, il s'efface et le submit repart. */
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
    // Le localisateur de l'absence affirmée juste après, vu ici en train de trouver son texte.
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

  /** La SORTIE du constat, remède n° 2 : retirer la ligne l'efface aussi. */
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

  // [guard] vert à l'écriture. Verrouille la borne stricte de quantité :
  // quantité = 0 => ligne non valide => bouton désactivé.
  // Tue : `quantity > 0` dans `isValidRow` (`ingredient-rows.ts`) muté en `>= 0`.
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
  // Tue : le `.trim()` du titre dans `isSubmitDisabled` (`recipe-form-submission.ts`).
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

  // [guard] vert à l'écriture : `isSubmitDisabled` ne référence pas instructions.
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
  /**
   * L'écriture est en FILE LOCALE, pas perdue : le constat ne demande rien à l'utilisateur, donc
   * `role="status"` (poli) et non `role="alert"` (assertif), réservé à l'échec réessayable.
   */
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

  /**
   * Le verrou d'envoi ne tient plus que pendant l'écriture. L'écriture non acquittée est PARTIE
   * avec l'identifiant du formulaire, et le second appui la réécrit AU MÊME endroit : il n'y a
   * plus de doublon à empêcher. La saisie, elle, reste en place — l'effacer ferait tout retaper.
   */
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

  /**
   * Ce qui rend ce réarmement sans danger, vu de l'écran : le second appui part sous le MÊME
   * identifiant — deux écritures d'une recette, jamais deux recettes. Et le constat de panne ne
   * PÉRIME pas : le verdict suivant prend sa place, ici la confirmation d'un envoi abouti.
   */
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

  /**
   * Le risque de symétrie du geste : un identifiant qui vivrait plus longtemps que son
   * formulaire ferait de la seconde recette l'ÉCRASEMENT de la première. Le store est
   * délibérément RÉUTILISÉ d'un render à l'autre — c'est le remontage qui doit en poser un neuf,
   * et un store recréé rendrait la garantie invisible.
   */
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

    // `id-3` est celui que le SUCCÈS du premier envoi a posé ; la réouverture, qui a lieu après,
    // en pose un quatrième. Deux documents distincts, ce que ce scénario examine.
    await vi.waitFor(() => expect(ids).toEqual(['id-2', 'id-4']));
  });

  /**
   * Le même risque, mais atteint ENTIÈREMENT à la souris et sans attendre le verdict : la barre
   * de navigation du bas n'est pas verrouillée pendant les 5 s de la borne d'acquittement.
   * Quitter le formulaire et le rouvrir pendant ce temps fait tomber l'ouverture sous le garde
   * « une écriture est en vol », qui REFUSE le renouvellement — et rien ne le rattrapait ensuite.
   * La seconde recette repartait alors sous l'identifiant de la première et l'écrasait.
   */
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

    // « Recettes » dans la barre du bas, puis « + » : l'écriture, elle, est toujours en vol.
    unmount();
    renderOn(store);
    // Le formulaire rouvert ne constate rien : aucun verdict n'est encore tombé. Le localisateur
    // est vu trouver son texte sur cet écran dans le scénario témoin voisin (« remonté sur le
    // MÊME store après une création réussie »), où il tient « Recette enregistrée. ».
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    // Le réseau revient : la PREMIÈRE écriture se règle, sur un formulaire déjà rouvert.
    enVol.resolve(RecipeBuilder.aRecipe().build());
    await vi.waitFor(() => expect(store.getState().recipe.status).toBe('success'));

    await saisirUneRecette(user);
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    // `id-3` a été tiré puis jeté par le garde à la réouverture : c'est le succès qui a posé
    // `id-4`. Deux documents distincts — la recette n° 1 survit.
    await vi.waitFor(() => expect(ids).toEqual(['id-2', 'id-4']));
  });

  /**
   * Rémanence : le store est un singleton de session, et `unconfirmed` est un constat
   * TRANSITOIRE. Resté en place, il rouvrirait le formulaire sur un constat qui parle d'une
   * recette précédente, alors qu'il parle d'un formulaire qui n'est plus là. Le store est
   * délibérément RÉUTILISÉ d'un render à l'autre : un store recréé ne détecterait rien.
   */
  it('remonté sur le MÊME store après un enregistrement non acquitté, rouvre un formulaire neuf', async () => {
    const user = userEvent.setup();
    const { store, unmount } = renderWithStore(nonAcquitte);

    await saisirUneRecette(user);
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));
    // Le localisateur de l'absence affirmée plus bas, vu ici en train de trouver son texte.
    expect(await screen.findByText(CONSTAT_NON_ACQUITTE)).toBeInTheDocument();

    unmount();
    renderOn(store);

    expect(screen.queryByText(CONSTAT_NON_ACQUITTE)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/titre/i)).toHaveValue('');
    expect(store.getState().recipe.status).toBe('idle');
  });
});
