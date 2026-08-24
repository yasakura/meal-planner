import { type Page } from '@playwright/test';

type E2eControls = {
  failReads(): void;
  failWrites(): void;
  restore(): void;
};

type E2eWindow = Window & { __e2e: E2eControls };

async function e2eControls(page: Page): Promise<void> {
  await page.waitForFunction(() => '__e2e' in window);
}

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
