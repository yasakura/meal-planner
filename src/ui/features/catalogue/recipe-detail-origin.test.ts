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
