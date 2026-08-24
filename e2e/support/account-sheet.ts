import {
  expect,
  type ElementHandle,
  type JSHandle,
  type Locator,
  type Page,
} from '@playwright/test';

type Prise = ElementHandle<HTMLElement | SVGElement>;

const PANNEAU = '[data-testid="account-sheet-panel"]';

type ReouvertureArmee = JSHandle<{ fait: Promise<void> }>;

export async function openAccountSheet(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Compte' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Compte' })).toBeVisible();
}

export async function closeAccountSheet(page: Page): Promise<void> {
  await page.locator(PANNEAU).getByRole('button', { name: 'Fermer' }).click();
}

export function accountSheetPanel(page: Page): Locator {
  return page.locator(PANNEAU);
}

export async function panelHandle(page: Page): Promise<Prise> {
  return page.waitForSelector(PANNEAU, { state: 'attached' });
}

export async function isStillMounted(prise: Prise): Promise<boolean> {
  return prise.evaluate((noeud) => noeud.isConnected);
}

export async function armReopenDuringExit(page: Page, panneau: Prise): Promise<ReouvertureArmee> {
  const compte = await page.waitForSelector('role=button[name="Compte"]', { state: 'attached' });
  return page.evaluateHandle(
    ({ panneau, compte }) => {
      const AU_REPOS = 'matrix(1, 0, 0, 1, 0, 0)';
      const entreeAchevee = new Promise<void>((resolve) => {
        const guetter = () => {
          if (getComputedStyle(panneau).transform === AU_REPOS) resolve();
          else requestAnimationFrame(guetter);
        };
        requestAnimationFrame(guetter);
      });
      const sortieCommencee = entreeAchevee.then(
        () =>
          new Promise<void>((resolve) => {
            const guetter = () => {
              if (getComputedStyle(panneau).transform === AU_REPOS) requestAnimationFrame(guetter);
              else resolve();
            };
            requestAnimationFrame(guetter);
          }),
      );
      const fait = sortieCommencee
        .then(() => {
          const sortieTerminee = new Promise<void>((resolve) => {
            panneau.addEventListener('transitionend', () => resolve(), { once: true });
          });
          compte.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return sortieTerminee;
        })
        .then(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
      return { fait };
    },
    { panneau, compte },
  );
}

export async function awaitReopenDuringExit(reouverture: ReouvertureArmee): Promise<void> {
  await reouverture.evaluate((armee) => armee.fait);
}
