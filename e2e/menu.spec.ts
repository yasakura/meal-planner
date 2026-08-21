import { expect, test, type Locator, type Page } from '@playwright/test';

import { failReads, failWrites, restore } from './support/e2e-controls';

test.describe('Menu', () => {
  test('générer un menu remplit les repas de la quinzaine', async ({ page }) => {
    await page.goto('/menu');

    await expect(page.getByRole('heading', { level: 1, name: 'Menu' })).toBeVisible();
    await page.getByRole('button', { name: 'Générer un menu' }).click();

    const jours = page.locator('main section');
    await expect(jours).toHaveCount(14);
    await expect(page.locator('main section li')).toHaveCount(28);

    await expect(page.getByText('Omelette aux herbes')).toHaveCount(10);
    await expect(page.getByText('Gratin dauphinois')).toHaveCount(9);
    await expect(page.getByText('Curry de pois chiches')).toHaveCount(9);

    await expect(jours.first().getByRole('heading', { level: 2 })).toHaveText('lundi 5 janvier');
    await expect(jours.last().getByRole('heading', { level: 2 })).toHaveText('dimanche 18 janvier');

    const premierJour = jours.first().locator('li');
    await expect(premierJour).toHaveCount(2);
    await expect(premierJour.nth(0)).toContainText('Midi');
    await expect(premierJour.nth(0)).toContainText('Omelette aux herbes');
    await expect(premierJour.nth(1)).toContainText('Soir');
    await expect(premierJour.nth(1)).toContainText('Gratin dauphinois');

    await expect(page.getByRole('button', { name: 'Régénérer' })).toBeVisible();
  });

  test('la fenêtre choisie survit à un aller-retour vers le catalogue', async ({ page }) => {
    await page.goto('/menu');

    const uneSemaine = page.getByRole('button', { name: '1 semaine' });
    const deuxSemaines = page.getByRole('button', { name: '2 semaines' });
    await expect(uneSemaine).toHaveAttribute('aria-pressed', 'false');
    await expect(deuxSemaines).toHaveAttribute('aria-pressed', 'true');

    await uneSemaine.click();
    await page.getByRole('button', { name: 'Générer un menu' }).click();
    await expect(page.locator('main section')).toHaveCount(7);

    await page.click('nav a[href="/catalogue"]');
    await expect(page.getByRole('heading', { level: 1, name: 'Recettes' })).toBeVisible();
    await page.click('nav a[href="/menu"]');
    await expect(page.getByRole('heading', { level: 1, name: 'Menu' })).toBeVisible();

    await expect(page.locator('main section')).toHaveCount(7);
    await expect(uneSemaine).toHaveAttribute('aria-pressed', 'true');
    await expect(deuxSemaines).toHaveAttribute('aria-pressed', 'false');
  });

  test('le menu refuse une date de début passée, puis accepte le jour même', async ({ page }) => {
    await page.goto('/menu');

    const champ = page.getByLabel('Début du menu');
    await expect(champ).toHaveValue('2026-01-05');
    await expect(champ).toHaveAttribute('min', '2026-01-01');

    await champ.fill('2025-12-25');

    const constat = page.getByText('Le menu ne peut pas commencer avant aujourd’hui.');
    await expect(constat).toHaveCount(1);
    await expect(champ).toHaveValue('2026-01-05');

    await champ.fill('2026-01-01');

    await expect(champ).toHaveValue('2026-01-01');
    await expect(constat).toHaveCount(0);

    await page.getByRole('button', { name: 'Générer un menu' }).click();
    const premierJour = page.locator('main section').first();
    await expect(premierJour.getByRole('heading', { level: 2 })).toHaveText('jeudi 1er janvier');
  });

  test('sans recette, le menu refuse de générer et le dit ; une recette créée, il génère', async ({
    page,
  }) => {
    await page.goto('/menu?recipes=0');
    await page.getByRole('button', { name: 'Générer un menu' }).click();

    await expect(page.getByRole('alert')).toHaveText(
      "Ajoute d'abord des recettes pour générer un menu.",
    );
    await expect(page.getByText("Ajoute d'abord des recettes")).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible();

    await page.click('nav a[href="/catalogue"]');
    await page.getByRole('link', { name: 'Ajouter une recette' }).click();
    await page.getByLabel('Titre').fill('Tarte aux poireaux');
    await page.locator('#ingredient-name-0').fill('Poireaux');
    await page.locator('#ingredient-quantity-0').fill('3');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page).toHaveURL('/catalogue');

    await page.click('nav a[href="/menu"]');
    await page.getByRole('button', { name: 'Réessayer' }).click();

    await expect(page.locator('main section')).toHaveCount(14);
    await expect(page.locator('main section li')).toHaveCount(28);
    await expect(page.getByText('Tarte aux poireaux')).toHaveCount(28);
    await expect(page.getByText("Ajoute d'abord des recettes")).toHaveCount(0);
  });

  test('hors ligne, le menu porte le constat du menu et non celui d’un catalogue vide', async ({
    page,
  }) => {
    await page.goto('/menu');
    await failReads(page);
    const generer = page.getByRole('button', { name: 'Générer un menu' });
    await expect(generer).toHaveCount(1);
    await generer.click();

    const constat = page.getByText('Aucune connexion — le menu n’a pas pu être chargé.', {
      exact: true,
    });
    await expect(constat).toHaveCount(1);
    await expect(page.getByText("Ajoute d'abord des recettes")).toHaveCount(0);
    await expect(generer).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Réessayer' })).toHaveCount(0);

    await restore(page);
    await page.click('nav a[href="/catalogue"]');
    await page.click('nav a[href="/menu"]');
    await generer.click();

    await expect(page.locator('main section')).toHaveCount(14);
    await expect(page.locator('main section li')).toHaveCount(28);
    await expect(page.getByText('Omelette aux herbes')).toHaveCount(10);
    await expect(constat).toHaveCount(0);
  });

  test('générer un menu, puis l’enregistrer', async ({ page }) => {
    await page.goto('/menu');
    await page.getByRole('button', { name: 'Générer un menu' }).click();
    await expect(page.locator('main section')).toHaveCount(14);

    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page.getByText('Menu enregistré')).toHaveCount(1);
  });

  test('hors ligne, l’enregistrement n’est pas confirmé ; le réseau rétabli, il l’est', async ({
    page,
  }) => {
    await page.goto('/menu');
    await page.getByRole('button', { name: 'Générer un menu' }).click();
    await expect(page.locator('main section')).toHaveCount(14);

    await failWrites(page);
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    const panne = page.getByText(
      'Aucune connexion — l’enregistrement du menu n’a pas pu être confirmé.',
    );
    await expect(panne).toHaveCount(1);

    await restore(page);
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page.getByText('Menu enregistré')).toHaveCount(1);
    await expect(panne).toHaveCount(0);
  });
});

test.describe('Menu et modification de recette', () => {
  test('modifier le titre d’une recette rafraîchit le menu déjà généré, sans le régénérer', async ({
    page,
  }) => {
    await page.goto('/menu');
    await page.getByRole('button', { name: 'Générer un menu' }).click();

    const ancienTitre = page.getByText('Gratin dauphinois');
    const nouveauTitre = page.getByText('Aubergines farcies');
    await expect(ancienTitre).toHaveCount(9);
    await expect(nouveauTitre).toHaveCount(0);

    const premierJour = page.locator('main section').first().locator('li');
    await expect(premierJour.nth(1)).toContainText('Gratin dauphinois');

    await page.click('nav a[href="/catalogue"]');
    await expect(page.getByRole('heading', { level: 1, name: 'Recettes' })).toBeVisible();
    await page.getByRole('link', { name: 'Gratin dauphinois' }).click();
    await page.getByRole('link', { name: 'Modifier' }).click();
    await page.getByLabel('Titre').fill('Aubergines farcies');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page).toHaveURL('/catalogue/recipe-gratin-dauphinois');

    await page.click('nav a[href="/menu"]');
    await expect(page.getByRole('button', { name: 'Régénérer' })).toBeVisible();

    await expect(nouveauTitre).toHaveCount(9);
    await expect(ancienTitre).toHaveCount(0);
    await expect(premierJour.nth(1)).toContainText('Aubergines farcies');
    await expect(page.locator('main section')).toHaveCount(14);
    await expect(page.locator('main section li')).toHaveCount(28);
    await expect(page.getByText('Omelette aux herbes')).toHaveCount(10);
    await expect(page.getByText('Curry de pois chiches')).toHaveCount(9);
  });
});

type Centrage = {
  hauteurDuBloc: number;
  espaceAuDessus: number;
  espaceEnDessous: number;
};

async function centrageVertical(etat: Locator): Promise<Centrage> {
  return etat.evaluate((element) => {
    const ecran = element.parentElement as HTMLElement;
    const region = element.closest('main') as HTMLElement;

    const hautDeLaZone = element.getBoundingClientRect().top;
    const basDeLaZone =
      region.getBoundingClientRect().bottom -
      parseFloat(getComputedStyle(region).paddingBottom) -
      parseFloat(getComputedStyle(ecran).paddingBottom);

    const enfants = [...element.children].map((enfant) => enfant.getBoundingClientRect());
    const haut = Math.min(...enfants.map((boite) => boite.top));
    const bas = Math.max(...enfants.map((boite) => boite.bottom));

    return {
      hauteurDuBloc: bas - haut,
      espaceAuDessus: haut - hautDeLaZone,
      espaceEnDessous: basDeLaZone - bas,
    };
  });
}

test.describe('Mise en page du menu', () => {
  test('le menu sans recette centre son constat dans la hauteur offerte', async ({ page }) => {
    await page.goto('/menu?recipes=0');
    await page.getByRole('button', { name: 'Générer un menu' }).click();
    await expect(page.getByRole('alert')).toHaveText(
      "Ajoute d'abord des recettes pour générer un menu.",
    );

    const mesure = await centrageVertical(page.getByRole('alert').locator('..'));

    expect(mesure.hauteurDuBloc).toBeGreaterThan(0);
    expect(mesure.espaceAuDessus).toBeGreaterThan(0);
    expect(Math.abs(mesure.espaceAuDessus - mesure.espaceEnDessous)).toBeLessThanOrEqual(1);
  });
});

test.describe('Du menu à la fiche recette', () => {
  const retourMenu = (page: Page) => page.getByRole('link', { name: '← Menu', exact: true });
  const retourRecettes = (page: Page) => page.getByRole('link', { name: '← Recettes' });

  test('ouvrir une recette du menu, puis revenir au menu tel qu’il était', async ({ page }) => {
    await page.goto('/menu');
    await page.getByRole('button', { name: 'Générer un menu' }).click();
    await expect(page.locator('main section')).toHaveCount(14);

    const premierJour = page.locator('main section').first().locator('li');
    await premierJour.nth(0).getByRole('link', { name: 'Omelette aux herbes' }).click();

    await expect(page).toHaveURL('/catalogue/recipe-omelette-herbes?depuis=menu');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Omelette aux herbes' }),
    ).toBeVisible();

    await expect(retourMenu(page)).toHaveCount(1);
    await expect(retourRecettes(page)).toHaveCount(0);

    await retourMenu(page).click();
    await expect(page).toHaveURL('/menu');

    await expect(page.getByRole('button', { name: 'Régénérer' })).toBeVisible();
    await expect(page.locator('main section')).toHaveCount(14);
    await expect(page.locator('main section li')).toHaveCount(28);

    await page.click('nav a[href="/catalogue"]');
    await expect(page.getByRole('heading', { level: 1, name: 'Recettes' })).toBeVisible();
    await page.getByRole('link', { name: 'Omelette aux herbes' }).click();
    await expect(page).toHaveURL('/catalogue/recipe-omelette-herbes');
    await expect(retourRecettes(page)).toHaveCount(1);
    await expect(retourMenu(page)).toHaveCount(0);
  });

  test('la provenance survit à un rechargement de la fiche', async ({ page }) => {
    await page.goto('/menu');
    await page.getByRole('button', { name: 'Générer un menu' }).click();
    const premierJour = page.locator('main section').first().locator('li');
    await premierJour.nth(0).getByRole('link', { name: 'Omelette aux herbes' }).click();
    await expect(retourMenu(page)).toHaveCount(1);

    await page.reload();

    await expect(
      page.getByRole('heading', { level: 1, name: 'Omelette aux herbes' }),
    ).toBeVisible();
    await expect(retourMenu(page)).toHaveCount(1);
    await expect(retourRecettes(page)).toHaveCount(0);

    await retourMenu(page).click();
    await expect(page).toHaveURL('/menu');
    await expect(page.getByRole('button', { name: 'Générer un menu' })).toBeVisible();
  });

  test('modifier une recette ouverte depuis le menu, puis revenir au menu', async ({ page }) => {
    await page.goto('/menu');
    await page.getByRole('button', { name: 'Générer un menu' }).click();
    await expect(page.locator('main section')).toHaveCount(14);

    const premierJour = page.locator('main section').first().locator('li');
    await premierJour.nth(0).getByRole('link', { name: 'Omelette aux herbes' }).click();
    await expect(page).toHaveURL('/catalogue/recipe-omelette-herbes?depuis=menu');

    await page.getByRole('link', { name: 'Modifier' }).click();
    await expect(page).toHaveURL('/catalogue/recipe-omelette-herbes/modifier?depuis=menu');
    await expect(page.getByRole('link', { name: '← Recette', exact: true })).toHaveAttribute(
      'href',
      '/catalogue/recipe-omelette-herbes?depuis=menu',
    );

    await page.getByLabel('Titre').fill('Omelette aux fines herbes');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page).toHaveURL('/catalogue/recipe-omelette-herbes?depuis=menu');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Omelette aux fines herbes' }),
    ).toBeVisible();
    await expect(retourMenu(page)).toHaveCount(1);
    await expect(retourRecettes(page)).toHaveCount(0);

    await retourMenu(page).click();
    await expect(page).toHaveURL('/menu');

    await expect(page.getByRole('button', { name: 'Régénérer' })).toBeVisible();
    await expect(page.locator('main section')).toHaveCount(14);
    await expect(page.getByText('Omelette aux fines herbes')).toHaveCount(10);
  });

  test('la lecture en panne sur le formulaire venu du menu ramène au menu', async ({ page }) => {
    await page.goto('/menu');
    await page.getByRole('button', { name: 'Générer un menu' }).click();
    await expect(page.locator('main section')).toHaveCount(14);

    const premierJour = page.locator('main section').first().locator('li');
    await premierJour.nth(0).getByRole('link', { name: 'Omelette aux herbes' }).click();
    await expect(page).toHaveURL('/catalogue/recipe-omelette-herbes?depuis=menu');

    await failReads(page);
    await page.getByRole('link', { name: 'Modifier' }).click();
    await expect(page).toHaveURL('/catalogue/recipe-omelette-herbes/modifier?depuis=menu');
    await expect(
      page.getByText('Aucune connexion — la recette n’a pas pu être chargée.'),
    ).toHaveCount(1);

    await expect(retourMenu(page)).toHaveCount(1);
    await expect(retourRecettes(page)).toHaveCount(0);

    await retourMenu(page).click();
    await expect(page).toHaveURL('/menu');

    const constat = page.getByText('Aucune connexion — le menu n’a pas pu être chargé.', {
      exact: true,
    });
    await expect(constat).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Régénérer' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Réessayer' })).toHaveCount(0);
    await expect(page.locator('main section')).toHaveCount(0);

    await restore(page);
    await page.click('nav a[href="/catalogue"]');
    await page.click('nav a[href="/menu"]');

    await expect(page.getByRole('button', { name: 'Régénérer' })).toBeVisible();
    await expect(page.locator('main section')).toHaveCount(14);
    await expect(page.getByText('Omelette aux herbes')).toHaveCount(10);
    await expect(constat).toHaveCount(0);
  });
});
