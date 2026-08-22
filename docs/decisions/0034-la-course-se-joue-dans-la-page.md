# ADR 0034 — Une course contre une animation se joue DANS la page

- **Statut** : en vigueur
- **Date** : 2026-08-23
- **Portée** : `e2e/support/account-sheet.ts`, `e2e/convives.spec.ts`
- **Issue** : [#70](https://github.com/yasakura/meal-planner/issues/70)

## Contexte

Deux scénarios exercent le raccourci de la machine à états de la sheet : fermer, puis **rouvrir
pendant la transition de sortie**, et vérifier que le panneau n'a pas été démonté — le nœud est le
même, l'état de l'écriture en cours est intact. L'un d'eux est tombé une fois sous charge, vert
rejoué seul.

L'ancienne chorégraphie enchaînait, **depuis Node** : attendre que la transformation du panneau
quitte l'identité, dispatcher le clic de réouverture, attendre que la transformation revienne à
l'identité, avec une borne maison de 5 000 ms.

## Ce que la mesure a dit — et l'issue #70 se trompait de cause

L'issue attribuait la fragilité à la **transition qui s'étire** sous charge, jusqu'à dépasser la
borne. La sonde dit autre chose.

| Chorégraphie | Sans perturbation | +150 ms | +300 ms | +1000 ms et CPU ÷8 |
| ------------ | ----------------- | ------- | ------- | ------------------ |
| Ancienne     | 5/5               | 4/4     | **0/6** | **0/4**            |
| Nouvelle     | 5/5               | 4/4     | 6/6     | 4/4                |

La perturbation est une pause injectée **côté Node**, entre la détection du début de sortie et le
clic de réouverture : c'est ce que produit une machine chargée, où plusieurs workers Playwright se
disputent le même processus. La transition, elle, dure 200 ms de **temps mural** et ne s'étire pas.

Le mécanisme réel : la fenêtre entre « la sortie a commencé » et « la sortie est finie » ne dure que
200 ms. Passé ce délai, `onTransitionEnd` a démonté le panneau, le clic de réouverture arrive trop
tard, et la prise pointe un nœud **détaché** — pour lequel `getComputedStyle(nœud).transform` rend
`""`, mesuré. L'attente d'une identité qui ne peut plus jamais venir consomme alors ses 5 000 ms.

Élargir la borne (piste 1 de l'issue) n'aurait donc rien corrigé : elle n'aurait allongé qu'un échec
déjà certain.

## Décision

**Toute la chorégraphie de course est armée dans la page, avant le geste qui la déclenche.** Un seul
aller-retour Node pose, sur le panneau, une promesse qui :

1. guette par `requestAnimationFrame` le premier écart de la transformation à l'identité ;
2. installe **puis seulement** le guetteur de `transitionend`, et dispatche le clic de réouverture
   dans la **même tâche** ;
3. rend la main une trame après la fin de transition.

Le scénario garde ses gestes lisibles : `closeAccountSheet(page)` reste un clic Playwright par rôle,
entre l'armement et l'attente. Plus aucun aller-retour Node ne tombe **à l'intérieur** de la fenêtre
de 200 ms : une machine chargée retarde l'armement ou l'attente, jamais la course.

L'attente finale n'est plus une **borne de temps sur une valeur interpolée**, mais l'**événement qui
porte le démontage**. `transitionend` est ce qui déclenche `finishClose` : l'attendre, c'est attendre
exactement l'instant où le panneau aurait disparu. La transition inverse se terminant après celle
qu'elle annule, la fenêtre est franchie par construction, sans qu'aucune durée soit écrite nulle part.

## Ce que la décision ne fait pas

- **Elle ne neutralise pas les transitions** (piste 2 de l'issue). Vider la transition en mode e2e
  viderait le test : ce qui est exercé, c'est le comportement **pendant** la sortie.
- **Elle ne change aucune assertion.** Les deux scénarios vérifient les mêmes faits, sur les mêmes
  nœuds. Seule la façon d'attendre a changé — protocole anti test-tampering respecté.
- **Elle n'ajoute aucune porte dans la production.** `AccountSheet` est inchangé.

## La mesure de la mesure

Le filet ne pouvant pas naître rouge, il a été confronté par **sabotage** : le clic de réouverture
retiré de la chorégraphie, les deux scénarios tombent sur `isStillMounted` → `false`, c'est-à-dire
exactement ce que leur nom promet de retenir — « rouvrir pendant la sortie ne démonte pas la sheet ».
Le scénario voisin, qui affirme le démontage après une fermeture menée à son terme, reste vert
pendant ce sabotage : le geste saboté est bien la réouverture, et rien d'autre.

## Conséquences

- `ATTENTE_TRANSITION_MS` disparaît : plus aucune durée n'est écrite dans les helpers de la sheet.
- `panelHandle` rend désormais un `ElementHandle` obtenu par `waitForSelector`, non nullable : le
  `!== null` disséminé dans les helpers n'a plus lieu d'être.
- La réouverture reste un `MouseEvent` dispatché, et non un clic Playwright : pendant la sortie,
  l'overlay couvre le bouton et un clic soumis aux vérifications d'actionnabilité n'aboutirait pas.
- Règle générale pour la suite : **une assertion sur un état transitoire d'animation s'arme avant le
  geste qui l'ouvre**. Un aller-retour Node placé dans la fenêtre est une course perdue d'avance sur
  une machine chargée.
