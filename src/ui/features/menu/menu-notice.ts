/**
 * Le constat que le MENU n'a pas pu être lu. Il nomme ce que cet écran-ci n'a pas pu montrer :
 * la lecture qui échoue est bien celle du catalogue, mais on n'est pas dans un catalogue, et
 * l'utilisateur venait voir son menu. Le catalogue garde le sien dans
 * `../catalogue/catalogue-notice`.
 *
 * Dans un `.ts` et non dans le container pour la raison habituelle : Stryker ne mute pas les
 * `.tsx`, et un libellé laissé là n'aurait aucun mutant pour le surveiller.
 */
export const MENU_UNAVAILABLE_NOTICE = 'Aucune connexion — le menu n’a pas pu être chargé.';
