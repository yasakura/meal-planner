import { expect, test, type Page } from '@playwright/test';

import {
  accountSheetButtonHandle,
  closeAccountSheet,
  isStillMounted,
  openAccountSheet,
  panelHandle,
  reopenAccountSheetDuringExit,
  waitForExitToStart,
  waitForSheetBackInPlace,
} from './support/account-sheet';
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

    // Rien ne prouve que l'écriture est enregistrée : le convive n'entre pas dans la liste.
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile']);
    // La saisie survit : la re-taper à la main serait la punition d'une panne réseau.
    await expect(champPrenom(page)).toHaveValue('Zoé');
    // Rien n'est verrouillé. L'écriture est partie sous l'identifiant du brouillon : un second
    // appui la RÉÉCRIT au même endroit, il ne peut pas dupliquer — il n'y a plus rien à empêcher.
    await expect(boutonAjouter(page)).toBeEnabled();
    await expect(champPrenom(page)).toBeEnabled();
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
    // Le MÊME localisateur que les assertions d'absence plus bas, vu ici en train de trouver
    // quelque chose : sans ça, un localisateur devenu faux rendrait ces absences toujours
    // vraies, donc muettes.
    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(1);

    // La frappe ne solde plus RIEN : le constat reste affiché, parce que rien n'oblige plus
    // l'utilisateur à taper pour se libérer — le bouton n'a jamais été verrouillé.
    // `End` d'abord : `press()` commence par `focus()`, et Chromium place alors le curseur en
    // TÊTE du champ — un `Backspace` seul n'effacerait rien et ne changerait donc rien.
    await champPrenom(page).press('End');
    await champPrenom(page).press('Backspace');
    await expect(champPrenom(page)).toHaveValue('Zo');

    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(1);
    await expect(boutonAjouter(page)).toBeEnabled();

    // SORTIE de l'état : le réseau revient, le SECOND ENVOI du même formulaire aboutit, et
    // l'écran ne se contredit pas — le convive dans la liste ET le constat d'échec, c'est le
    // défaut vécu. C'est le verdict suivant qui chasse le constat, pas la frappe.
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
    // Le MÊME localisateur que l'assertion d'absence de la fin, vu ici en train de trouver
    // quelque chose.
    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(1);
    // La ligne d'Alice est en édition, donc elle ne rend AUCUN `convive-name` : cette assertion
    // dit « Alice est passée en édition et les trois autres lignes n'ont pas bougé », pas que le
    // renommage n'a pas été appliqué. La garantie de l'ancien prénom est portée plus bas, par le
    // libellé du champ d'édition.
    await expect(prenoms(page)).toHaveText(['Bruno', 'Chloé', 'Émile']);

    // Les autres lignes restent ACTIONNABLES : un constat ne retient plus personne. Le
    // renommage vise un identifiant qui existe déjà — un second envoi est le même upsert, il ne
    // peut rien dupliquer, donc il n'y a rien à verrouiller.
    await expect(page.getByRole('button', { name: 'Renommer Bruno' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Retirer Bruno' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Renommer Chloé' })).toBeEnabled();

    // Et le constat SURVIT à la frappe : ce n'est plus elle qui solde le cycle.
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

    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(1);

    // SORTIE de l'état non-nominal, que le scénario d'ajout fait déjà : c'est le VERDICT SUIVANT
    // qui solde le cycle. Le réseau revient, l'écriture passe, et l'écran ne se contredit pas —
    // la liste à jour ET le constat d'échec côte à côte, c'est le défaut vécu le 2026-08-12.
    await restore(page);
    // `Ulysse` et non `Alicia` : Alice est en TÊTE de liste, et un prénom qui garde ce rang
    // rendrait l'assertion suivante identique avec ou sans tri. Le rang doit changer.
    await page.getByLabel('Nouveau prénom pour Alice').fill('Ulysse');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    // Quatre `convive-name` : la ligne d'Alice est REFERMÉE (une ligne en édition n'en rend
    // aucun), elle porte le nouveau prénom, et elle a rejoint sa place alphabétique.
    await expect(prenoms(page)).toHaveText(['Bruno', 'Chloé', 'Émile', 'Ulysse']);
    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(0);
    // Le même localisateur que les deux clics ci-dessus, donc gagé : plus aucun formulaire ouvert.
    await expect(page.getByRole('button', { name: 'Enregistrer' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Renommer Bruno' })).toBeEnabled();
  });

  /**
   * Le retrait est la seule écriture DESTRUCTIVE du foyer, et la seule dont aucun scénario ne
   * regardait l'échec. Son constat existe pourtant dans `convives-slice.ts` depuis FR-3.
   */
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
    // Le MÊME localisateur que l'absence de la fin, vu ici en train de trouver son texte.
    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(1);

    // Chloé n'est PAS effacée de l'écran : sa ligne est en mode confirmation, donc elle ne rend
    // aucun `convive-name` — c'est la question qui porte son prénom, et elle est toujours là.
    // Une disparition optimiste serait le pire des faux signaux sur un geste sans undo.
    await expect(page.getByText('Retirer Chloé du foyer ?')).toBeVisible();
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Émile']);

    // Les autres lignes restent actionnables, comme au renommage : un retrait vise lui aussi un
    // identifiant qui existe déjà, et l'effacement est idempotent.
    await expect(page.getByRole('button', { name: 'Renommer Alice' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Retirer Alice' })).toBeEnabled();

    // SORTIE : le réseau revient, le même geste aboutit.
    await restore(page);
    await page.getByRole('button', { name: 'Retirer', exact: true }).click();

    await expect(page.getByText('Retirer Chloé du foyer ?')).toHaveCount(0);
    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Renommer Alice' })).toBeEnabled();
    // L'ÉCRAN d'abord, sans rien relire : la ligne de Chloé repasserait en mode normal — donc
    // rendrait de nouveau son prénom — si le retrait n'était pas appliqué à la liste affichée.
    // Sans cette assertion, la relecture ci-dessous masque le défaut : le dépôt, lui, est juste.
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Émile']);

    // L'ÉCRAN ne suffit pas sur une écriture destructive : la sheet se ferme et se rouvre pour
    // forcer une relecture du dépôt. Chloé n'y est plus — le retrait rejoué a bien été écrit.
    await closeAccountSheet(page);
    await expect(page.locator('[data-testid="account-sheet-panel"]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Compte' }).click();
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Émile']);
  });
});

/**
 * Le seul endroit du dépôt où le TIMING RÉEL d'une transition CSS décide de l'état affiché.
 *
 * `convives-slice.ts` fait porter à `loadConvives.pending` un filet secondaire de remise à zéro,
 * et documente qu'il ne garantit rien : « `AccountSheet` garde son panneau monté pendant les
 * 200 ms de sa transition de sortie, donc une réouverture rapide n'entraîne aucun remontage et ce
 * thunk n'est jamais rejoué (mesuré : 80 ms → non, 700 ms → oui) ». jsdom ne peut pas trancher
 * cette phrase : il n'a ni transition, ni `transitionend`. Ces deux scénarios sont les deux
 * moitiés de la mesure, et ils se GAGENT l'un l'autre — le même instrument (`isStillMounted` sur
 * la prise du nœud) est exigé vrai dans l'un et faux dans l'autre.
 *
 * ATTENTION à ce que la moitié « pendant la sortie » est, et à ce qu'elle n'est pas. Elle exerce
 * la MACHINE À ÉTATS de la sheet, pas un doigt : la réouverture y passe par un `dispatchEvent`,
 * parce que l'overlay intercepte tout tap tant qu'il n'a pas disparu et qu'un vrai clic sur
 * « Compte » n'aboutit qu'à 540 ms — mesuré —, largement après le démontage. Aucun utilisateur ne
 * peut aujourd'hui emprunter ce chemin par ce bouton.
 *
 * Il est couvert quand même parce qu'il est à une décision de devenir le chemin normal : le jour
 * où l'overlay en sortie reçoit `pointer-events: none` — amélioration plausible, l'écran mangeant
 * 200 ms de taps à chaque fermeture —, la réouverture éclair devient atteignable au doigt, et le
 * filet est déjà posé.
 */
test.describe('Foyer et cycle de vie de la sheet', () => {
  test('raccourci sur la machine à états — rouvrir pendant la sortie ne démonte pas la sheet, et l’ajout non confirmé reste tel quel', async ({
    page,
  }) => {
    await page.goto('/catalogue');
    await openAccountSheet(page);

    await failWrites(page);
    await champPrenom(page).fill('Zoé');
    await boutonAjouter(page).click();
    // Le MÊME localisateur que l'assertion de survie plus bas, ET que l'absence du scénario
    // suivant : vu ici en train de trouver son texte, il ne peut pas y être muet pour rien.
    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(1);

    const panneau = await panelHandle(page);
    const boutonCompte = await accountSheetButtonHandle(page);
    await closeAccountSheet(page);

    // La sortie a COMMENCÉ. Sans cette preuve, un « Fermer » qui ne ferme plus laisserait tout le
    // scénario vert : le panneau resterait attaché, donc « toujours monté », sans qu'aucune
    // fermeture n'ait eu lieu ni qu'aucune réouverture n'ait rien annulé.
    await waitForExitToStart(page, panneau);
    await reopenAccountSheetDuringExit(boutonCompte);

    // Et la réouverture a pris effet SUR CE NŒUD-LÀ : lui seul peut revenir à sa place, un nœud
    // démonté ne se retransforme jamais. Le panneau qu'on retrouve est donc bien celui d'avant.
    await waitForSheetBackInPlace(page, panneau);
    expect(await isStillMounted(panneau)).toBe(true);
    await expect(page.getByRole('heading', { level: 2, name: 'Compte' })).toBeVisible();

    // Aucun remontage, donc aucun `loadConvives`, donc aucune remise à zéro : le constat et la
    // saisie sont restés exactement où on les a laissés. Le bouton, lui, n'a jamais été
    // verrouillé — c'est le verdict suivant qui portera la sortie.
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
    await closeAccountSheet(page);
    // Le démontage est ATTENDU, pas supposé : c'est lui qui rejoue `loadConvives`, donc le filet.
    await expect(page.locator('[data-testid="account-sheet-panel"]')).toHaveCount(0);

    // Vrai clic, à la vitesse d'un utilisateur : mesuré à 540 ms sur ce dépôt, parce que l'overlay
    // intercepte tout tap tant qu'il n'a pas disparu. C'est le cas ATTEIGNABLE des deux.
    await page.getByRole('button', { name: 'Compte' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Compte' })).toBeVisible();
    expect(await isStillMounted(panneau)).toBe(false);

    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(0);
    await expect(champPrenom(page)).toHaveValue('');
    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile']);

    // Et l'écran n'est pas une impasse : le réseau revenu, le même ajout aboutit.
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
    const boutonCompte = await accountSheetButtonHandle(page);
    await closeAccountSheet(page);
    await waitForExitToStart(page, panneau);
    await reopenAccountSheetDuringExit(boutonCompte);
    await waitForSheetBackInPlace(page, panneau);
    expect(await isStillMounted(panneau)).toBe(true);

    // Sans remontage, l'édition et son BROUILLON sont là où on les a laissés : la ligne d'Alice
    // est toujours ouverte, le texte tapé n'a pas été perdu, et le constat attend d'être lu.
    await expect(page.getByLabel('Nouveau prénom pour Alice')).toHaveValue('Alicia');
    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(1);
    await expect(prenoms(page)).toHaveText(['Bruno', 'Chloé', 'Émile']);

    // Le démontage, lui, solde le cycle : la ligne se referme sur l'ANCIEN prénom — le renommage
    // n'a jamais été acquitté, rien ne prouve qu'il est enregistré.
    await closeAccountSheet(page);
    await expect(page.locator('[data-testid="account-sheet-panel"]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Compte' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Compte' })).toBeVisible();
    expect(await isStillMounted(panneau)).toBe(false);

    await expect(prenoms(page)).toHaveText(['Alice', 'Bruno', 'Chloé', 'Émile']);
    await expect(page.getByText('n’a pas pu être confirmé')).toHaveCount(0);
    // Le brouillon est parti avec l'édition : rouvrir la ligne repart du prénom affiché.
    await expect(page.getByRole('button', { name: 'Renommer Bruno' })).toBeEnabled();
    await page.getByRole('button', { name: 'Renommer Alice' }).click();
    await expect(page.getByLabel('Nouveau prénom pour Alice')).toHaveValue('Alice');
  });
});
