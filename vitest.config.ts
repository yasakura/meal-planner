import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Fuseau des tests, figé. Sans lui la suite hérite de la machine : `Europe/Paris` sur un poste
 * français, `UTC` sur un runner GitHub — deux exécutions qui ne mesurent pas la même chose. Deux
 * gardes en dépendaient en sens OPPOSÉS, donc l'un des deux mentait toujours : les tests de
 * changement d'heure de `calendar-date` (dont l'implémentation est ancrée sur UTC, donc
 * insensible au fuseau, cf. leur commentaire) et le mutant qui vide les options de
 * `Intl.DateTimeFormat` dans `system-clock.ts`, indistinguable sous `Europe/Paris`. UTC tranche
 * pour le second et ne coûte rien au premier.
 *
 * Cette ligne est tenue par `src/test/runner-timezone.test.ts` : la retirer le fait rougir.
 *
 * Sur le PROCESSUS, et non dans `test.env` : `test.env` ne couvre que les workers que Vitest
 * démarre lui-même. Le runner Vitest de Stryker n'en héritait pas et mesurait sous le fuseau de
 * la machine — mesuré sur un poste à Paris, `system-clock.ts` sortait à 90 % (1 survivant) avec
 * `test.env` seul, et 100 % (10 tués) avec cette ligne. Posé ici, avant tout démarrage de
 * worker, il couvre les deux, et `test.env` devient une ligne que plus rien n'exige.
 */
process.env.TZ = 'UTC';

export default defineConfig({
  plugins: [react()],
  test: {
    // Vitest ne ramasse QUE `src/`. Sans cette borne, ses globs par défaut balayent tout le
    // dépôt et embarquent `e2e/*.spec.ts`, qui échouent aussitôt — Playwright n'est pas un
    // runner Vitest (mesuré : 4 fichiers en échec, 2026-08-17).
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Redondant avec `include`, et délibérément : `include` dit où sont les tests, `exclude`
    // NOMME le répertoire qui ne doit jamais passer par ici. Un lecteur qui cherche « e2e »
    // dans cette configuration trouve la réponse.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/**/*.d.ts'],
      thresholds: {
        'src/domain/**': { lines: 80, functions: 80, branches: 80, statements: 80 },
      },
    },
  },
});
