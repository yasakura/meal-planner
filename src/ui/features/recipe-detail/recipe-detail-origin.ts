/**
 * D'où l'on vient, et où le retour ramène. Les DEUX moitiés de la convention vivent ici et nulle
 * part ailleurs : le module qui fabrique les adresses d'un parcours et celui qui relit sa
 * provenance sont le même, sans quoi rien n'obligerait le nom du paramètre écrit par l'un à être
 * celui que l'autre attend — un désaccord silencieux, invisible à la compilation.
 *
 * La provenance vit dans l'URL, PAS dans un état de navigation (`Link state`) : un rechargement,
 * un favori ou un lien partagé perdraient ce dernier, et le retour retomberait sur le catalogue
 * au milieu d'un parcours qui vient du menu. Le prix est un paramètre visible dans l'adresse ; il
 * est aussi ce qui rend l'écran descriptible par sa seule URL.
 *
 * Elle se LIT UNE FOIS, puis se ré-émet. Le parcours compte trois producteurs d'adresse — la
 * fiche ouverte depuis le menu, le formulaire ouvert depuis la fiche, la fiche rendue par le
 * formulaire — et pas un seul ne prend d'identifiant sans prendre la provenance avec : ce sont
 * des méthodes DE la provenance, pas des fonctions libres. Un appelant ne peut pas oublier ce
 * qu'il tient, il n'a aucune façon de fabriquer une adresse sans passer par lui.
 *
 * La décision vit dans un `.ts` et non dans les containers pour la raison habituelle : Stryker ne
 * mute pas les `.tsx`. Laissée dans un écran, « quelle adresse, quel retour » n'aurait aucun
 * mutant pour la surveiller.
 */
export type BackLink = { href: string; label: string };

const DEPUIS = 'depuis';
const MENU = 'menu';

/**
 * Le défaut, et le seul qui ne mente pas quand l'URL ne dit rien : on n'affirme pas venir d'un
 * menu qu'on n'a pas vu. Plus personne ne le nomme au dehors — le formulaire de modification,
 * qui rend l'écran du détail sur ses états sans recette, demande son retour à la provenance
 * comme tout le monde, et n'y retombe que lorsqu'elle l'y mène.
 */
const RETOUR_CATALOGUE: BackLink = { href: '/catalogue', label: '← Recettes' };

const RETOUR_MENU: BackLink = { href: '/menu', label: '← Menu' };

// Singulier : ce retour rend la FICHE, pas la liste. « Recettes » annoncerait le catalogue.
const RETOUR_RECETTE = '← Recette';

export type Origin = {
  recipeHref(recipeId: string): string;
  recipeEditHref(recipeId: string): string;
  readonly backLink: BackLink;
  backToRecipe(recipeId: string): BackLink;
};

// Le suffixe de requête est l'UNIQUE porteur de la provenance dans les adresses : toutes les
// méthodes le recopient, aucune ne le compose. Une provenance sans suffixe produit donc des URL
// nues, sans avoir à distinguer un cas de l'autre nulle part ailleurs.
function origin(query: string, backLink: BackLink): Origin {
  const recipeHref = (recipeId: string) => `/catalogue/${recipeId}${query}`;
  return {
    recipeHref,
    recipeEditHref: (recipeId) => `/catalogue/${recipeId}/modifier${query}`,
    backLink,
    backToRecipe: (recipeId) => ({ href: recipeHref(recipeId), label: RETOUR_RECETTE }),
  };
}

export const FROM_MENU: Origin = origin(`?${DEPUIS}=${MENU}`, RETOUR_MENU);

const FROM_CATALOGUE: Origin = origin('', RETOUR_CATALOGUE);

export function originOf(params: URLSearchParams): Origin {
  return params.get(DEPUIS) === MENU ? FROM_MENU : FROM_CATALOGUE;
}
