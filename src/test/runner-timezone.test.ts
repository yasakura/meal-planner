import { describe, expect, it } from 'vitest';

/**
 * Ce que ce garde protège : la ligne `process.env.TZ = 'UTC'` en tête de `vitest.config.ts`.
 * Elle n'est référencée par aucun import, donc rien ne la retient — et son retrait ne casse
 * RIEN de visible. C'est précisément le danger : la suite reste verte, et deux choses se
 * dégradent en silence sur un poste dont le fuseau change d'heure (`Europe/Paris`) —
 *
 * 1. le mutant qui vide les options de `Intl.DateTimeFormat` dans `data/system-clock.ts`
 *    redevient indistinguable et survit (mesuré : 100 % → 90 % au run isolé, 2026-08-17) ;
 * 2. les deux tests de changement d'heure de `domain/entities/calendar-date.test.ts` cessent
 *    de mesurer ce que leur nom annonce, sans rougir.
 *
 * Il vit ICI, et pas dans l'un de ces deux fichiers : c'est un invariant du RUNNER, dont les
 * deux dépendent également — le loger dans l'un favoriserait arbitrairement l'un des deux, et
 * l'autre continuerait de se dégrader sans un mot. `src/test/` est déjà le domicile des gardes
 * qui vérifient le projet plutôt que le produit (`architecture`, `firestore-rules-coverage`).
 */
describe('Fuseau du runner', () => {
  it('exécute la suite sous un fuseau FIGÉ, jamais celui de la machine : `process.env.TZ` de vitest.config.ts est en place', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('UTC');
  });
});
