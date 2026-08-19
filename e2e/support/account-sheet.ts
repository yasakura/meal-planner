import { expect, type ElementHandle, type JSHandle, type Page } from '@playwright/test';

/**
 * Ouvre la sheet Compte et attend qu'elle soit là. Elle est rendue dans un PORTAIL sur
 * `document.body`, donc hors de `main` : aucun scénario ne doit la chercher dans le contenu
 * de la route.
 */
export async function openAccountSheet(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Compte' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Compte' })).toBeVisible();
}

export async function closeAccountSheet(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Fermer' }).click();
}

/**
 * PRISE sur le nœud du panneau, pour répondre plus tard à « est-ce le MÊME panneau ? ».
 *
 * React ne réutilise pas un nœud démonté : si la sheet se démonte puis se remonte, celui-ci est
 * détaché pour toujours et un autre le remplace. `isConnected` distingue donc les deux histoires
 * que `toBeVisible()` confond — « la sheet n'a jamais été démontée » et « elle a été démontée puis
 * reconstruite ». C'est exactement la distinction dont dépend le nettoyage de l'état transitoire :
 * seul un remontage rejoue `loadConvives`, donc `restAddLifecycle`.
 */
export async function panelHandle(page: Page): Promise<JSHandle<Element | null>> {
  const prise = await page.evaluateHandle(() =>
    document.querySelector('[data-testid="account-sheet-panel"]'),
  );
  // Gage de la mesure : une prise nulle rendrait `isStillMounted` faux pour la mauvaise raison,
  // et le scénario du démontage serait vert sans que rien n'ait été observé.
  expect(await prise.evaluate((noeud) => noeud !== null)).toBe(true);
  return prise;
}

export async function isStillMounted(prise: JSHandle<Element | null>): Promise<boolean> {
  return prise.evaluate((noeud) => noeud !== null && noeud.isConnected);
}

/**
 * Le bouton « Compte » pris À L'AVANCE, avant même le « Fermer ».
 *
 * La réouverture éclair dispose de 200 ms — la durée de la transition de sortie — et résoudre un
 * localisateur coûte un aller-retour CDP de plus dans cette fenêtre. La prise le paie avant que
 * le chronomètre ne parte.
 */
export async function accountSheetButtonHandle(
  page: Page,
): Promise<ElementHandle<SVGElement | HTMLElement>> {
  return page.waitForSelector('role=button[name="Compte"]', { state: 'attached' });
}

/**
 * Rouvre la sheet PENDANT sa transition de sortie — la seule fenêtre où le démontage différé peut
 * être annulé (`isRendered = isOpen || isClosing` dans `AccountSheet`).
 *
 * `dispatchEvent` et non `click()`, délibérément : l'overlay couvre encore tout l'écran pendant
 * les 200 ms de sa disparition, donc Playwright attend qu'il s'en aille avant de cliquer pour de
 * bon. Mesuré sur ce dépôt : un `click()` réel sur « Compte » juste après « Fermer » aboutit à
 * 540 ms, largement APRÈS le démontage. La réouverture éclair n'est donc pas atteignable au doigt
 * par ce bouton ; ce que ce raccourci exerce, c'est la machine à états de la sheet, pas un geste
 * d'utilisateur.
 */
export async function reopenAccountSheetDuringExit(
  bouton: ElementHandle<SVGElement | HTMLElement>,
): Promise<void> {
  await bouton.dispatchEvent('click');
}

/**
 * `matrix(1, 0, 0, 1, 0, 0)` est le `transform: translateY(0)` du panneau tel que Chromium le
 * calcule (mesuré, pas déduit) : la sheet est À SA PLACE, sa transition terminée. Le littéral est
 * réécrit dans chacune des deux attentes ci-dessous plutôt que partagé — une fonction de page
 * n'accède à aucune constante du fichier, et la passer en argument coûterait un transtypage.
 *
 * Les deux s'en servent en sens contraire, et un troisième cas les départage : un nœud DÉTACHÉ ne
 * rend aucune transformation du tout (`''` mesuré). Il ne sera donc jamais pris pour un panneau
 * en place.
 *
 * 5 s : vingt-cinq fois la transition de 200 ms, et sous le délai du test — un dépassement se lit
 * alors sur la ligne d'attente fautive, pas comme un scénario mort de vieillesse.
 */
const ATTENTE_TRANSITION_MS = 5_000;

/**
 * Attend la preuve que la transition de SORTIE a démarré : le panneau a quitté sa place
 * (`transform: translateY(100%)` sous `$closing`, donc une matrice qui n'est plus l'identité).
 *
 * Sans elle, le scénario de réouverture éclair passerait entièrement alors qu'aucune fermeture
 * n'aurait eu lieu : un « Fermer » cassé laisse le nœud attaché, et la survie du panneau devient
 * vraie pour la mauvaise raison. Attente en `raf`, pas en sommeil : elle coûte une frame, et la
 * fenêtre de tir de la réouverture n'en est pas entamée.
 */
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

/**
 * Attend que le panneau soit revenu en place SUR CETTE PRISE — ce que seule une réouverture ayant
 * pris effet sur ce nœud-là peut produire.
 *
 * Remplace un `waitForTimeout` qui pariait dans les deux sens : trop court, la sortie n'était pas
 * finie et le rouge était faux ; trop long, le nœud était encore attaché par simple lenteur et le
 * vert ne prouvait rien. Ici la transformation identité est un état terminal, pas un instant :
 * l'attente se gage elle-même à chaque exécution, sur une machine lente comme sur une machine
 * rapide.
 */
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
