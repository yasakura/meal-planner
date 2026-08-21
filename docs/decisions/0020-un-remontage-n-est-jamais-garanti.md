# ADR 0020 — Un remontage n'est jamais garanti

- **Statut** : en vigueur
- **Date** : 2026-08-12 (`bbc9f0f`, mesure de la sheet), généralisé sur FR-3 le 2026-08-14
- **Portée** : `src/ui/AccountSheet.tsx`, `convives-slice`, `menu-slice`, `recipe-slice`,
  `e2e/support/account-sheet.ts`

## Contexte

Le store Redux est un **singleton de session**, créé une fois dans `main.tsx`. Démonter un composant
ne réinitialise que son `useState`, **jamais** l'état d'un slice. Or les tests RTL créent un store
neuf par test : **l'état résiduel y est structurellement invisible**.

D'où la règle du projet : tout champ transitoire (constat, statut d'opération ponctuelle) a un
déclencheur de remise à zéro **spécifié et testé**, et au moins un test qui démonte puis remonte sur
le **même** store.

Le piège vient d'un cran plus loin : on croit tenir un déclencheur parce qu'« il y aura bien un
remontage ». C'est faux.

## La mesure

`AccountSheet` reste **montée pendant son animation de sortie** : le démontage effectif attend le
`transitionEnd` du panneau, dont la transition CSS dure **200 ms** (`transform 0.2s ease-out`) —
sauf en `prefers-reduced-motion`, où la fermeture est immédiate. Une **réouverture pendant
l'animation annule le démontage**.

Mesuré : **fermer puis rouvrir en 80 ms → aucun remontage**, donc le thunk de chargement n'est
jamais rejoué ; **en 700 ms → remontage**, thunk rejoué. Le déclencheur « l'écran se rouvre » n'est
donc **pas** un déclencheur fiable.

### La réouverture éclair n'est pas atteignable au doigt

L'overlay couvre encore **tout l'écran** pendant les 200 ms de sa disparition, et Playwright attend
qu'une cible soit actionnable avant de cliquer pour de bon. Mesuré sur ce dépôt : un `click()` réel
sur « Compte » enchaîné juste après « Fermer » n'aboutit qu'à **540 ms** — largement **après** le
démontage, et bien au-delà des 80 ms qui l'annulent.

Conséquence pour la conception, pas seulement pour les scénarios : la fenêtre d'annulation existe
dans la **machine à états** de la sheet, elle n'existe pas sous le doigt de l'utilisateur par ce
bouton. Un scénario qui veut l'exercer envoie l'événement directement (`dispatchEvent('click')`) et
**assume qu'il n'imite plus un geste** : ce qu'il éprouve est `isRendered = isOpen || isClosing`, pas
un parcours.

### Un nœud détaché ne rend AUCUNE transformation

Pour distinguer « la sheet est à sa place » de « la sheet a disparu », un scénario lit
`getComputedStyle(panneau).transform`. Deux valeurs mesurées, pas déduites, sous Chromium :

- panneau en place (`translateY(0)`, transition terminée) → **`matrix(1, 0, 0, 1, 0, 0)`** ;
- nœud **détaché du document** → **`''`**, chaîne vide.

Les deux attentes du helper — « la sortie a commencé » et « la sheet est revenue en place » — se
servent du littéral en sens contraire, et c'est ce troisième cas qui les départage : un panneau
démonté ne peut **jamais** être confondu avec un panneau en place. Le littéral est réécrit dans
chacune des deux attentes plutôt que partagé, une fonction évaluée dans la page n'ayant accès à
aucune constante du fichier.

La borne d'attente vaut **5 s**, soit **vingt-cinq fois** la transition de 200 ms et sous le délai du
test : un dépassement se lit alors sur la ligne d'attente fautive, et non comme un scénario mort de
vieillesse.

## Décision

1. **Ne jamais supposer qu'un démontage a lieu.** Si une remise à zéro dépend d'un remontage, ce
   remontage doit être **prouvé**, pas déduit.
2. **Prévoir plusieurs déclencheurs, un par façon pour le constat de cesser de dire vrai** — pas un
   seul « au cas où ». Exemple du constat d'enregistrement du menu : le **départ d'une génération**
   (qui efface le menu dont le constat parlait) et l'**arrivée sur l'écran** (un constat acquitte un
   **geste** ; celui d'une visite précédente n'acquitte plus rien).
3. **Une remise à zéro inconditionnelle peut déverrouiller une opération encore en vol.** Un thunk
   RTK n'est pas annulé par un démontage ([ADR 0009](0009-garde-de-fraicheur-par-requestid.md)) :
   fermer puis rouvrir la sheet pendant les 5 secondes de la borne d'acquittement
   ([ADR 0002](0002-borne-d-acquittement-des-ecritures.md)) passe par le chemin de remise à zéro. La
   condition « sauf si une écriture est en vol » se justifie par un test rouge, pas par une
   intuition — sans elle, un second appui redevient possible pendant la borne, et le verdict du
   premier n'est plus reconnu.
4. **Symétriquement, ce qui est une PRÉFÉRENCE ne se remet jamais à zéro** : la fenêtre du menu et
   sa date de début vivent dans le store — et non dans un `useState` qui repartait à sa valeur par
   défaut à chaque remontage (issue #28) — précisément pour qu'elles ne puissent pas diverger du
   menu affiché.

Les mêmes raisons font vivre dans le store des choses qu'on logerait spontanément dans le
container : le brouillon de renommage et la ligne ouverte en édition. Quand la sheet se referme
pendant une écriture en vol, l'édition **reste ouverte** — on ne déverrouille pas une écriture
partie — et le brouillon doit rester avec elle. Sinon la ligne se réaffiche en édition avec un champ
**vide et désactivé** : un formulaire mort, sans le moindre indice que la saisie est toujours en
vol.

## Conséquences

- Les champs d'un même cycle de vie se remettent à zéro **ensemble**, par une fonction unique
  (`restAddLifecycle`, `restRenameLifecycle`, `restRemoveLifecycle`, `restSaveLifecycle`) : deux
  affectations distinctes pourraient diverger, et un prénom orphelin ferait parler un constat d'une
  opération qui n'existe plus.
- Ces fonctions sont **inconditionnelles** ; le garde vit chez l'**appelant**, et diffère de l'un à
  l'autre. Un nouvel appelant doit donc décider du sien — c'est un point de vigilance, pas un défaut.
- Un test qui recrée le store ne reproduit **pas** le défaut : il faut `unmount()` puis un nouveau
  `render()` sur la **même** instance.
