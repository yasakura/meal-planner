import { describe, it, expect } from 'vitest';

import { FROM_MENU, originOf } from './recipe-detail-origin';

function paramsOf(href: string): URLSearchParams {
  return new URL(href, 'http://localhost').searchParams;
}

/**
 * Une provenance ne se DEVINE pas : elle se lit une fois, puis elle produit toutes les adresses
 * du parcours. Aucune fonction de ce module ne fabrique une adresse sans qu'on lui tende la
 * provenance qu'on a en main — c'est ce qui rend l'oubli impossible plutôt qu'improbable.
 */
describe('les adresses produites par une provenance', () => {
  it('venue du menu, l’adresse d’une fiche inscrit la provenance', () => {
    expect(FROM_MENU.recipeHref('r1')).toBe('/catalogue/r1?depuis=menu');
  });

  it('venue du catalogue, l’adresse d’une fiche n’invente aucune provenance', () => {
    expect(originOf(paramsOf('/catalogue')).recipeHref('r1')).toBe('/catalogue/r1');
  });

  /**
   * Le maillon qui manquait. Le formulaire de modification est une ÉTAPE du parcours, pas sa
   * fin : s'il n'emporte pas la provenance, tout ce qu'il rend ensuite — son propre retour, la
   * fiche d'après un enregistrement — retombe sur le catalogue au milieu d'un parcours venu du
   * menu.
   */
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

  /**
   * LE cas du rechargement. La provenance vit dans l'URL, donc un rechargement direct sur
   * `/catalogue/:id` la conserve quand elle y est — mais une URL NUE, tapée, mise en favori ou
   * partagée, n'en porte aucune. Le retour doit alors nommer une destination sensée, et le
   * catalogue est la seule qui ne mente pas : on n'affirme pas venir d'un menu qu'on n'a pas vu.
   */
  it('sans provenance, le retour ramène aux recettes', () => {
    expect(originOf(paramsOf('/catalogue/r1')).backLink).toEqual({
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

/**
 * Le retour du FORMULAIRE ne ramène pas où ramène celui de la fiche : il rend la fiche elle-même,
 * qui doit à son tour savoir d'où l'on vient. Son libellé est au singulier — « Recettes »
 * annoncerait le catalogue.
 */
describe('le retour du formulaire de modification', () => {
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

/**
 * Les deux moitiés de la convention vivent dans ce module et nulle part ailleurs, mais rien
 * n'obligerait le nom du paramètre écrit par l'une à être celui que l'autre relit. Ces
 * aller-retours l'exigent, à chaque traversée du parcours.
 */
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

  // La boucle ENTIÈRE, telle que l'utilisateur la parcourt : menu → fiche → formulaire → fiche.
  // Chaque étape relit ce que la précédente a écrit ; aucune ne rejoue `FROM_MENU`.
  it('la provenance survit à la boucle menu → fiche → formulaire → fiche', () => {
    const fiche = originOf(paramsOf(FROM_MENU.recipeHref('r1')));
    const formulaire = originOf(paramsOf(fiche.recipeEditHref('r1')));
    const ficheDeRetour = originOf(paramsOf(formulaire.backToRecipe('r1').href));

    expect(ficheDeRetour.backLink).toEqual({ href: '/menu', label: '← Menu' });
  });

  // TÉMOIN de la boucle ci-dessus : la même suite de traversées, partie du catalogue, n'invente
  // à aucune étape un menu que l'utilisateur n'a pas vu.
  it('la même boucle partie du catalogue n’invente jamais le menu', () => {
    const fiche = originOf(paramsOf('/catalogue/r1'));
    const formulaire = originOf(paramsOf(fiche.recipeEditHref('r1')));
    const ficheDeRetour = originOf(paramsOf(formulaire.backToRecipe('r1').href));

    expect(ficheDeRetour.backLink).toEqual({ href: '/catalogue', label: '← Recettes' });
  });
});
