export default {
  packageManager: 'npm',
  testRunner: 'vitest',
  reporters: ['progress', 'clear-text', 'html'],
  coverageAnalysis: 'perTest',
  mutate: ['src/domain/**/*.{ts,tsx}', 'src/data/**/*.{ts,tsx}', '!src/**/*.test.{ts,tsx}'],
  thresholds: { high: 85, low: 75, break: 75 },
  timeoutMS: 10000,
  vitest: {
    configFile: 'vitest.config.ts',
  },
};
