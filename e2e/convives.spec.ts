import { expect, test, type Page } from '@playwright/test';

import { openAccountSheet } from './support/account-sheet';
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

test.describe('Foyer', () => {
  test('ajouter, renommer et retirer un convive, confirmation comprise', async ({ page }) => {
    await page.goto('/catalogue');
    await openAccountSheet(page);
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile']);

    // Ajout : le convive prend sa place alphabétique, et le champ se vide.
    await champPrenom(page).fill('Zoé');
    await boutonAjouter(page).click();
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile', 'Zoé']);
    await expect(champPrenom(page)).toHaveValue('');

    // Renommage : le champ est pré-rempli avec le prénom affiché.
    await page.getByRole('button', { name: 'Renommer Bruno' }).click();
    const champRenommage = page.getByLabel('Nouveau prénom pour Bruno');
    await expect(champRenommage).toHaveValue('Bruno');
    // `Ulysse` et non un prénom en A- : Bruno est en 2e position, et un nouveau prénom qui
    // garde ce rang rendrait la liste IDENTIQUE avec ou sans tri — l'assertion suivante ne
    // pourrait plus défendre la règle que son commentaire annonce. Le rang doit changer.
    await champRenommage.fill('Ulysse');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    // Renommer déplace aussi dans l'ordre du foyer : sans tri, Ulysse resterait en 2e position.
    await expect(prenoms(page)).toHaveText(['Alice', 'Chloé', 'Émile', 'Ulysse', 'Zoé']);

    // Retrait : la confirmation protège réellement — annuler ne retire personne.
    await page.getByRole('button', { name: 'Retirer Chloé' }).click();
    await expect(page.getByText('Retirer Chloé du foyer ?')).toBeVisible();
    await page.getByRole('button', { name: 'Annuler', exact: true }).click();
    await expect(prenoms(page)).toHaveText(['Alice', 'Chloé', 'Émile', 'Ulysse', 'Zoé']);

    await page.getByRole('button', { name: 'Retirer Chloé' }).click();
    await page.getByRole('button', { name: 'Retirer', exact: true }).click();
    await expect(prenoms(page)).toHaveText(['Alice', 'Émile', 'Ulysse', 'Zoé']);
  });

  test('un prénom accentué se range à sa lettre de base', async ({ page }) => {
    // Foyer vide au départ : les trois prénoms sont saisis dans un ordre qui n'est pas le
    // leur, pour que seul le tri puisse produire le résultat attendu.
    await page.goto('/catalogue?convives=0');
    await openAccountSheet(page);
    await expect(page.getByText('Personne dans le foyer pour le moment.')).toBeVisible();

    for (const prenom of ['Lionel', 'Élise', 'Aurélie']) {
      await champPrenom(page).fill(prenom);
      await boutonAjouter(page).click();
      await expect(champPrenom(page)).toHaveValue('');
    }

    // Élise se range entre Aurélie et Lionel, et non après Z comme le ferait un tri sur les
    // points de code.
    await expect(prenoms(page)).toHaveText(['Aurélie', 'Élise', 'Lionel']);
  });

  test('un prénom long ne déborde pas sur les boutons de sa ligne', async ({ page }) => {
    // Un seul mot, sans trait d'union ni espace : aucune césure naturelle, donc le texte
    // déborde de sa boîte si rien ne l'y force. Mesuré, pas capturé — une capture d'écran ne
    // dit pas si le prénom passe PAR-DESSUS les boutons.
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
    // La mesure d'abord, la comparaison ensuite : `0 <= 0` est VRAI, donc une cellule qui n'est
    // pas peinte (portail cassé, panneau en `display: none`) rendrait vert le seul test de mise
    // en page de la suite. `toHaveText` ci-dessus ne l'attraperait pas — il lit le
    // `textContent`, qui existe sans qu'aucun pixel ne soit rendu.
    expect(debordement.clientWidth).toBeGreaterThan(0);
    expect(debordement.scrollWidth).toBeLessThanOrEqual(debordement.clientWidth);
  });
});

test.describe('Foyer hors ligne', () => {
  test('un ajout non confirmé nomme le convive, garde la saisie et verrouille le bouton', async ({
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

    // Rien ne prouve que l'écriture est enregistrée : le convive n'entre pas dans la liste.
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile']);
    // La saisie survit : la re-taper à la main serait la punition d'une panne réseau.
    await expect(champPrenom(page)).toHaveValue('Zoé');
    // Second appui verrouillé : l'écriture est réellement partie, un second id ferait doublon.
    await expect(boutonAjouter(page)).toBeDisabled();
    // Le champ, LUI, reste ouvert — c'est la frappe qui déverrouille.
    await expect(champPrenom(page)).toBeEnabled();
  });

  test('une frappe efface le constat, déverrouille le bouton, et l’ajout suivant n’en garde aucune trace', async ({
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
    // Le MÊME localisateur que les assertions d'absence plus bas, vu ici en train de trouver
    // quelque chose : sans ça, un localisateur devenu faux rendrait ces absences toujours
    // vraies, donc muettes.
    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(1);

    // UNE frappe, pas un remontage : le remontage n'est pas garanti — la sheet reste montée
    // pendant sa transition de sortie, une réouverture rapide ne rejoue aucun effet.
    // `End` d'abord : `press()` commence par `focus()`, et Chromium place alors le curseur en
    // TÊTE du champ — un `Backspace` seul n'effacerait rien et ne changerait donc rien.
    await champPrenom(page).press('End');
    await champPrenom(page).press('Backspace');
    await expect(champPrenom(page)).toHaveValue('Zo');

    await expect(page.getByText('Aucune connexion')).toHaveCount(0);
    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(0);
    await expect(boutonAjouter(page)).toBeEnabled();

    // Sortie complète de l'état : le réseau revient, l'ajout aboutit, et l'écran ne se
    // contredit pas — le convive dans la liste ET le constat d'échec, c'est le défaut vécu.
    await restore(page);
    await champPrenom(page).fill('Zoé');
    await boutonAjouter(page).click();

    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile', 'Zoé']);
    await expect(champPrenom(page)).toHaveValue('');
    await expect(page.getByText('Aucune connexion')).toHaveCount(0);
    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(0);
  });

  test('un cycle de renommage inachevé rend les autres lignes inertes, une frappe les réveille', async ({
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
    // Le MÊME localisateur que l'assertion d'absence de la fin, vu ici en train de trouver
    // quelque chose.
    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(1);
    // La ligne d'Alice est en édition, donc elle ne rend AUCUN `convive-name` : cette assertion
    // dit « Alice est passée en édition et les trois autres lignes n'ont pas bougé », pas que le
    // renommage n'a pas été appliqué. La garantie de l'ancien prénom est portée plus bas, par le
    // libellé du champ d'édition.
    await expect(prenoms(page)).toHaveText(['Bruno', 'Chloé', 'Émile']);

    // Les autres lignes sont inertes tant que ce cycle n'est pas soldé : ouvrir Bruno
    // effacerait le constat d'Alice avant qu'il ait été lu, et déplacerait l'édition sous le
    // brouillon en cours.
    await expect(page.getByRole('button', { name: 'Renommer Bruno' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Retirer Bruno' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Renommer Chloé' })).toBeDisabled();

    // Le verrou n'est pas une impasse : une frappe dans la ligne éditée solde le cycle.
    //
    // `getByLabel('Nouveau prénom pour Alice')` porte DEUX choses, et ce n'est pas un hasard :
    // il désigne le champ, et il assure au passage que le store garde l'ANCIEN prénom — le
    // libellé se construit sur `row.name`, donc il dirait « pour Alicia » si le renommage avait
    // été appliqué de façon optimiste. Le remplacer par un `locator('input')` supprimerait
    // silencieusement cette garantie : c'est le seul endroit du scénario qui la tient.
    //
    // `End` d'abord, pour la même raison que dans le scénario d'ajout.
    await page.getByLabel('Nouveau prénom pour Alice').press('End');
    await page.getByLabel('Nouveau prénom pour Alice').press('Backspace');
    await expect(page.getByLabel('Nouveau prénom pour Alice')).toHaveValue('Alici');

    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Renommer Bruno' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Retirer Bruno' })).toBeEnabled();
  });
});
