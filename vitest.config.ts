import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

process.env.TZ = 'UTC';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [...configDefaults.exclude, 'e2e/**'],
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/domain/test-builders/**',
        'src/domain/test-doubles/**',
        'src/ui/test-utils/**',
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/config/firebase.ts',
        'src/ui/store/create-app-store.ts',
        'src/ui/theme/global-style.ts',
      ],
      thresholds: {
        'src/domain/**': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/data/**': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/ui/**': { lines: 99, functions: 98, branches: 97, statements: 99 },
        'src/config/**': { lines: 100, functions: 100, branches: 100, statements: 100 },
      },
    },
  },
});
