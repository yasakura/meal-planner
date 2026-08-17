import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

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
