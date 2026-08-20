/**
 * Le constat que le CATALOGUE n'a pas pu être lu. Il ne vaut que pour cet écran-là : le menu lit
 * les mêmes recettes par le même use-case, mais il ne montre pas un catalogue — il nomme donc sa
 * propre panne, dans `../menu/menu-notice`.
 *
 * Dans un `.ts` et non dans les containers pour la raison habituelle : Stryker ne mute pas les
 * `.tsx`, et un libellé laissé là n'aurait aucun mutant pour le surveiller.
 */
export const CATALOGUE_UNAVAILABLE_NOTICE =
  'Aucune connexion — le catalogue n’a pas pu être chargé.';
