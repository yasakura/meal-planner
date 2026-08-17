import { RepositoryUnavailableError } from '../../domain/errors/repository-unavailable-error';

/**
 * Surface EXACTE du hook `window.__e2e`, et rien de plus.
 *
 * Trois opérations, parce qu'un scénario n'a que trois besoins : provoquer une panne de
 * lecture, une panne d'écriture, et revenir au nominal. Ce qui est délibérément ABSENT :
 * — la granularité par port (convives vs recettes) : un écran n'exerce qu'un dépôt à la fois,
 *   et l'UI ne distingue de toute façon que « pas répondu » de « a répondu » ;
 * — la panne d'authentification : les scénarios démarrent sur une session ouverte, une panne
 *   d'auth ne ferait que les empêcher de commencer ;
 * — l'injection de données en cours de route : l'état de départ vient de l'URL, la suite vient
 *   de l'app elle-même. Un scénario qui écrit dans le dépôt derrière l'écran ne teste plus
 *   l'écran.
 * Une API de test qui grossit devient une seconde application à maintenir, et ses défauts
 * font échouer des scénarios sans qu'aucun bug produit n'existe.
 */
export type E2eControls = {
  failReads(): void;
  failWrites(): void;
  restore(): void;
};

/**
 * État de panne PARTAGÉ par tous les adapters e2e — un seul objet, injecté dans chacun, pour
 * qu'un `failReads()` couvre tout ce que l'écran courant peut lire.
 *
 * La panne est un ÉTAT, pas un coup unique : elle dure jusqu'à `restore()`. Un « échouer la
 * prochaine lecture » serait ininterprétable, StrictMode rejouant les effets de montage — la
 * panne tomberait sur la première des deux lectures et le scénario verrait l'écran nominal.
 */
export class E2eFailureSwitch implements E2eControls {
  private readsFail = false;
  private writesFail = false;

  private constructor() {}

  static create(): E2eFailureSwitch {
    return new E2eFailureSwitch();
  }

  failReads(): void {
    this.readsFail = true;
  }

  failWrites(): void {
    this.writesFail = true;
  }

  restore(): void {
    this.readsFail = false;
    this.writesFail = false;
  }

  /**
   * Point de passage UNIQUE des pannes de lecture, comme `asDomainFailure` l'est pour
   * Firestore : les adapters e2e doivent rejeter dans le vocabulaire du domaine, sinon un
   * scénario verrait « impossible de charger » là où le vrai adapter dit « aucune connexion ».
   */
  guardRead(): void {
    if (this.readsFail) throw RepositoryUnavailableError.create();
  }

  guardWrite(): void {
    if (this.writesFail) throw RepositoryUnavailableError.create();
  }
}
