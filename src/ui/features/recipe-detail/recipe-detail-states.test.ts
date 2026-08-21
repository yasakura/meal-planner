import { describe, it, expect } from 'vitest';

import { toPropsWithoutRecipe } from './recipe-detail-states';

describe('toPropsWithoutRecipe', () => {
  it('rend l’attente sur un statut « success » qui ne porte pas la recette demandée', () => {
    expect(toPropsWithoutRecipe('success')).toEqual({ status: 'loading' });
  });

  it('rend l’attente tant que rien n’a été demandé', () => {
    expect(toPropsWithoutRecipe('idle')).toEqual({ status: 'loading' });
  });

  it('rend l’attente pendant la lecture', () => {
    expect(toPropsWithoutRecipe('loading')).toEqual({ status: 'loading' });
  });

  it('nomme l’absence de connexion, sans jamais conclure à l’inexistence', () => {
    expect(toPropsWithoutRecipe('unavailable')).toEqual({
      status: 'unavailable',
      message: 'Aucune connexion — la recette n’a pas pu être chargée.',
    });
  });

  it('rend l’introuvable sans message, l’écran portant déjà son libellé', () => {
    expect(toPropsWithoutRecipe('notFound')).toEqual({ status: 'notFound' });
  });

  it('rend un constat de panne sobre, sans le message technique', () => {
    expect(toPropsWithoutRecipe('error')).toEqual({
      status: 'error',
      message: 'Impossible de charger la recette.',
    });
  });
});
