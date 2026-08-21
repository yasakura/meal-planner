import { expect, type ElementHandle, type JSHandle, type Page } from '@playwright/test';

export async function openAccountSheet(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Compte' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Compte' })).toBeVisible();
}

export async function closeAccountSheet(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Fermer' }).click();
}

export async function panelHandle(page: Page): Promise<JSHandle<Element | null>> {
  const prise = await page.evaluateHandle(() =>
    document.querySelector('[data-testid="account-sheet-panel"]'),
  );
  expect(await prise.evaluate((noeud) => noeud !== null)).toBe(true);
  return prise;
}

export async function isStillMounted(prise: JSHandle<Element | null>): Promise<boolean> {
  return prise.evaluate((noeud) => noeud !== null && noeud.isConnected);
}

export async function accountSheetButtonHandle(
  page: Page,
): Promise<ElementHandle<SVGElement | HTMLElement>> {
  return page.waitForSelector('role=button[name="Compte"]', { state: 'attached' });
}

export async function reopenAccountSheetDuringExit(
  bouton: ElementHandle<SVGElement | HTMLElement>,
): Promise<void> {
  await bouton.dispatchEvent('click');
}

const ATTENTE_TRANSITION_MS = 5_000;

export async function waitForExitToStart(
  page: Page,
  prise: JSHandle<Element | null>,
): Promise<void> {
  await page.waitForFunction(
    (noeud) => noeud !== null && getComputedStyle(noeud).transform !== 'matrix(1, 0, 0, 1, 0, 0)',
    prise,
    { timeout: ATTENTE_TRANSITION_MS },
  );
}

export async function waitForSheetBackInPlace(
  page: Page,
  prise: JSHandle<Element | null>,
): Promise<void> {
  await page.waitForFunction(
    (noeud) => noeud !== null && getComputedStyle(noeud).transform === 'matrix(1, 0, 0, 1, 0, 0)',
    prise,
    { timeout: ATTENTE_TRANSITION_MS },
  );
}
