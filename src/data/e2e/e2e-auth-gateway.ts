import { type Account } from '../../domain/entities/account';
import { type AuthGateway, type Unsubscribe } from '../../domain/ports/auth-gateway';

/**
 * Contournement de l'AuthGate en mode e2e — et le seul propre : au lieu de percer une porte
 * dérobée dans `AuthGate` (qui existerait alors AUSSI en production), on branche un adapter du
 * port `AuthGateway` qui annonce une session déjà ouverte. L'AuthGate est inchangé, il fait
 * exactement ce qu'il fait en production, et le contournement n'a d'existence que dans le
 * câblage e2e.
 *
 * La session est annoncée SYNCHRONEMENT à l'abonnement : aucun scénario ne traverse l'écran de
 * connexion, et aucun n'a de splash à attendre.
 */
export class E2eAuthGateway implements AuthGateway {
  private listeners: ((account: Account | null) => void)[] = [];

  private constructor(private readonly account: Account) {}

  static signedInAs(account: Account): E2eAuthGateway {
    return new E2eAuthGateway(account);
  }

  /**
   * Aucun paramètre déclaré, là où le port en attend deux : la session e2e est ouverte
   * d'avance, les identifiants saisis n'entrent dans aucune décision. Une signature plus
   * courte reste assignable au port — et elle dit mieux que deux paramètres ignorés que rien
   * n'est vérifié ici.
   */
  signIn(): Promise<Account> {
    return Promise.resolve(this.account);
  }

  observeAuthState(listener: (account: Account | null) => void): Unsubscribe {
    this.listeners.push(listener);
    listener(this.account);
    // Désabonnement réel : AuthGate se désabonne à chaque démontage, et StrictMode l'y force
    // dès le premier rendu. Un désabonnement de façade empilerait les auditeurs.
    return () => {
      this.listeners = this.listeners.filter((registered) => registered !== listener);
    };
  }

  signOut(): Promise<void> {
    for (const listener of this.listeners) listener(null);
    return Promise.resolve();
  }
}
