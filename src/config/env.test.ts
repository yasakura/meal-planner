import { describe, it, expect, afterEach, vi } from 'vitest';

describe('env config', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("expose 'dev' comme nom d'environnement par défaut quand VITE_ENV est absente", async () => {
    vi.stubEnv('VITE_ENV', undefined);
    vi.resetModules();
    const { env } = await import('./env');
    expect(env.name).toBe('dev');
  });

  it('reflète VITE_ENV quand la variable est définie', async () => {
    vi.stubEnv('VITE_ENV', 'prod');
    vi.resetModules();
    const { env } = await import('./env');
    expect(env.name).toBe('prod');
  });

  it("expose 'non configuré' comme projectId Firebase par défaut quand VITE_FIREBASE_PROJECT_ID est absent", async () => {
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', undefined);
    vi.resetModules();
    const { env } = await import('./env');
    expect(env.firebase.projectId).toBe('non configuré');
  });

  it('reflète VITE_FIREBASE_PROJECT_ID quand la variable est définie', async () => {
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'meal-planner-prod-42');
    vi.resetModules();
    const { env } = await import('./env');
    expect(env.firebase.projectId).toBe('meal-planner-prod-42');
  });
});
