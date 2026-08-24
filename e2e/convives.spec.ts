import { expect, test, type Page } from '@playwright/test';

import {
  accountSheetPanel,
  armReopenDuringExit,
  awaitReopenDuringExit,
  closeAccountSheet,
  isStillMounted,
  openAccountSheet,
  panelHandle,
} from './support/account-sheet';
import { attendreAtteignable } from './support/atteignabilite';
import { failWrites, restore } from './support/e2e-controls';

function prenoms(page: Page) {
  return page.locator('[data-testid="convive-name"]');
}

function champPrenom(page: Page) {
  return page.getByLabel('Prénom', { exact: true });
}

function boutonAjouter(page: Page) {
  return page.getByRole('button', { name: 'Ajouter', exact: true });
}

function bandeauDeRefus(page: Page) {
  return page.getByText('Une modification n’a pas pu être enregistrée.');
}

function fermerLeBandeau(page: Page) {
  return page
    .locator('[role="status"]')
    .filter({ hasText: 'Une modification n’a pas pu être enregistrée.' })
    .getByRole('button', { name: 'Fermer' });
}

test.describe('Foyer', () => {
  test('ajouter, renommer et retirer un convive, confirmation comprise', async ({ page }) => {
    await page.goto('/catalogue');
    await openAccountSheet(page);
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile']);

    await champPrenom(page).fill('Zoé');
    await boutonAjouter(page).click();
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile', 'Zoé']);
    await expect(champPrenom(page)).toHaveValue('');

    await page.getByRole('button', { name: 'Renommer Bruno' }).click();
    const champRenommage = page.getByLabel('Nouveau prénom pour Bruno');
    await expect(champRenommage).toHaveValue('Bruno');
    await champRenommage.fill('Ulysse');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(prenoms(page)).toHaveText(['Alice', 'Chloé', 'Émile', 'Ulysse', 'Zoé']);

    await page.getByRole('button', { name: 'Retirer Chloé' }).click();
    await expect(page.getByText('Retirer Chloé du foyer ?')).toBeVisible();
    await page.getByRole('button', { name: 'Annuler', exact: true }).click();
    await expect(prenoms(page)).toHaveText(['Alice', 'Chloé', 'Émile', 'Ulysse', 'Zoé']);

    await page.getByRole('button', { name: 'Retirer Chloé' }).click();
    await page.getByRole('button', { name: 'Retirer', exact: true }).click();
    await expect(prenoms(page)).toHaveText(['Alice', 'Émile', 'Ulysse', 'Zoé']);
  });

  test('un prénom accentué se range à sa lettre de base', async ({ page }) => {
    await page.goto('/catalogue?convives=0');
    await openAccountSheet(page);
    await expect(page.getByText('Personne dans le foyer pour le moment.')).toBeVisible();

    for (const prenom of ['Lionel', 'Élise', 'Aurélie']) {
      await champPrenom(page).fill(prenom);
      await boutonAjouter(page).click();
      await expect(champPrenom(page)).toHaveValue('');
    }

    await expect(prenoms(page)).toHaveText(['Aurélie', 'Élise', 'Lionel']);
  });

  test('un prénom long ne déborde pas sur les boutons de sa ligne', async ({ page }) => {
    const PRENOM_LONG = 'Maximilienalexandrebartholomeus';

    await page.goto('/catalogue?convives=0');
    await openAccountSheet(page);

    await champPrenom(page).fill(PRENOM_LONG);
    await boutonAjouter(page).click();

    const cellule = prenoms(page).first();
    await expect(cellule).toHaveText(PRENOM_LONG);

    const debordement = await cellule.evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    }));
    expect(debordement.clientWidth).toBeGreaterThan(0);
    expect(debordement.scrollWidth).toBeLessThanOrEqual(debordement.clientWidth);
  });
});

test.describe('Foyer et refus du serveur', () => {
  test('un ajout part tout de suite ; le refus du serveur le reprend et le bandeau l’annonce', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await openAccountSheet(page);
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile']);
    await expect(bandeauDeRefus(page)).toHaveCount(0);

    await failWrites(page);
    await champPrenom(page).fill('Zoé');
    await boutonAjouter(page).click();

    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile', 'Zoé']);
    await expect(champPrenom(page)).toHaveValue('');
    await expect(champPrenom(page)).toBeEnabled();

    await expect(bandeauDeRefus(page)).toHaveCount(1);
    await attendreAtteignable(bandeauDeRefus(page));
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile']);
  });

  test('un renommage part tout de suite ; le refus du serveur le reprend et le bandeau l’annonce', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await openAccountSheet(page);
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile']);

    await failWrites(page);
    await page.getByRole('button', { name: 'Renommer Alice' }).click();
    await page.getByLabel('Nouveau prénom pour Alice').fill('Alicia');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(prenoms(page)).toHaveText(['Alicia', 'Bruno', 'Chloé', 'Émile']);

    await expect(bandeauDeRefus(page)).toHaveCount(1);
    await attendreAtteignable(bandeauDeRefus(page));
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile']);
    await expect(page.getByRole('button', { name: 'Renommer Bruno' })).toBeEnabled();
  });

  test('un retrait fait disparaître la ligne tout de suite ; le refus la ramène, bandeau à l’appui', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await openAccountSheet(page);
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile']);

    await failWrites(page);
    await page.getByRole('button', { name: 'Retirer Chloé' }).click();
    await expect(page.getByText('Retirer Chloé du foyer ?')).toBeVisible();
    await page.getByRole('button', { name: 'Retirer', exact: true }).click();

    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Émile']);

    await expect(bandeauDeRefus(page)).toHaveCount(1);
    await attendreAtteignable(bandeauDeRefus(page));
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile']);
  });

  test('le bandeau de refus ne vit pas dans la sheet : la refermer ne l’emporte pas, « Fermer » oui', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await openAccountSheet(page);

    await failWrites(page);
    await champPrenom(page).fill('Zoé');
    await boutonAjouter(page).click();
    await expect(bandeauDeRefus(page)).toHaveCount(1);
    await attendreAtteignable(bandeauDeRefus(page));

    await closeAccountSheet(page);
    await expect(accountSheetPanel(page)).toHaveCount(0);
    await expect(bandeauDeRefus(page)).toHaveCount(1);
    await attendreAtteignable(bandeauDeRefus(page));

    await fermerLeBandeau(page).click();

    await expect(bandeauDeRefus(page)).toHaveCount(0);
    await restore(page);
    await openAccountSheet(page);
    await champPrenom(page).fill('Zoé');
    await boutonAjouter(page).click();
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile', 'Zoé']);
    await expect(bandeauDeRefus(page)).toHaveCount(0);
  });
});

test.describe('Foyer et cycle de vie de la sheet', () => {
  test('raccourci sur la machine à états — rouvrir pendant la sortie ne démonte pas la sheet, et la saisie reste telle quelle', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await openAccountSheet(page);

    await champPrenom(page).fill('Zoé');

    const panneau = await panelHandle(page);
    const reouverture = await armReopenDuringExit(page, panneau);
    await closeAccountSheet(page);

    await awaitReopenDuringExit(reouverture);
    expect(await isStillMounted(panneau)).toBe(true);
    await expect(page.getByRole('heading', { level: 2, name: 'Compte' })).toBeVisible();

    await expect(champPrenom(page)).toHaveValue('Zoé');
    await expect(boutonAjouter(page)).toBeEnabled();
  });

  test('rouvrir la sheet après son démontage repart d’un cycle d’ajout propre', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await openAccountSheet(page);

    await champPrenom(page).fill('Zoé');

    const panneau = await panelHandle(page);
    await expect(accountSheetPanel(page)).toHaveCount(1);
    await closeAccountSheet(page);
    await expect(accountSheetPanel(page)).toHaveCount(0);

    await openAccountSheet(page);
    expect(await isStillMounted(panneau)).toBe(false);

    await expect(champPrenom(page)).toHaveValue('');
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile']);

    await champPrenom(page).fill('Zoé');
    await boutonAjouter(page).click();
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile', 'Zoé']);
    await expect(bandeauDeRefus(page)).toHaveCount(0);
  });
});
