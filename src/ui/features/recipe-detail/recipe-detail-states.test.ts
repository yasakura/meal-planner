import { describe, it, expect } from 'vitest';

import { toPropsWithoutRecipe } from './recipe-detail-states';

/**
 * Créé pour être MUTÉ — un `.ts` et non un `.tsx` — ce module n'était pourtant exercé que par
 * ricochet, à travers les RTL des deux containers qui le consomment. Sa branche la moins
 * évidente n'y est atteinte que pendant un rendu que la RTL a déjà purgé au moment des
 * assertions : aucun test ne la confrontait directement.
 */
describe('toPropsWithoutRecipe', () => {
  // LA branche en question. « success » sans recette à montrer n'est pas un cas mort : c'est
  // l'ouverture d'un écran sur un store qui porte encore la recette PRÉCÉDEMMENT consultée. Le
  // statut dit « succès », mais pas de la recette demandée — il n'y a rien à montrer, sinon
  // qu'on attend. Surtout pas « introuvable », qui affirmerait l'inexistence d'une recette que
  // personne n'a encore cherchée.
  it('rend l’attente sur un statut « success » qui ne porte pas la recette demandée', () => {
    expect(toPropsWithoutRecipe('success')).toEqual({ status: 'loading' });
  });

  it('rend l’attente tant que rien n’a été demandé', () => {
    expect(toPropsWithoutRecipe('idle')).toEqual({ status: 'loading' });
  });

  it('rend l’attente pendant la lecture', () => {
    expect(toPropsWithoutRecipe('loading')).toEqual({ status: 'loading' });
  });

  // Le vocabulaire de l'absence de réseau, distinct de celui de la panne ET de celui de
  // l'inexistence : la recette existe peut-être, on n'a simplement pas pu la lire.
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
