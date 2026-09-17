# Meal Planner — invariants projet

Application web mobile-only, en français. Les décisions et les mesures qui les ont produites vivent
dans `docs/decisions/` ; ce fichier ne porte que les règles.

## Architecture (clean archi light)

Trois couches, frontières tenues par `eslint-plugin-boundaries` et `src/test/architecture.test.ts`.

- `src/domain/` — **PUR**. Entities, use cases, ports. Aucun import de React, Redux, Firebase,
  styled-components, date-fns.
- `src/data/` — implémentations Firebase des ports. Peut importer `domain/` et le SDK Firebase.
- `src/ui/` — React : composants dumb, containers Redux, slices. Aucune logique métier ; les
  containers orchestrent, les use cases décident.

Tout contrat entre couches passe par un port dans `domain/ports/`. `src/ui/store/create-app-store.ts`
est le seul endroit où les adapters concrets sont câblés.

## Confronter, jamais supposer

- Tout garde-fou déclaré est confronté à son introduction : introduire la violation qu'il annonce,
  observer le rouge, retirer. Sans ce rouge, le considérer comme absent (ADR 0015).
- La règle vaut pour les instruments de mesure et les bancs d'essai jetables : les confronter
  à un cas dont la réponse est connue d'avance, et les re-confronter après toute modification de leur
  configuration (ADR 0044).
- **IMPORTANT : une affirmation négative ou de complétude — « je ne peux pas », « c'est couvert »,
  « c'est fermé », « ce n'est pas atteignable », « c'est pré-existant » — se mesure, ou s'annonce
  explicitement comme non vérifiée.** Ne jamais la dire de mémoire ni par raisonnement (ADR 0044).
- Rien ne se mesure pendant qu'un agent travaille, ni pendant qu'un build ou un serveur de dev tourne.

## Flux de travail

L'agent principal orchestre : il ne développe pas, il ne révise pas. Chaque rôle a son agent, à
contexte frais.

1. Discussion utilisateur ↔ agent principal, jusqu'à savoir quoi faire.
2. `tdd-clean-coder` développe en TDD.
3. Agent mutation — distinct de celui qui a écrit le code. Se déclenche si `git diff --name-only`
   croise le périmètre `mutate`, se saute sinon. Voir la skill `mutation-testing`.
4. Vérification navigateur : `/verify <route>` si la feature touche `src/ui/`, puis `npm run e2e`
   pour vérifier que le reste tient.
5. Agent de revue indépendant ; l'agent principal vérifie chaque finding avant de le présenter.
6. Si un finding est retenu → retour à l'étape 1 : nouveau cycle, nouvelle vérif navigateur,
   re-revue sur le delta. Pas de nouvelle mutation à ce tour.
7. **L'utilisateur vérifie à la main** (features UI) et donne son feu vert explicite.
8. Commit.

L'ordre 3 → 4 → 5 est séquentiel : la revue porte sur du code déjà validé au navigateur.

- Un geste qui produit un artefact — code, test, configuration, documentation — part en
  délégation. Un geste qui ne produit rien reste à l'agent principal. Un script jetable vit dans le
  scratchpad et n'est pas délégué.
- Les deux seules choses que l'agent principal exécute lui-même : la vérification navigateur et la
  vérification des findings.
- **Une délégation brief le problème, pas la solution** : ce qui est cassé, et à quoi on reconnaît que
  c'est réparé. La forme appartient à celui qui mesure ; une solution qu'on croit connaître se propose
  comme hypothèse, jamais comme consigne (ADR 0045).

## TDD Uncle Bob

- **IMPORTANT : toute ligne d'implémentation naît d'un test rouge observé.** Jamais l'inverse, jamais
  de green-on-arrival.
- Pour toute écriture ou modification de code productif dans `src/`, déléguer à `tdd-clean-coder` ou
  utiliser `/tdd <tâche>`.
- Ce qui compte n'est pas l'ordre, c'est la confrontation : un test n'a de valeur que s'il a été vu
  échouer face à une implémentation fausse.
- Batching recommandé : écrire tous les tests rouges d'un lot cohérent, observer le rouge en bloc,
  puis implémenter d'un seul tenant. Pas d'émergence pas à pas.
- La contrainte n'est pas la taille du pas, c'est que rien ne dépasse la spec : aucune ligne
  qu'aucun test du lot n'exige. Quand la mutation révèle du code qu'aucun test ne demande, supprimer
  le code plutôt qu'écrire un test pour le justifier.
- Quand un test ne peut pas naître rouge — filet sur un comportement déjà correct, réponse à un
  survivant — la confrontation se fait par sabotage de la ligne que le nom du test désigne.
  Saboter une ligne quelconque ne suffit pas. Une forme permanente est préférable au sabotage.
- Une assertion d'absence doit être adossée au même localisateur asserté présent plus tôt dans le
  test, ou à un scénario témoin voisin. Sinon ce n'est pas un filet.
- **Un test dont le nom désigne un chemin que ses données n'empruntent pas est pire qu'absent** : il
  rassure. Relire le nom contre le jeu de données — la valeur choisie franchit-elle la branche
  annoncée, ou est-elle arrêtée plus tôt par un autre garde ? (ADR 0046)

### Point de contrôle « rouge »

Pour tout use-case ou toute logique métier — pas pour les value objects à invariants triviaux :

1. `tdd-clean-coder` écrit les tests rouges, observe le rouge, s'arrête sans implémenter.
2. Il rapporte les tests rouges et, en une phrase chacun, la règle métier qu'ils valident.
3. L'agent principal fait valider cette intention par l'utilisateur avant implémentation.
4. Après accord seulement : seconde délégation, implémentation, vert, refactor.

La mutation prouve que les tests sont serrés, pas qu'ils testent la bonne chose. Ce point de contrôle
est ce qui couvre la différence.

## Anti test-tampering

- **IMPORTANT : un test qui passe de vert à rouge suite à une modification de code productif n'est
  jamais modifié dans la même étape.** Cycle obligatoire : STOP → diagnostiquer → classifier
  (régression involontaire ou rupture volontaire) → présenter l'impact → décider avec l'utilisateur.
- Vaut aussi pour les scénarios Playwright.
- Toute modification d'un test hors périmètre se justifie dans le message de commit.
- Exception pré-autorisée — rupture de forme uniquement. L'agent applique et rapporte à trois
  conditions cumulatives : le seul écart est l'ajout de clés avec leur valeur attendue ; aucune
  assertion n'est supprimée ni relâchée ; la valeur ajoutée est discriminante.

## Stack & tests

Trois modes via `VITE_ENV` : `dev` et `prod` sur Firebase, `e2e` sur des adapters en mémoire
(ADR 0016). Le reste de la stack se lit dans `package.json`.

Aucune source d'indéterminisme directe dans `domain/` — ni `new Date()`, ni génération d'identifiant,
ni aléatoire : tout passe par les ports `Clock`, `IdGenerator` et `RandomPicker`.

Tests par couche :

- `domain/` — Vitest, adapters in-memory, Test Data Builders.
- `data/` — **pas d'émulateur Java** (ADR 0014). Humble object : le mapping pur est testé à 100 %,
  les adapters sont des wrappers d'I/O. Le round-trip réel et les Security Rules ne sont pas
  testés automatiquement. Garde compensatoire : un test statique vérifie que toute collection
  référencée dans `src/data/` a un bloc `match` dans `firestore.rules`.
- `ui/` — RTL, store Redux réel, ports mockés.

`firestore.rules` ne fait pas foi tant qu'il n'est pas déployé : rien dans le dépôt ne le pousse.
Après toute modification, déployer puis vérifier avec `npm run check:rules`.

## Mutation testing

Le manuel d'utilisation vit dans la skill `mutation-testing` : comment lire un score sans se faire
mentir, isoler un run, instruire un survivant. Le lire avant de rapporter un chiffre.

Le périmètre `mutate`, le gate, la concurrence et la borne de timeout se lisent dans
`stryker.conf.mjs` (ADR 0042 pour la concurrence). Ce qui ne s'en déduit pas :

- La mutation tourne en **local uniquement** : elle n'est pas dans la CI, rien ne l'y rejoue et rien
  ne l'y bloque. C'est une discipline de poste de travail.
- Run isolé : `npm run test:mutation:isolated -- '<fichier>'`, sur chaque fichier modifié, une fois
  avant commit — pas à chaque tour de rebouclage.
- **Les `.tsx` ne sont mutés par rien.** Un chiffre de mutation ne dit rien d'un container. Corollaire
  de design : une décision appartient au slice, qui est muté, pas au container (ADR 0011).
- Tout survivant qui entraîne un changement part en issue, avec sa provenance et son verdict
  (ADR 0043).

## État transitoire et rémanence du store

Le store est un singleton de session : démonter un composant ne réinitialise que son `useState`. Les
tests RTL créent un store neuf par test, donc l'état résiduel y est structurellement invisible.

- Tout champ transitoire — constat, statut d'opération ponctuelle — a un déclencheur de remise à zéro
  spécifié et testé.
- Toute feature portant un tel champ a au moins un test qui démonte puis remonte sur le même store.
- **Ne jamais supposer qu'un démontage a lieu** : un conteneur animé reste monté pendant sa sortie
  (ADR 0020). Si la remise à zéro en dépend, ce remontage se prouve.
- Une remise à zéro inconditionnelle peut déverrouiller une opération en vol : un thunk n'est pas
  annulé par un démontage.

## Revue de code indépendante, avant chaque commit

Quand tout passe — lint, test, build, mutation — et avant de commit. Jamais de commit automatique
dans la foulée des checks verts.

1. Lancer un sous-agent de revue à contexte frais, jamais celui qui a orchestré le code.
2. Il rapporte, ne corrige rien. Il traque en priorité ce que la mutation ne voit pas : tests validant
   la mauvaise intention, entorses aux frontières, assertions faibles. Lui demander explicitement
   d'instruire le cycle de vie et la rémanence d'état.
3. L'agent principal vérifie chaque finding — reproduire le scénario — avant de le présenter.
4. Discuter chaque finding avec l'utilisateur : pertinent ou non.
5. Appliquer les pertinents via `tdd-clean-coder` ; écarter les autres avec justification.

L'agent principal ne rejoue pas systématiquement lint/test/build après chaque rapport d'agent : un
seul passage complet avant commit suffit. La mutation suit la même règle.

### Règle d'arrêt

- **Un finding pré-existant et non bloquant ne rouvre pas le cycle en cours — il devient le suivant.**
  Seul un défaut introduit par la branche, ou bloquant pour l'utilisateur, la maintient ouverte.
- Pré-existant : déjà sur `main` avant la branche. Le rendre plus visible ne le rend pas nouveau.
- Bloquant : perte de donnée, faux signal de succès, écran qui se contredit, impasse sans porte de
  sortie. Pas « ce serait mieux autrement ».
- Ne pas soumettre le report comme une option ouverte : l'annoncer avec son motif, et le tracer.
- **Tracer veut dire ouvrir une issue GitHub**, pas l'écrire dans un rapport. Un finding qui ne vit que
  dans une conversation, un corps de PR ou un message de commit est perdu.
- L'issue porte sa provenance en première ligne, le scénario concret, les références
  `fichier:ligne`, et le classement. Gabarit : `.github/ISSUE_TEMPLATE/finding.md` (ADR 0043).
- **Un classement se périme.** Au démarrage d'un lot, `grep` les issues ouvertes qui nomment les
  fichiers qu'on va toucher, et relire leur classement (ADR 0047).

## Quand consulter, quand trancher

Le critère n'est ni l'importance ni l'irréversibilité : **est-ce que la réponse change le travail ?**

Consulter : décision produit ; arbitrage anti test-tampering sur une intention métier ; point de
contrôle rouge ; choix de conception durable (nouveau port, nouvelle convention) ; pertinence d'un
finding de revue.

Trancher et signaler : valeurs d'outillage et de configuration ; correction mécanique déjà
arbitrée sur un cas identique ; découpage des commits et nommage interne ; ordre des étapes ; choix de
déléguer ou non.

En cas de doute : trancher, et exposer ce que la décision écarte.

### Aller voir dehors avant de trancher

- Avant d'ajouter de la machinerie autour d'un outil qu'on n'a pas écrit — bibliothèque, skill,
  agent ou commande du harnais — vérifier ce qu'il offre nativement. Un outil qui résiste indique
  souvent qu'on lui demande l'inverse de ce pour quoi il est fait (ADR 0037, ADR 0038).
- Avant une décision de conception durable, regarder l'état de l'art. L'adopter, ou s'en écarter
  sciemment — jamais par ignorance.
- Aucun lint ne dira qu'on utilise un outil à contresens. La seule trace vérifiable est la source
  citée par l'ADR.

## Conventions de code

### Aucun commentaire

- Le code productif, les tests et les scénarios `e2e/` ne portent **aucun commentaire hors directive**.
  L'intention est dans les noms, les types, le découpage, le nom du test.
- Seules subsistent les directives : `// Stryker disable`, `// eslint-disable`, `@ts-expect-error`,
  `/// <reference>`, `// prettier-ignore`. Une règle ESLint refuse le reste et le hook de pré-commit
  fait échouer le commit.
- La justification d'une directive fait partie de la directive, et elle est souhaitable. Ce qui
  suit la directive est libre ; `@ts-expect-error` l'exige.
- **L'explication a trois destinations, et le code n'en fait pas partie** : un savoir mesuré ou une
  décision avec ses alternatives va en ADR ; le raisonnement d'un changement va dans le message de
  commit ; ce qui s'adresse à l'utilisateur va dans le rapport.
- Un besoin d'expliquer une ligne signale un mauvais nom, une fonction qui fait deux choses, ou une
  décision mal placée. Corriger la cause.
- Le gage d'une assertion vit dans le nom du test.

### Construction et doubles

Toute classe exportée constructible expose une factory statique et rend son constructeur privé —
`create()`, ou nommée quand elle porte du sens. Vaut pour les adapters, les doubles et les builders.

Pas de littéraux verbeux dans les tests : un builder par entity, chaînable, base valide par défaut.

**Un double ne promet jamais plus que son port.** Là où un port déclare une garantie absente, le
double exerce activement cette absence — ordre mélangé par un shuffle seedé, jamais l'ordre
d'insertion (ADR 0019). Quand le contrat d'un port change, le double change dans la même passe.

## Rester chirurgical

- Chaque ligne modifiée se rattache à la demande.
- Épouser le style existant plutôt que le sien. Ne pas « améliorer » le code adjacent.
- Nettoyer son propre mess, pas celui des autres. Une correction qui rend un import orphelin le
  retire. Le code mort sans rapport qu'on croise se signale, il ne se supprime pas.
- **Un périmètre plus large que demandé se propose, il ne se prend pas.**

## Commits

Conventional Commits : `feat:`, `fix:`, `test:`, `refactor:`, `chore:`, `docs:`.

**Jamais de `--squash` au merge d'une PR** : l'historique de la branche est perdu. Toujours
`gh pr merge --merge`.

Le rapport de fin de cycle inclut un diff d'architecture : fichiers créés ou déplacés par couche,
dépendances entre couches ajoutées et justifiées, tout nouveau port ou convention.

## Definition of Done

Aucune case n'est cochée définitivement avant que toutes le soient sur le dernier état du code.

- [ ] Tests rouges écrits en premier, échec observé
- [ ] Implémentation minimale, tests verts, refactor si utile
- [ ] `npm run lint` — frontières comprises
- [ ] `npm run test` — seuils de couverture tenus
- [ ] `npm run build` — Vitest ne typecheck pas ; seul le build attrape les erreurs de types des tests
- [ ] **Si le diff croise le périmètre `mutate`** : `npm run test:mutation` (gate 80) et run isolé sur
      chaque fichier modifié, chiffre rapporté avec ses timeouts. Sinon, le dire avec le diff à l'appui
- [ ] Si use-case ou logique métier : intention validée au rouge avant implémentation
- [ ] Si nouvelle collection Firestore : bloc `match` ajouté et déployé
- [ ] Si nouveau test-double ou port modifié : le double n'offre rien que son port ne promette
- [ ] Si nouvel état transitoire : remise à zéro spécifiée et test de remontage sur le même store
- [ ] Diff d'architecture fourni
- [ ] Revue de code indépendante passée, findings pertinents traités, autres justifiés
- [ ] Findings reportés → issues GitHub ouvertes, avec provenance, scénario et classement
- [ ] Si feature `src/ui/` : `/verify` joint au rapport — screenshot, console, interactions, états
      non-nominaux et sortie de chacun d'eux
- [ ] `npm run e2e` — un scénario rouge relève de l'anti test-tampering, classifier avant de toucher
- [ ] **Vérification manuelle de l'utilisateur et feu vert explicite** — jamais de commit sans lui
- [ ] Commit conforme aux Conventional Commits
