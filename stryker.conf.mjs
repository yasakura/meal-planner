export default {
  packageManager: 'npm',
  testRunner: 'vitest',
  reporters: ['progress', 'clear-text', 'html'],
  coverageAnalysis: 'perTest',
  mutate: ['src/domain/**/*.{ts,tsx}', 'src/data/**/*.{ts,tsx}', '!src/**/*.test.{ts,tsx}'],
  // break aligné sur la règle CLAUDE.md « mutation domain/ >= 80 % ».
  // Tant que seul domain/ est muté, ce seuil global applique la règle.
  thresholds: { high: 90, low: 80, break: 80 },
  timeoutMS: 10000,
  vitest: {
    configFile: 'vitest.config.ts',
  },
};
