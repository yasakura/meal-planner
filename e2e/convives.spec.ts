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
import { failWrites, hangWrites, restore } from './support/e2e-controls';

function prenoms(page: Page) {
  return page.locator('[data-testid="convive-name"]');
}

function champPrenom(page: Page) {
  return page.getByLabel('Prénom', { exact: true });
}

function boutonAjouter(page: Page) {
  return page.getByRole('button', { name: 'Ajouter', exact: true });
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

test.describe('Foyer hors ligne', () => {
  test('un ajout non confirmé nomme le convive, garde la saisie, et ne verrouille rien', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await openAccountSheet(page);
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile']);

    await failWrites(page);
    await champPrenom(page).fill('Zoé');
    await boutonAjouter(page).click();

    await expect(
      page.getByText('Aucune connexion — l’ajout de Zoé n’a pas pu être confirmé.'),
    ).toBeVisible();

    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile']);
    await expect(champPrenom(page)).toHaveValue('Zoé');
    await expect(boutonAjouter(page)).toBeEnabled();
    await expect(champPrenom(page)).toBeEnabled();
  });

  test('un dépôt muet tient l’ajout en vol, puis la borne le déclare non confirmé, et le réseau revenu il aboutit', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await openAccountSheet(page);

    await hangWrites(page);
    await champPrenom(page).fill('Zoé');
    await boutonAjouter(page).click();
    await expect(boutonAjouter(page)).toBeDisabled();
    await expect(champPrenom(page)).toBeDisabled();
    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(0);

    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(1);
    await expect(
      page.getByText('Aucune connexion — l’ajout de Zoé n’a pas pu être confirmé.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(champPrenom(page)).toHaveValue('Zoé');
    await expect(champPrenom(page)).toBeEnabled();
    await expect(boutonAjouter(page)).toBeEnabled();
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile']);

    await restore(page);
    await boutonAjouter(page).click();
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile', 'Zoé']);
    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(0);
  });

  test('le constat d’ajout survit à la frappe, et c’est le second envoi qui le solde', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await openAccountSheet(page);

    await failWrites(page);
    await champPrenom(page).fill('Zoé');
    await boutonAjouter(page).click();
    await expect(
      page.getByText('Aucune connexion — l’ajout de Zoé n’a pas pu être confirmé.'),
    ).toBeVisible();
    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(1);

    await champPrenom(page).press('End');
    await champPrenom(page).press('Backspace');
    await expect(champPrenom(page)).toHaveValue('Zo');

    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(1);
    await expect(boutonAjouter(page)).toBeEnabled();

    await restore(page);
    await champPrenom(page).fill('Zoé');
    await boutonAjouter(page).click();

    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile', 'Zoé']);
    await expect(champPrenom(page)).toHaveValue('');
    await expect(page.getByText('Aucune connexion')).toHaveCount(0);
    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(0);
  });

  test('un cycle de renommage inachevé laisse les autres lignes actionnables, et le renommage abouti solde tout', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await openAccountSheet(page);
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile']);

    await failWrites(page);
    await page.getByRole('button', { name: 'Renommer Alice' }).click();
    await page.getByLabel('Nouveau prénom pour Alice').fill('Alicia');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(
      page.getByText('Aucune connexion — le renommage d’Alice n’a pas pu être confirmé.'),
    ).toBeVisible();
    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(1);
    await expect(prenoms(page)).toHaveText(['Bruno', 'Chloé', 'Émile']);

    await expect(page.getByRole('button', { name: 'Renommer Bruno' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Retirer Bruno' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Renommer Chloé' })).toBeEnabled();

    await page.getByLabel('Nouveau prénom pour Alice').press('End');
    await page.getByLabel('Nouveau prénom pour Alice').press('Backspace');
    await expect(page.getByLabel('Nouveau prénom pour Alice')).toHaveValue('Alici');

    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(1);

    await restore(page);
    await page.getByLabel('Nouveau prénom pour Alice').fill('Ulysse');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(prenoms(page)).toHaveText(['Bruno', 'Chloé', 'Émile', 'Ulysse']);
    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Enregistrer' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Renommer Bruno' })).toBeEnabled();
  });

  test('un retrait non confirmé n’efface personne, le dit, et le réseau revenu il aboutit', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await openAccountSheet(page);
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile']);

    await failWrites(page);
    await page.getByRole('button', { name: 'Retirer Chloé' }).click();
    await expect(page.getByText('Retirer Chloé du foyer ?')).toBeVisible();
    await page.getByRole('button', { name: 'Retirer', exact: true }).click();

    await expect(
      page.getByText('Aucune connexion — le retrait de Chloé n’a pas pu être confirmé.'),
    ).toBeVisible();
    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(1);

    await expect(page.getByText('Retirer Chloé du foyer ?')).toBeVisible();
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Émile']);

    await expect(page.getByRole('button', { name: 'Renommer Alice' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Retirer Alice' })).toBeEnabled();

    await restore(page);
    await page.getByRole('button', { name: 'Retirer', exact: true }).click();

    await expect(page.getByText('Retirer Chloé du foyer ?')).toHaveCount(0);
    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Renommer Alice' })).toBeEnabled();
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Émile']);

    await expect(accountSheetPanel(page)).toHaveCount(1);
    await closeAccountSheet(page);
    await expect(accountSheetPanel(page)).toHaveCount(0);
    await openAccountSheet(page);
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Émile']);
  });
});

test.describe('Foyer et cycle de vie de la sheet', () => {
  test('raccourci sur la machine à états — rouvrir pendant la sortie ne démonte pas la sheet, et l’ajout non confirmé reste tel quel', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await openAccountSheet(page);

    await failWrites(page);
    await champPrenom(page).fill('Zoé');
    await boutonAjouter(page).click();
    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(1);

    const panneau = await panelHandle(page);
    const reouverture = await armReopenDuringExit(page, panneau);
    await closeAccountSheet(page);

    await awaitReopenDuringExit(reouverture);
    expect(await isStillMounted(panneau)).toBe(true);
    await expect(page.getByRole('heading', { level: 2, name: 'Compte' })).toBeVisible();

    await expect(
      page.getByText('Aucune connexion — l’ajout de Zoé n’a pas pu être confirmé.'),
    ).toBeVisible();
    await expect(champPrenom(page)).toHaveValue('Zoé');
    await expect(boutonAjouter(page)).toBeEnabled();
  });

  test('rouvrir la sheet après son démontage repart d’un cycle d’ajout propre', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await openAccountSheet(page);

    await failWrites(page);
    await champPrenom(page).fill('Zoé');
    await boutonAjouter(page).click();
    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(1);

    const panneau = await panelHandle(page);
    await expect(accountSheetPanel(page)).toHaveCount(1);
    await closeAccountSheet(page);
    await expect(accountSheetPanel(page)).toHaveCount(0);

    await openAccountSheet(page);
    expect(await isStillMounted(panneau)).toBe(false);

    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(0);
    await expect(champPrenom(page)).toHaveValue('');
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile']);

    await restore(page);
    await champPrenom(page).fill('Zoé');
    await boutonAjouter(page).click();
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile', 'Zoé']);
    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(0);
  });

  test('un renommage non confirmé traverse une réouverture éclair, puis se solde au démontage', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await openAccountSheet(page);

    await failWrites(page);
    await page.getByRole('button', { name: 'Renommer Alice' }).click();
    await page.getByLabel('Nouveau prénom pour Alice').fill('Alicia');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(1);

    const panneau = await panelHandle(page);
    const reouverture = await armReopenDuringExit(page, panneau);
    await closeAccountSheet(page);
    await awaitReopenDuringExit(reouverture);
    expect(await isStillMounted(panneau)).toBe(true);

    await expect(page.getByLabel('Nouveau prénom pour Alice')).toHaveValue('Alicia');
    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(1);
    await expect(prenoms(page)).toHaveText(['Bruno', 'Chloé', 'Émile']);

    await expect(accountSheetPanel(page)).toHaveCount(1);
    await closeAccountSheet(page);
    await expect(accountSheetPanel(page)).toHaveCount(0);
    await openAccountSheet(page);
    expect(await isStillMounted(panneau)).toBe(false);

    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile']);
    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Renommer Bruno' })).toBeEnabled();
    await page.getByRole('button', { name: 'Renommer Alice' }).click();
    await expect(page.getByLabel('Nouveau prénom pour Alice')).toHaveValue('Alice');
  });
});
