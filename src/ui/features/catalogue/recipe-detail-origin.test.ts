import { describe, it, expect } from 'vitest';

import { FROM_MENU, FROM_MENU_DRAFT, originOf } from './recipe-detail-origin';

function paramsOf(href: string): URLSearchParams {
  return new URL(href, 'http://localhost').searchParams;
}

describe('les adresses produites par une provenance', () => {
  it('venue du menu, l’adresse d’une fiche inscrit la provenance', () => {
    expect(FROM_MENU.recipeHref('r1')).toBe('/catalogue/r1?depuis=menu');
  });

  it('venue du brouillon de menu, l’adresse d’une fiche inscrit CETTE provenance', () => {
    expect(FROM_MENU_DRAFT.recipeHref('r1')).toBe('/catalogue/r1?depuis=menu-nouveau');
  });

  it('venue du catalogue, l’adresse d’une fiche n’invente aucune provenance', () => {
    expect(originOf(paramsOf('/catalogue')).recipeHref('r1')).toBe('/catalogue/r1');
  });

  it('venue du menu, l’adresse du formulaire de modification emporte la provenance', () => {
    expect(FROM_MENU.recipeEditHref('r1')).toBe('/catalogue/r1/modifier?depuis=menu');
  });

  it('venue du catalogue, l’adresse du formulaire n’invente aucune provenance', () => {
    expect(originOf(paramsOf('/catalogue/r1')).recipeEditHref('r1')).toBe('/catalogue/r1/modifier');
  });
});

describe('le retour de la fiche', () => {
  it('venue du menu, le retour ramène au menu', () => {
    expect(originOf(paramsOf('/catalogue/r1?depuis=menu')).backLink).toEqual({
      href: '/menu',
      label: '← Menu',
    });
  });

  it('venue du brouillon de menu, le retour ramène au brouillon et non aux menus enregistrés', () => {
    expect(originOf(paramsOf('/catalogue/r1?depuis=menu-nouveau')).backLink).toEqual({
      href: '/menu/nouveau',
      label: '← Menu',
    });
  });

  it('sans provenance, le retour ramène aux recettes', () => {
    expect(originOf(paramsOf('/catalogue/r1')).backLink).toEqual({
      href: '/catalogue',
      label: '← Recettes',
    });
  });

  it('sur une provenance qui porte le nom d’une propriété d’Object, le retour retombe sur les recettes', () => {
    expect(originOf(paramsOf('/catalogue/r1?depuis=constructor')).backLink).toEqual({
      href: '/catalogue',
      label: '← Recettes',
    });
  });

  it('sur une provenance inconnue, le retour retombe sur les recettes', () => {
    expect(originOf(paramsOf('/catalogue/r1?depuis=nulle-part')).backLink).toEqual({
      href: '/catalogue',
      label: '← Recettes',
    });
  });
});

describe('le retour du formulaire de modification', () => {
  it('venu du brouillon de menu, ramène à une fiche qui sait encore d’où l’on vient', () => {
    expect(FROM_MENU_DRAFT.backToRecipe('r1')).toEqual({
      href: '/catalogue/r1?depuis=menu-nouveau',
      label: '← Recette',
    });
  });

  it('venu du menu, ramène à une fiche qui sait encore d’où l’on vient', () => {
    expect(FROM_MENU.backToRecipe('r1')).toEqual({
      href: '/catalogue/r1?depuis=menu',
      label: '← Recette',
    });
  });

  it('venu du catalogue, ramène à la fiche sans lui inventer de provenance', () => {
    expect(originOf(paramsOf('/catalogue/r1/modifier')).backToRecipe('r1')).toEqual({
      href: '/catalogue/r1',
      label: '← Recette',
    });
  });
});

describe('l’aller-retour entre ce qui écrit la provenance et ce qui la relit', () => {
  it('l’adresse d’une fiche fabriquée pour le menu est relue comme venant du menu', () => {
    expect(originOf(paramsOf(FROM_MENU.recipeHref('r1'))).backLink).toEqual({
      href: '/menu',
      label: '← Menu',
    });
  });

  it('l’adresse du formulaire fabriquée pour le menu est relue comme venant du menu', () => {
    expect(originOf(paramsOf(FROM_MENU.recipeEditHref('r1'))).backLink).toEqual({
      href: '/menu',
      label: '← Menu',
    });
  });

  it('la provenance survit à la boucle menu → fiche → formulaire → fiche', () => {
    const fiche = originOf(paramsOf(FROM_MENU.recipeHref('r1')));
    const formulaire = originOf(paramsOf(fiche.recipeEditHref('r1')));
    const ficheDeRetour = originOf(paramsOf(formulaire.backToRecipe('r1').href));

    expect(ficheDeRetour.backLink).toEqual({ href: '/menu', label: '← Menu' });
  });

  it('la même boucle partie du catalogue n’invente jamais le menu', () => {
    const fiche = originOf(paramsOf('/catalogue/r1'));
    const formulaire = originOf(paramsOf(fiche.recipeEditHref('r1')));
    const ficheDeRetour = originOf(paramsOf(formulaire.backToRecipe('r1').href));

    expect(ficheDeRetour.backLink).toEqual({ href: '/catalogue', label: '← Recettes' });
  });
});

describe('l’effectif d’un créneau voyage dans l’adresse', () => {
  it('venue d’un créneau de trois personnes, l’adresse d’une fiche demande les quantités pour trois', () => {
    expect(FROM_MENU.pour(3).recipeHref('r1')).toBe('/catalogue/r1?depuis=menu&pour=3');
  });

  it('venue d’un créneau du brouillon, l’adresse emporte l’effectif de CE créneau et cette provenance', () => {
    expect(FROM_MENU_DRAFT.pour(2).recipeHref('r1')).toBe(
      '/catalogue/r1?depuis=menu-nouveau&pour=2',
    );
  });

  it('l’effectif inscrit dans l’adresse est relu tel quel', () => {
    expect(originOf(paramsOf('/catalogue/r1?depuis=menu&pour=3')).convives).toBe(3);
  });

  it('une adresse sans effectif ne réclame aucun prorata, là où la même adresse qui en porte un le réclame', () => {
    expect(originOf(paramsOf('/catalogue/r1?depuis=menu')).convives).toBeNull();
    expect(originOf(paramsOf('/catalogue/r1?depuis=menu&pour=3')).convives).toBe(3);
  });

  it('un créneau sans personne n’inscrit aucun effectif dans l’adresse, là où un créneau de trois l’inscrit', () => {
    expect(FROM_MENU.pour(0).recipeHref('r1')).toBe('/catalogue/r1?depuis=menu');
    expect(FROM_MENU.pour(3).recipeHref('r1')).toBe('/catalogue/r1?depuis=menu&pour=3');
  });

  it('un effectif tapé à la main qui n’est pas un nombre de personnes est refusé, là où trois est retenu', () => {
    const effectifDe = (query: string) =>
      originOf(paramsOf(`/catalogue/r1?depuis=menu&pour=${query}`)).convives;

    expect(effectifDe('abc')).toBeNull();
    expect(effectifDe('0')).toBeNull();
    expect(effectifDe('-2')).toBeNull();
    expect(effectifDe('2.5')).toBeNull();
    expect(effectifDe('')).toBeNull();
    expect(effectifDe('3')).toBe(3);
  });

  it('un effectif trop grand pour être compté exactement est refusé, là où le plus grand effectif exact est retenu', () => {
    const effectifDe = (query: string) =>
      originOf(paramsOf(`/catalogue/r1?depuis=menu&pour=${query}`)).convives;

    expect(effectifDe('1e308')).toBeNull();
    expect(effectifDe('1e21')).toBeNull();
    expect(effectifDe('9007199254740992')).toBeNull();
    expect(effectifDe('9007199254740991')).toBe(9007199254740991);
  });

  it('l’adresse du formulaire garde l’effectif pour savoir à quelle fiche revenir', () => {
    expect(FROM_MENU.pour(3).recipeEditHref('r1')).toBe(
      '/catalogue/r1/modifier?depuis=menu&pour=3',
    );
    expect(FROM_MENU.pour(3).backToRecipe('r1')).toEqual({
      href: '/catalogue/r1?depuis=menu&pour=3',
      label: '← Recette',
    });
  });

  it('une provenance qui renonce à l’effectif ne l’inscrit plus dans aucune adresse, là où elle l’inscrivait, et garde son retour', () => {
    const renoncee = FROM_MENU.pour(3).sansEffectif();

    expect(renoncee.convives).toBeNull();
    expect(renoncee.recipeHref('r1')).toBe('/catalogue/r1?depuis=menu');
    expect(renoncee.recipeEditHref('r1')).toBe('/catalogue/r1/modifier?depuis=menu');
    expect(renoncee.backLink).toEqual({ href: '/menu', label: '← Menu' });
    expect(FROM_MENU.pour(3).recipeEditHref('r1')).toBe(
      '/catalogue/r1/modifier?depuis=menu&pour=3',
    );
  });

  it('l’effectif survit à la boucle créneau → fiche → formulaire → fiche', () => {
    const fiche = originOf(paramsOf(FROM_MENU.pour(3).recipeHref('r1')));
    const formulaire = originOf(paramsOf(fiche.recipeEditHref('r1')));
    const ficheDeRetour = originOf(paramsOf(formulaire.backToRecipe('r1').href));

    expect(ficheDeRetour.convives).toBe(3);
    expect(ficheDeRetour.backLink).toEqual({ href: '/menu', label: '← Menu' });
  });
});
