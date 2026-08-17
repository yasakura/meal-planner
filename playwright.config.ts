import { defineConfig } from '@playwright/test';

/**
 * Scénarios navigateur — la seule couche qui exerce l'application ASSEMBLÉE : vrai routeur,
 * vrai store, vrai CSS, vrais cycles de montage. Les tests Vitest mockent les ports et
 * remontent un composant par test ; ce qu'ils ne peuvent pas voir vit ici.
 *
 * Ils tournent sur le mode `e2e` (`npm run dev:e2e`) : adapters en mémoire, session ouverte
 * d'avance, aucune dépendance à Firebase — donc rejouables sur n'importe quelle machine.
 */
const PORT = 5174;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',

  // Chaque scénario ouvre sa propre page, donc son propre store : aucun état partagé,
  // la parallélisation est sûre par construction.
  fullyParallel: true,

  // AUCUNE tentative supplémentaire, CI comprise. Un scénario instable doit se voir comme
  // instable : un `retries: 1` transforme un vrai défaut de séquence — la classe de bug que
  // cette suite existe pour attraper — en « flaky » qu'on cesse de lire.
  retries: 0,
  // En CI, un seul worker : le runner partage son CPU avec le serveur Vite, et les scénarios
  // sont assez rapides pour ne pas justifier la contention. En local, le défaut de Playwright.
  // Écrit par étalement plutôt que `workers: process.env.CI ? 1 : undefined` — `undefined`
  // n'est pas une valeur admise sous `exactOptionalPropertyTypes`.
  ...(process.env.CI ? { workers: 1 } : {}),

  // Un `test.only` oublié rendrait la CI verte sur un seul scénario.
  forbidOnly: !!process.env.CI,

  reporter: process.env.CI ? [['github'], ['list']] : [['list']],

  use: {
    baseURL: BASE_URL,
    browserName: 'chromium',
    // L'application est mobile-only. 393×852 = iPhone 14/15 en portrait, la résolution sur
    // laquelle les débordements de mise en page ont été mesurés à la main jusqu'ici.
    // Écrit à plat plutôt que via `devices['iPhone 14']` : ce préréglage impose WebKit, et
    // Chromium est le seul navigateur installé (et le seul où `isMobile` existe).
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  webServer: {
    command: 'npm run dev:e2e',
    url: BASE_URL,
    // En local on réutilise le serveur déjà lancé ; en CI on exige que Playwright le démarre,
    // un serveur préexistant y serait le signe d'un job mal isolé.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
