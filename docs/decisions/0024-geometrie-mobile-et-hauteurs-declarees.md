# ADR 0024 — Géométrie mobile : des hauteurs déclarées, jamais émergentes

- **Statut** : en vigueur
- **Date** : 2026-08-18 (`c7b0a6e`, `fix(ui): rendre cliquable ce que l'utilisateur voit`) ; mesures
  de compression d'onglet le 2026-08-19 (`f2c7701`)
- **Portée** : `src/ui/Layout.tsx`, `BottomTabBar.tsx`, `RecipeCreateScreen.tsx`,
  `ConvivesSection.tsx`, `AccountSheet.tsx`, `e2e/support/atteignabilite.ts`

## Contexte

L'application est **mobile-only**, vérifiée en 393×852 (iPhone 14/15 en portrait). Une tab bar
collante occupe le bas de l'écran, et le **scrollport se termine au bas du viewport** — donc
**sous** la tab bar. Tout ce qui veut se poser « juste au-dessus » doit connaître sa hauteur.

Le piège : une hauteur **émergente** (bordure + paddings + icône + interligne d'un libellé) dépend
de la **police effectivement résolue**, et donc de la machine.

## Les mesures

- **La hauteur de la tab bar n'est pas portable.** `-apple-system` n'existe ni sur Linux ni sur un
  runner CI ; le même empilement pouvait valoir **57 px** ailleurs qu'en local — un pixel de
  recouvrement **invisible pour tout filet tournant sur Chromium**.
- **La compression frappe l'icône, pas le libellé.** Un onglet est une colonne flex : sans
  `flex-shrink: 0` sur l'icône, c'est **elle** qui cède la première quand le libellé grandit.
  Mesuré à **22 px déclarés : 7 px peints** avec un libellé à 24 px, **0** à 34 px. L'interligne de
  `system-ui` varie de **12,8** (DejaVu) à **15,0** (Noto Sans) selon la machine, pour **13 px** de
  budget — la compression n'attend pas qu'on change le libellé, elle attend qu'on **change de
  poste**.
- **Un prénom plus long que sa boîte s'affichait PAR-DESSUS les boutons**, mesuré à 393 px. Il
  passe désormais à la ligne : la rangée grandit, rien ne se recouvre.
- **En dessous de 16 px de police, iOS zoome au focus d'un champ.** C'est le plancher de tous les
  champs de saisie.

## Décision

1. **La tab bar DÉCLARE sa hauteur** (`--tabbar-h`, publiée par `Layout`) et la consomme
   elle-même. Tout ce qui doit se poser au-dessus lit cette variable ; personne ne recalcule.
   Le scénario Playwright « la barre d'action se pose exactement sur le haut de la tab bar »
   confronte les deux à la géométrie réelle à chaque exécution : la valeur ne peut pas dériver en
   silence.
2. **La barre d'action des formulaires est collante à `bottom: var(--tabbar-h)`** — `bottom: 0`
   collerait le bouton **sous** la tab bar. Elle porte **aussi les constats d'enregistrement**, et
   c'est sa raison d'être la plus importante : laissés à leur position naturelle dans le flux, ils
   restaient **sous le pli** pendant que le bouton remontait avec le collant. L'utilisateur
   cliquait une commande atteignable, l'écriture échouait, **il ne voyait rien** — puis recliquait.
   Son fond opaque n'est pas un ornement : la barre ne réserve pas sa place, le formulaire défile
   **derrière** elle.
3. **Les icônes ne se compriment pas** (`flex-shrink: 0`), les champs ne descendent pas sous 16 px,
   les cibles tactiles font au moins 44 px.
4. **La sheet est rendue par un portail sur `document.body`.** TopBar et tab bar vivent dans des
   contextes d'empilement séparés où le `z-index` de l'overlay ne se comparerait pas. Ordre retenu :
   chrome collant à 10, overlay de sheet à 100.
5. **Les écrans d'état se centrent dans la hauteur offerte** : le conteneur prend `flex: 1` et la
   distribue. Un `<main>` en `display: block` ne transmet pas la hauteur qu'il reçoit — d'où la
   colonne flex. Seul le formulaire de recette y échappe **délibérément** : il déborde toujours,
   rien n'a de hauteur à distribuer.
6. **L'atteignabilité se mesure par `document.elementFromPoint` au centre de la cible**, jamais par
   la seule visibilité. `elementFromPoint` rend l'élément **réellement peint** en ce point, donc
   celui que le doigt toucherait : c'est le seul moyen de voir un recouvrement. La mesure rend
   `obstacle: null` quand le point tombe sur la cible ou l'un de ses descendants — une icône, un
   `<span>` — et **nomme le coupable** sinon, pour qu'un échec dise qui masquait quoi.

## Gager une mesure d'atteignabilité — `toBeVisible()` oui, `toBeEnabled()` non

`elementFromPoint` sur une boîte de taille **nulle** rend un obstacle tout aussi nul : le scénario
passerait sans avoir rien vu. Toute mesure a donc besoin d'un **gage** que la boîte est non vide. Le
piège est que ce gage est parfois déjà là, et parfois pas :

- **`toBeVisible()` exige déjà une boîte englobante non vide.** Là où il précède la mesure, un
  `expect(largeur).toBeGreaterThan(0)` **ne peut pas rougir** : c'est un faux filet, et il a été
  retiré partout où ce cas s'appliquait.
- **`toBeEnabled()` n'implique AUCUNE boîte.** Un bouton actif de taille nulle franchirait la
  vérification. Là où c'est le seul gage disponible, `toBeGreaterThan(0)` est **vivant** et doit
  rester.

D'où la règle : le gage est **à la charge de l'appelant**, et il se décide au cas par cas.
`attendreAtteignable` rend `largeur` et `hauteur` **sans les asserter** lui-même, précisément parce
qu'il ne peut pas savoir lequel des deux cas s'applique chez son appelant. Les assertions de taille
qui subsistent dans la suite ne sont donc ni à généraliser par symétrie, ni à supprimer par
symétrie : chacune se juge sur le gage qui la précède.

## Conséquences

- Aucune de ces règles n'est tenue par un test unitaire : jsdom n'a **pas de moteur de mise en
  page**. Seule la suite Playwright, en 393×852, peut les voir
  ([ADR 0018](0018-conventions-playwright.md)) — et seulement là où un scénario l'exige
  explicitement.
- Les mesures ci-dessus ont été prises **à la main** en navigateur. Elles ne sont pas rejouées
  automatiquement : les reproduire demande de refaire le geste.
- Toute hauteur de chrome ajoutée plus tard doit être **déclarée** et publiée de la même façon,
  jamais laissée émerger de son contenu.
