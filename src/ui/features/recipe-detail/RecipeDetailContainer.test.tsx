import { useLayoutEffect } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

import { type Recipe } from '../../../domain/entities/recipe';
import { RepositoryUnavailableError } from '../../../domain/errors/repository-unavailable-error';
import { IngredientBuilder } from '../../../domain/test-builders/ingredient.builder';
import { RecipeBuilder } from '../../../domain/test-builders/recipe.builder';
import { createTestStore } from '../../../test/create-test-store';
import { DataSubscription } from '../../DataSubscription';
import { useAppSelector } from '../../store/hooks';
import { selectCatalogue } from '../catalogue/catalogue-slice';
import { RecipeChannel } from '../../test-utils/recipe-channel';
import { RecipeDetailContainer } from './RecipeDetailContainer';

const OFFLINE_NOTICE = 'Aucune connexion — la recette n’a pas pu être chargée.';

function storeSur(channel: RecipeChannel) {
  return createTestStore({ observeRecipes: channel.observeRecipes });
}

function renderAtPathWith(store: ReturnType<typeof createTestStore>, path: string) {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <DataSubscription>
          <Routes>
            <Route path="/catalogue/:id" element={<RecipeDetailContainer />} />
          </Routes>
        </DataSubscription>
      </MemoryRouter>
    </Provider>,
  );
}

function renderAt(id: string, recipes: Recipe[]) {
  const store = storeSur(RecipeChannel.seededWith(recipes));
  return { store, ...renderAtPathWith(store, `/catalogue/${id}`) };
}

function renderAtPath(path: string, recipes: Recipe[]) {
  return renderAtPathWith(storeSur(RecipeChannel.seededWith(recipes)), path);
}

function renderRefusant(id: string, error: unknown) {
  const channel = RecipeChannel.refusingWith(error);
  const store = storeSur(channel);
  return { store, channel, ...renderAtPathWith(store, `/catalogue/${id}`) };
}

type Frame = { chemin: string; texte: string; liensModifier: (string | null)[] };

function SondeDeFrames(props: { frames: Frame[] }) {
  useAppSelector(selectCatalogue);
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    props.frames.push({
      chemin: pathname,
      texte: document.body.textContent,
      liensModifier: Array.from(document.querySelectorAll('a'))
        .filter((lien) => lien.textContent === 'Modifier')
        .map((lien) => lien.getAttribute('href')),
    });
  });
  return null;
}

describe('RecipeDetailContainer', () => {
  it('montre la recette de l’URL et affiche titre, personnes et ingrédients', async () => {
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

    renderAt('r-1', [recipe]);

    expect(await screen.findByText('Ratatouille')).toBeInTheDocument();
    expect(screen.getByText(/Pour 4 personnes/)).toBeInTheDocument();
    expect(screen.getByText('Tomates')).toBeInTheDocument();
    expect(screen.getByText('200 g')).toBeInTheDocument();
    expect(screen.getByText('Œufs')).toBeInTheDocument();
    expect(screen.getByText('3 pièce')).toBeInTheDocument();
  });

  it('accorde « personne » au singulier pour une recette à 1 personne', async () => {
    const recipe = RecipeBuilder.aRecipe().withId('r-solo').withConvivesReference(1).build();

    renderAt('r-solo', [recipe]);

    expect(await screen.findByText('Pour 1 personne')).toBeInTheDocument();
    expect(screen.queryByText('Pour 1 personnes')).not.toBeInTheDocument();
  });

  it('accorde « personnes » au pluriel dès 2 personnes', async () => {
    const recipe = RecipeBuilder.aRecipe().withId('r-duo').withConvivesReference(2).build();

    renderAt('r-duo', [recipe]);

    expect(await screen.findByText('Pour 2 personnes')).toBeInTheDocument();
  });

  it('affiche la section Préparation avec les instructions quand elles existent', async () => {
    const recipe = RecipeBuilder.aRecipe()
      .withId('r-2')
      .withInstructions('Émincer puis mijoter 30 min.')
      .build();

    renderAt('r-2', [recipe]);

    expect(await screen.findByText('Préparation')).toBeInTheDocument();
    expect(screen.getByText('Émincer puis mijoter 30 min.')).toBeInTheDocument();
  });

  it('gère explicitement l’absence de préparation', async () => {
    const recipe = RecipeBuilder.aRecipe().withId('r-3').withoutInstructions().build();

    renderAt('r-3', [recipe]);

    expect(await screen.findByText('Aucune préparation')).toBeInTheDocument();
  });

  it('affiche « Recette introuvable » quand le catalogue émis ne porte pas cette recette', async () => {
    renderAt('inconnu', []);

    expect(await screen.findByText('Recette introuvable')).toBeInTheDocument();
  });

  it('affiche un message d’échec sobre en erreur, sans exposer le message brut', async () => {
    renderRefusant('r-1', new Error('Firestore down'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de charger la recette.');
    expect(screen.queryByText(/Firestore/i)).not.toBeInTheDocument();
  });

  it('affiche un indicateur de chargement tant que le canal n’a rien émis', () => {
    renderAtPathWith(storeSur(RecipeChannel.silent()), '/catalogue/r-1');

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('montre l’autre recette quand l’id de l’URL change', async () => {
    const user = userEvent.setup();
    const r1 = RecipeBuilder.aRecipe().withId('r-1').withTitle('Recette Une').build();
    const r2 = RecipeBuilder.aRecipe().withId('r-2').withTitle('Recette Deux').build();
    const store = storeSur(RecipeChannel.seededWith([r1, r2]));

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
          <DataSubscription>
            <Nav />
            <Routes>
              <Route path="/catalogue/:id" element={<RecipeDetailContainer />} />
            </Routes>
          </DataSubscription>
        </MemoryRouter>
      </Provider>,
    );

    expect(await screen.findByText('Recette Une')).toBeInTheDocument();

    await user.click(screen.getByText('aller-r2'));

    expect(await screen.findByText('Recette Deux')).toBeInTheDocument();
  });

  it('offre toujours un lien retour vers la liste des recettes', async () => {
    const recipe = RecipeBuilder.aRecipe().withId('r-1').withTitle('Ratatouille').build();

    renderAt('r-1', [recipe]);
    await screen.findByText('Ratatouille');

    const link = screen.getByRole('link', { name: /recettes/i });
    expect(link).toHaveAttribute('href', '/catalogue');
  });

  it('hors ligne, l’app dit qu’elle n’a pas pu charger la recette — jamais qu’elle est introuvable', async () => {
    renderRefusant('r-1', RepositoryUnavailableError.create());

    expect(await screen.findByText(OFFLINE_NOTICE)).toBeInTheDocument();
    expect(screen.queryByText('Recette introuvable')).not.toBeInTheDocument();
    expect(screen.queryByText('Impossible de charger la recette.')).not.toBeInTheDocument();
  });

  it('le constat hors-ligne est annoncé poliment, jamais comme une alerte', async () => {
    renderRefusant('r-1', RepositoryUnavailableError.create());
    await screen.findByText(OFFLINE_NOTICE);

    expect(screen.getByRole('status')).toHaveTextContent(OFFLINE_NOTICE);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('hors ligne, le lien retour vers la liste reste accessible', async () => {
    renderRefusant('r-1', RepositoryUnavailableError.create());
    await screen.findByText(OFFLINE_NOTICE);

    expect(screen.getByRole('link', { name: /recettes/i })).toHaveAttribute('href', '/catalogue');
  });

  it('une émission qui succède au constat hors-ligne met la recette à l’écran, sur le MÊME store', async () => {
    const { channel } = renderRefusant('r-1', RepositoryUnavailableError.create());
    await screen.findByText(OFFLINE_NOTICE);

    act(() => {
      channel.emit([RecipeBuilder.aRecipe().withId('r-1').withTitle('Ratatouille').build()]);
    });

    expect(screen.getByText('Ratatouille')).toBeInTheDocument();
    expect(screen.queryByText(OFFLINE_NOTICE)).not.toBeInTheDocument();
  });

  it('offre un accès « Modifier » vers le formulaire d’édition de CETTE recette', async () => {
    const recipe = RecipeBuilder.aRecipe().withId('r-1').withTitle('Ratatouille').build();

    renderAt('r-1', [recipe]);
    await screen.findByText('Ratatouille');

    expect(screen.getByRole('link', { name: 'Modifier' })).toHaveAttribute(
      'href',
      '/catalogue/r-1/modifier',
    );
  });

  it('vise la recette RÉELLEMENT affichée, pas un identifiant figé', async () => {
    const recipe = RecipeBuilder.aRecipe().withId('r-42').withTitle('Ratatouille').build();

    renderAt('r-42', [recipe]);
    await screen.findByText('Ratatouille');

    expect(screen.getByRole('link', { name: 'Modifier' })).toHaveAttribute(
      'href',
      '/catalogue/r-42/modifier',
    );
  });

  it('n’offre pas « Modifier » quand la recette est introuvable', async () => {
    renderAt('r-inconnue', []);

    expect(await screen.findByRole('alert')).toHaveTextContent('Recette introuvable');
    expect(screen.queryByRole('link', { name: 'Modifier' })).not.toBeInTheDocument();
  });

  it('changer d’id ne peint jamais, fût-ce une frame, la recette précédente sous l’URL de la suivante', async () => {
    const user = userEvent.setup();
    const r1 = RecipeBuilder.aRecipe().withId('r-1').withTitle('Recette Une').build();
    const r2 = RecipeBuilder.aRecipe().withId('r-2').withTitle('Recette Deux').build();
    const store = storeSur(RecipeChannel.seededWith([r1, r2]));
    const frames: Frame[] = [];

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/catalogue/r-1']}>
          <DataSubscription>
            <Link to="/catalogue/r-2">aller-ailleurs</Link>
            <Routes>
              <Route path="/catalogue/:id" element={<RecipeDetailContainer />} />
            </Routes>
            <SondeDeFrames frames={frames} />
          </DataSubscription>
        </MemoryRouter>
      </Provider>,
    );
    await screen.findByText('Recette Une');

    await user.click(screen.getByRole('link', { name: 'aller-ailleurs' }));
    await screen.findByText('Recette Deux');

    expect(
      frames.filter(
        (frame) => frame.chemin === '/catalogue/r-1' && frame.texte.includes('Recette Une'),
      ).length,
    ).toBeGreaterThan(0);

    expect(
      frames.filter(
        (frame) => frame.chemin === '/catalogue/r-2' && frame.texte.includes('Recette Une'),
      ),
    ).toHaveLength(0);

    expect(
      frames.filter(
        (frame) =>
          frame.chemin === '/catalogue/r-2' &&
          frame.liensModifier.includes('/catalogue/r-1/modifier'),
      ),
    ).toHaveLength(0);
    expect(
      frames.filter(
        (frame) =>
          frame.chemin === '/catalogue/r-2' &&
          frame.liensModifier.includes('/catalogue/r-2/modifier'),
      ).length,
    ).toBeGreaterThan(0);
  });

  it('sous une route sans identifiant, ne montre pas la dernière recette consultée', async () => {
    const r1 = RecipeBuilder.aRecipe().withId('r-1').withTitle('Recette Une').build();
    const store = storeSur(RecipeChannel.seededWith([r1]));

    const { unmount } = renderAtPathWith(store, '/catalogue/r-1');
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

  it('arrivé depuis le menu, le lien retour ramène au menu', async () => {
    const recipe = RecipeBuilder.aRecipe().withId('r-1').withTitle('Ratatouille').build();

    renderAtPath('/catalogue/r-1?depuis=menu', [recipe]);
    await screen.findByText('Ratatouille');

    const retour = screen.getByRole('link', { name: '← Menu' });
    expect(retour).toHaveAttribute('href', '/menu');
    expect(screen.queryByRole('link', { name: '← Recettes' })).not.toBeInTheDocument();
  });

  it('sans provenance dans l’URL, le lien retour ramène aux recettes et jamais au menu', async () => {
    const recipe = RecipeBuilder.aRecipe().withId('r-1').withTitle('Ratatouille').build();

    renderAtPath('/catalogue/r-1', [recipe]);
    await screen.findByText('Ratatouille');

    expect(screen.getByRole('link', { name: '← Recettes' })).toHaveAttribute('href', '/catalogue');
    expect(screen.queryByRole('link', { name: '← Menu' })).not.toBeInTheDocument();
  });

  it('arrivé depuis le menu, le lien « Modifier » emporte la provenance', async () => {
    const recipe = RecipeBuilder.aRecipe().withId('r-1').withTitle('Ratatouille').build();

    renderAtPath('/catalogue/r-1?depuis=menu', [recipe]);
    await screen.findByText('Ratatouille');

    expect(screen.getByRole('link', { name: 'Modifier' })).toHaveAttribute(
      'href',
      '/catalogue/r-1/modifier?depuis=menu',
    );
  });
});

describe('RecipeDetailContainer — la fiche ouverte depuis un créneau', () => {
  function ratatouille(): Recipe {
    return RecipeBuilder.aRecipe()
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
  }

  it('ouverte depuis un créneau de trois personnes, la fiche montre les quantités pour trois', async () => {
    renderAtPath('/catalogue/r-1?depuis=menu&pour=3', [ratatouille()]);
    await screen.findByText('Ratatouille');

    expect(screen.getByText('150 g')).toBeInTheDocument();
    expect(screen.queryByText('200 g')).not.toBeInTheDocument();
  });

  it('ouverte depuis le catalogue, la même fiche montre les quantités de référence', async () => {
    renderAtPath('/catalogue/r-1', [ratatouille()]);
    await screen.findByText('Ratatouille');

    expect(screen.getByText('200 g')).toBeInTheDocument();
    expect(screen.queryByText('150 g')).not.toBeInTheDocument();
  });

  it('les pièces d’une fiche mise à l’échelle sont arrondies au supérieur, jamais coupées en deux', async () => {
    renderAtPath('/catalogue/r-1?depuis=menu&pour=2', [ratatouille()]);
    await screen.findByText('Ratatouille');

    expect(screen.getByText('2 pièce')).toBeInTheDocument();
    expect(screen.queryByText('1.5 pièce')).not.toBeInTheDocument();
  });

  it('la fiche mise à l’échelle dit pour combien elle montre et rappelle l’effectif de la recette', async () => {
    renderAtPath('/catalogue/r-1?depuis=menu&pour=3', [ratatouille()]);
    await screen.findByText('Ratatouille');

    expect(screen.getByText('Quantités pour 3 personnes · recette pour 4')).toBeInTheDocument();
    expect(screen.queryByText('Pour 4 personnes')).not.toBeInTheDocument();
  });

  it('ouverte pour une seule personne, la fiche accorde le singulier', async () => {
    renderAtPath('/catalogue/r-1?depuis=menu&pour=1', [ratatouille()]);
    await screen.findByText('Ratatouille');

    expect(screen.getByText('Quantités pour 1 personne · recette pour 4')).toBeInTheDocument();
  });

  it('un effectif tapé à la main qui n’est pas un nombre de personnes ne casse pas la fiche : elle montre la référence', async () => {
    renderAtPath('/catalogue/r-1?depuis=menu&pour=0', [ratatouille()]);
    await screen.findByText('Ratatouille');

    expect(screen.getByText('Pour 4 personnes')).toBeInTheDocument();
    expect(screen.getByText('200 g')).toBeInTheDocument();
  });

  it('un effectif qui n’est pas un nombre du tout ne casse pas la fiche non plus', async () => {
    renderAtPath('/catalogue/r-1?depuis=menu&pour=trois', [ratatouille()]);
    await screen.findByText('Ratatouille');

    expect(screen.getByText('Pour 4 personnes')).toBeInTheDocument();
    expect(screen.getByText('200 g')).toBeInTheDocument();
  });

  it('un effectif si grand que les quantités déborderaient ne casse pas la fiche : elle montre la recette telle qu’écrite, son retour et son lien Modifier sans effectif', async () => {
    renderAtPath('/catalogue/r-1?depuis=menu&pour=9007199254740991', [ratatouille()]);
    await screen.findByText('Ratatouille');

    expect(screen.getByText('Pour 4 personnes')).toBeInTheDocument();
    expect(screen.getByText('200 g')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Menu' })).toHaveAttribute('href', '/menu');
    expect(screen.getByRole('link', { name: 'Modifier' })).toHaveAttribute(
      'href',
      '/catalogue/r-1/modifier?depuis=menu',
    );
  });
});
