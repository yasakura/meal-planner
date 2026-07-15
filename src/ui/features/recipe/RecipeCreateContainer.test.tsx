import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { type Recipe } from '../../../domain/entities/recipe';
import { type CreateRecipe, type CreateRecipeInput } from '../../../domain/use-cases/create-recipe';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../store/create-test-store';
import { RecipeCreateContainer } from './RecipeCreateContainer';

function renderWithStore(createRecipe?: CreateRecipe) {
  const store = createTestStore(createRecipe ? { createRecipe } : undefined);
  const view = render(
    <Provider store={store}>
      <RecipeCreateContainer />
    </Provider>,
  );
  return { store, ...view };
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
  it('rend le titre, une ligne ingrédient, le champ convives (=4) et les boutons ajouter/enregistrer', () => {
    renderWithStore();

    expect(screen.getByLabelText(/titre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nom/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/quantité/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/unité/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/convives/i)).toHaveValue(4);
    expect(screen.getByRole('button', { name: /ajouter un ingrédient/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeInTheDocument();
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

  it('convives éditable : passé à 2, il est forwardé comme convivesReference', async () => {
    const user = userEvent.setup();
    const spy = capturingSpy();
    renderWithStore(spy.fn);

    const convives = screen.getByLabelText(/convives/i);
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
});
