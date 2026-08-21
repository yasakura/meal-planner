export default {
  packageManager: 'npm',
  testRunner: 'vitest',
  reporters: ['progress', 'clear-text', 'html'],
  coverageAnalysis: 'perTest',
  mutate: [
    'src/domain/**/*.{ts,tsx}',
    'src/data/**/*.{ts,tsx}',
    'src/ui/features/**/*.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/domain/test-doubles/**',
    '!src/domain/test-builders/**',
    '!src/data/e2e/**',
  ],
  thresholds: { high: 90, low: 80, break: 80 },
  timeoutMS: 10000,
  incremental: true,
  vitest: {
    configFile: 'vitest.config.ts',
  },
};
