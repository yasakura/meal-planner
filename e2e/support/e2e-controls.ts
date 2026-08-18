import { type Page } from '@playwright/test';

/**
 * Pilotage des pannes exposé par le mode e2e sur `window.__e2e` (voir `E2eControls` dans
 * `src/data/e2e/e2e-failure-switch.ts`). Le type est redéclaré ICI plutôt qu'importé de `src/`
 * pour la raison même qui l'a fait sortir du type global `Window` : rien du code applicatif ne
 * doit pouvoir le voir. La duplication est de trois signatures, et un décalage se solderait par
 * un échec immédiat de tous les scénarios de panne.
 */
type E2eControls = {
  failReads(): void;
  failWrites(): void;
  restore(): void;
};

type E2eWindow = Window & { __e2e: E2eControls };

/**
 * `main.tsx` construit le store derrière un import DYNAMIQUE, donc `window.__e2e` n'existe pas
 * encore quand `page.goto()` rend la main (l'événement `load` précède la résolution du module).
 * Sans cette attente, armer une panne juste après une navigation lève « Cannot read properties
 * of undefined » — de façon intermittente, selon la vitesse du transform Vite.
 */
async function e2eControls(page: Page): Promise<void> {
  await page.waitForFunction(() => '__e2e' in window);
}

/**
 * La panne est un ÉTAT porté par le store, donc par le chargement de page courant.
 * `page.goto()` recrée la page, donc le store, donc le commutateur : toute panne armée est
 * perdue. Un scénario de panne navigue par les liens de l'application, jamais par l'URL.
 */
export async function failReads(page: Page): Promise<void> {
  await e2eControls(page);
  await page.evaluate(() => (window as unknown as E2eWindow).__e2e.failReads());
}

export async function failWrites(page: Page): Promise<void> {
  await e2eControls(page);
  await page.evaluate(() => (window as unknown as E2eWindow).__e2e.failWrites());
}

export async function restore(page: Page): Promise<void> {
  await e2eControls(page);
  await page.evaluate(() => (window as unknown as E2eWindow).__e2e.restore());
}
