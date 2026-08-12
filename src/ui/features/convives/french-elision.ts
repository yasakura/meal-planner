/**
 * Rend « de X » élidé quand le français l'exige : « d’Aurélie », « de Rory ».
 *
 * Élision devant voyelle ET devant h — COMPROMIS ASSUMÉ, pas une règle exacte.
 * Elle est juste sur les h muets (« d’Henri », « d’Hugo ») et FAUTIVE sur les h aspirés,
 * qui ne sont pas marginaux dans un foyer français : Hakim, Hamza, Hicham, Halima, Hind
 * rendront « d’Hicham » là où « de Hicham » est correct.
 * Trancher exigerait un dictionnaire des h aspirés, pas une heuristique — aucun caractère
 * ne distingue les deux. Le choix est donc de se tromper sur une famille de prénoms plutôt
 * que sur l'autre, pas de bien faire dans tous les cas.
 *
 * Le « y » n'est pas élidé : son usage est partagé (« d’Yves » mais « de Yolande »), aucune
 * règle ne tranche.
 */
const ELIDING_INITIALS = 'aeiouh';

export function elidedDe(name: string): string {
  // Trimé UNE fois, et le résultat sert à la fois à décider et à afficher : le slice
  // mémorise l'argument brut de la soumission, un espace de tête déciderait donc « de » au
  // lieu de « d’ » tout en recrachant la saisie parasite dans le constat.
  const subject = name.trim();
  // NFD décompose « É » en « E » + accent combinant, et le caractère de base vient EN
  // PREMIER : lire la première unité suffit, sans avoir à retirer les diacritiques.
  // La casse ne doit rien changer à la grammaire.
  const initial = subject.normalize('NFD').charAt(0).toLowerCase();
  return ELIDING_INITIALS.includes(initial) ? `d’${subject}` : `de ${subject}`;
}
