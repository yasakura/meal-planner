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
  timeoutMS: 10000,
  vitest: {
    configFile: 'vitest.config.ts',
  },
};
