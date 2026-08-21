import { describe, expect, it } from 'vitest';

describe('Fuseau du runner', () => {
  it('exécute la suite sous un fuseau FIGÉ, jamais celui de la machine : `process.env.TZ` de vitest.config.ts est en place', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('UTC');
  });
});
