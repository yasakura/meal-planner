import { describe, it, expect } from 'vitest';

import { type Account } from '../../domain/entities/account';
import { type AuthGateway } from '../../domain/ports/auth-gateway';
import { AccountBuilder } from '../../domain/test-builders/account.builder';
import { E2eAuthGateway } from './e2e-auth-gateway';

const compte = AccountBuilder.anAccount().withEmail('e2e@foyer.test').build();

describe('E2eAuthGateway', () => {
  it('notifie IMMÉDIATEMENT une session ouverte : aucun scénario ne passe par l’écran de connexion', () => {
    const gateway = E2eAuthGateway.signedInAs(compte);
    const vus: (Account | null)[] = [];

    gateway.observeAuthState((account) => vus.push(account));

    expect(vus).toEqual([compte]);
  });

  it('résout signIn sur le même compte, quels que soient les identifiants', async () => {
    // Appelé À TRAVERS le port : c'est cette signature-là que l'application utilise, et le
    // test doit prouver que l'adapter la satisfait, pas seulement sa propre signature courte.
    const gateway: AuthGateway = E2eAuthGateway.signedInAs(compte);

    await expect(gateway.signIn('e2e@foyer.test', 'peu-importe')).resolves.toEqual(compte);
  });

  it('notifie la déconnexion : l’écran de connexion reste atteignable', async () => {
    const gateway = E2eAuthGateway.signedInAs(compte);
    const vus: (Account | null)[] = [];
    gateway.observeAuthState((account) => vus.push(account));

    await gateway.signOut();

    expect(vus).toEqual([compte, null]);
  });

  it('coupe les notifications après désabonnement', () => {
    // AuthGate se désabonne à chaque démontage, et StrictMode l'y force dès le premier
    // rendu : un désabonnement inopérant empilerait les auditeurs.
    const gateway = E2eAuthGateway.signedInAs(compte);
    const vus: (Account | null)[] = [];
    const unsubscribe = gateway.observeAuthState((account) => vus.push(account));

    unsubscribe();

    return gateway.signOut().then(() => {
      expect(vus).toEqual([compte]);
    });
  });
});
