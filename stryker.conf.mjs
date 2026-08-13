export default {
  packageManager: 'npm',
  testRunner: 'vitest',
  reporters: ['progress', 'clear-text', 'html'],
  coverageAnalysis: 'perTest',
  // Code de PRODUCTION uniquement : domain + data + logique UI (slices/thunks).
  // Exclus : fichiers de test, et l'infra de test (test-doubles/builders) qui polluait
  // le score domain avec des mutants équivalents.
  mutate: [
    'src/domain/**/*.{ts,tsx}',
    'src/data/**/*.{ts,tsx}',
    'src/ui/features/**/*.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/domain/test-doubles/**',
    '!src/domain/test-builders/**',
  ],
  // break aligné sur la règle CLAUDE.md « mutation domain/ >= 80 % ».
  // Tant que seul domain/ est muté, ce seuil global applique la règle.
  thresholds: { high: 90, low: 80, break: 80 },
  // Le score GLOBAL n'est pas reproductible, et ce n'est PAS réglable par la config.
  // Ne pas retenter les pistes ci-dessous, elles ont été mesurées sur le même commit
  // (2026-08-13, `convives-slice.ts`) :
  //
  //   défaut (21 workers, 10 s) → 5 min 30 · 100,00 % · 7 timeouts · 0 survivant
  //   21 workers, 30 s          → 6 min 57 ·  96,08 % · 5 timeouts · 2 survivants
  //   8 workers, 30 s           → ~29 min (abandonné, 5× plus lent)
  //   RUN ISOLÉ (la vérité)     → ~2 min   ·  92,16 % · 0 timeout  · 4 survivants
  //
  // Élargir la borne rapproche de la vérité sans la rejoindre : certains mutants ne
  // frôlent pas le seuil, ils BLOQUENT franchement sous parallélisme (vider un préfixe
  // de type d'action empêche un reducer de matcher, et un `await` de test reste sans
  // réponse). Un blocage franc expire quelle que soit la borne. Or Stryker compte un
  // timeout comme un mutant TUÉ : le score global est donc structurellement optimiste,
  // et un survivant réel peut s'y cacher.
  //
  // Conséquence opérationnelle, cf. CLAUDE.md : le global ne vaut que comme signal de
  // fumée ; pour tout fichier modifié dans un cycle, c'est le run isolé
  // (`npx stryker run --mutate '<fichier>'`) qui fait foi et qui doit être rapporté.
  timeoutMS: 10000,
  vitest: {
    configFile: 'vitest.config.ts',
  },
};
