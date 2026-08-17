# Meal Planner — invariants projet

## Architecture (clean archi light)

3 couches, frontières enforced par ESLint `eslint-plugin-boundaries` :

- `src/domain/` — **PUR**. Entities, use cases, ports (interfaces repositories). Aucun import de React, Redux, Firebase, styled-components, ou toute lib UI/infra.
- `src/data/` — Implémentations Firebase des ports définis par `domain/`. Peut importer `domain/` et le SDK Firebase. Interdit d'importer React, Redux, styled-components.
- `src/ui/` — React (components dumb + containers Redux). Peut importer `domain/` (types, use cases) et `data/` (via injection dans le store/root). Aucune logique métier — les containers orchestrent, les use cases décident.

Tout contrat entre couches passe par un port dans `domain/ports/`. Le "M" du MVC = `domain + data`. Le "V" = components dumb. Le "C" = containers Redux + thunks.

## Flux de travail

L'agent principal **orchestre**, il ne développe pas et il ne révise pas. Chaque rôle a son agent, à contexte frais.

1. **Discussion** utilisateur ↔ agent principal, jusqu'à savoir quoi faire.
2. **`tdd-clean-coder`** développe en TDD.
3. **Agent mutation** — un agent distinct, PAS celui qui a écrit le code : il lance Stryker et **instruit chaque survivant** (équivalent toléré, ou vrai trou de test avec le scénario non couvert). La séparation n'est pas cosmétique : l'agent TDD rapportait son propre score, et deux fois ce chiffre s'est révélé faux — une fois mesuré sur une suite amputée, une fois gonflé par des timeouts.
4. **Vérif Chrome** par l'agent principal, si la feature touche `src/ui/`.
5. **Agent de revue** indépendant — il remonte ses findings à l'agent principal, qui les **vérifie** avant de les présenter à l'utilisateur.
6. **Si des findings sont retenus → retour à l'étape 1.** Sinon, on avance.
7. **L'utilisateur vérifie à la main** (features UI) et donne son **feu vert explicite**.
8. **Commit.**

L'ordre 3 → 4 → 5 est **séquentiel**, pas parallèle : la revue doit porter sur du code déjà validé au navigateur, sinon elle instruit un code qui va changer. Une revue lancée en parallèle de Chrome a coûté plusieurs tours inutiles.

## TDD Uncle Bob (règle absolue)

- Toute ligne d'implémentation naît d'un **test rouge observé**. Jamais l'inverse.
- Pour toute écriture ou modification de code productif dans `src/`, **DÉLÉGUER au sous-agent `tdd-clean-coder`** (`~/.claude/agents/`) ou utiliser la slash command `/tdd <tâche>`.
- Interdit : green-on-arrival (un test qui passe dès l'écriture ne teste rien).

**Ce qui compte n'est pas l'ordre, c'est la confrontation.** Un test n'a de valeur que s'il a été **vu échouer face à une implémentation fausse**. Écrire le test en premier est la façon la moins chère de l'obtenir — l'implémentation fausse est gratuite, c'est l'absence de code. Ce n'est pas la seule.

**Batching autorisé, et recommandé.** Pour un ensemble cohérent de comportements : écrire **tous** les tests rouges, observer le rouge **en bloc**, puis implémenter jusqu'au vert. Un cycle unitaire par comportement n'apporte rien de plus et rejoue la suite complète à chaque pas.

**Pas d'émergence pas à pas non plus.** Faire naître le code par micro-cycles est une discipline **humaine** : elle empêche d'écrire plus vite qu'on ne réfléchit. Un agent n'a pas ce problème — il écrit l'implémentation complète d'un seul tenant, puis refactore si utile.

La contrainte n'est donc pas la **taille** du pas, c'est que **rien ne dépasse la spec** : aucune ligne qu'aucun test du lot n'exige. Pas de garde défensif « au cas où », pas de généralisation anticipée, pas de branche que rien n'emprunte. Ce qu'aucun test ne demande est du code mort en puissance, et la mutation le révèle — la bonne réponse est alors de **supprimer le code**, pas d'écrire un test pour le justifier. _(Vécu : un garde défensif dans `isNetworkUnavailable` où six mutants survivaient, et un retrait de diacritiques rendu inutile par la normalisation qui le précédait — les deux supprimés, 2026-08-13 et 2026-08-14.)_

Quand un test ne **peut pas** naître rouge — filet posé sur un comportement déjà correct, réponse à un mutant survivant — la confrontation se fait par **sabotage** : casser volontairement la ligne que le nom du test désigne, observer le rouge, restaurer. Saboter _une_ ligne quelconque ne suffit pas : il faut saboter **celle que le nom promet de protéger**. _(Vécu : un test container nommé « ne déverrouille pas Ajouter » sabotait le container et passait, alors qu'il ne pouvait pas détecter la régression du garde qu'il annonçait — `user.type()` sur un champ `disabled` est un no-op, 2026-08-12.)_

## Point de contrôle « rouge » (use-cases & logique métier)

La mutation prouve que les tests sont **serrés**, pas qu'ils testent la **bonne chose** : un test peut tuer tous les mutants et verrouiller une règle métier fausse. Le contrôle le plus rentable est donc de valider **l'intention au rouge**, pas de la découvrir au vert.

Pour tout **use-case** ou toute **logique métier** (agrégation, prorata FR-15, règles de calcul/décision) — **PAS** pour les value objects/entities à invariants de forme triviaux :

1. `tdd-clean-coder` écrit le(s) test(s) rouge(s), **OBSERVE le rouge, puis S'ARRÊTE sans implémenter**.
2. Il rapporte : les tests rouges + **en une phrase chacun, la règle métier qu'ils valident**.
3. L'agent principal présente cette intention à l'utilisateur pour **validation AVANT implémentation**.
4. Après accord seulement : seconde délégation → implémentation → vert → refactor.

Pour un value object trivial (non-vide, borne, type, immuabilité), le cycle complet rouge → vert → refactor en une passe reste autorisé — mutation + revue au vert suffisent.

## Anti test-tampering

Un test qui passe de vert à rouge suite à une modif de code productif n'est **JAMAIS** modifié dans la même étape. Cycle obligatoire :

**STOP → diagnostiquer → classifier** (régression involontaire vs rupture volontaire) **→ présenter impact → décider avec l'utilisateur → agir**.

Toute modification d'un test hors périmètre requiert une justification explicite dans le message de commit.

**Exception pré-autorisée — rupture de FORME uniquement.** Ajouter un champ à un état casse mécaniquement tout `toEqual` exhaustif écrit sur l'ancienne forme. Ce cas est répétitif, prévisible, et son arbitrage a toujours été le même. L'agent **applique et rapporte** au lieu de s'arrêter, à trois conditions cumulatives :

1. le seul écart est **l'ajout de clés** avec leur valeur attendue ;
2. **aucune** assertion n'est supprimée, ni relâchée (pas de `toEqual` → `toMatchObject`, pas de littéral → regex partielle) ;
3. la valeur attendue ajoutée est **discriminante** — elle devient une assertion sur le nouveau champ, pas un remplissage.

Tout le reste continue de déclencher le STOP : sémantique modifiée, assertion affaiblie, test supprimé, jeu de données changé, intention métier révoquée.

## Stack & tests

- **TypeScript** strict + **Vite** + `vite-plugin-pwa` (mode `prompt`).
- **React 18** + **React Router** + **Redux Toolkit** + **styled-components** dans `src/ui/`.
- **Firebase** Auth email/password + **Firestore**, 2 projets (dev / prod) sélectionnés via `VITE_ENV`.
- **Vitest** + **React Testing Library** ; **Stryker Mutator** pour mutation testing.
- **cuid2** (IDs générés dans `domain/` via port `IdGenerator`), **date-fns** (timezone `Europe/Paris`) via port `Clock`. Pas de `new Date()` direct dans `domain/`.
- Tests par couche :
  - `domain/` : Vitest + adapters in-memory + Test Data Builders.
  - `data/` : **pas d'émulateur Java** (projet front — décision 2026-07-14). Pattern **humble object** : le mapping pur entité ↔ document Firestore vit dans un module pur, testé à 100 % en Vitest (aucune infra) ; les adapters Firestore sont des wrappers minces (I/O only), au plus un test léger avec SDK mocké. Le **round-trip réel** et les **Security Rules** ne sont **pas** testés automatiquement pour l'instant — à revisiter via un émulateur Docker si le besoin se confirme.
    - **Garde-fou compensatoire, obligatoire** : un test statique vérifie que **toute collection Firestore référencée dans `src/data/**` possède un bloc `match` dans `firestore.rules`**. Firestore refuse par défaut toute collection non déclarée : sans ce garde, un adapter neuf produit une feature **verte en test unitaire et morte dans le navigateur**. Purement statique, aucun émulateur requis. _(Vécu FR-3 : la collection `convives` n'était pas déclarée, 355 tests verts et écran cassé — 2026-08-11.)_
    - `firestore.rules` **n'est pas la source de vérité tant qu'il n'est pas déployé** : rien dans le repo ne le pousse. Après toute modification, déploiement explicite puis vérification.
  - `ui/` containers : RTL + store Redux réel + ports mockés.
- **Mutation testing sur le code de PRODUCTION** : `domain/`, `data/`, et la **logique UI** (`src/ui/features/**/*.ts` — slices/thunks). **Exclus du `mutate`** : les fichiers de test ET l'**infra de test** (`domain/test-doubles/**`, `domain/test-builders/**`) — sinon elle pollue le score avec des mutants équivalents. Gate **bloquant global** `break: 80` (`stryker.conf.mjs`). Les mutants équivalents de boilerplate RTK (nom du type d'action, `name` de slice, objet de config `createSlice`) sont tolérés dès lors que **toute la logique de transition est couverte** — le seuil étant global, ils ne fragilisent pas le gate.
- **Le score global n'est PAS reproductible : le run isolé fait foi.** Avec `timeoutMS: 10000` et la concurrence par défaut, un même mutant est compté « tué par timeout » quand la machine est chargée et « survivant » quand elle respire. Sur un même commit, `convives-slice.ts` est sorti à **100 % en run complet et 85 % en run ciblé** (2026-08-12). Pour **tout fichier modifié dans un cycle**, rejouer `npx stryker run --mutate '<fichier>'` et **rapporter ce chiffre-là** ; le global ne vaut que comme signal de fumée. Conséquence : un survivant réel peut se cacher derrière un timeout, et le score global ne vaut rien comme mesure de progression.
- **Le run global est incrémental** (`incremental: true`) : il ne rejoue que les mutants des fichiers modifiés et des tests affectés. Mesuré le 2026-08-17 : **7 min 31 → 44 s** sur un arbre inchangé, **1 min 23** avec un gros slice invalidé. L'état vit dans `reports/`, gitignoré : le bénéfice est **local**, la CI repart de zéro à chaque fois.
- **Le boilerplate RTK est désactivé à la source**, par des `// Stryker disable next-line` ciblés par mutateur : préfixes de types d'action, `name` de slice, objet de config `createSlice`. Ce ne sont plus des survivants à réexpliquer à chaque rapport — **tout survivant restant demande donc une explication**. Corollaire : le score monte mécaniquement (98,87 % → 99,36 % sans qu'une ligne de test change), ce qui affaiblit encore le seuil comme indicateur.
- **Les `.tsx` ne sont pas mutés du tout.** `mutate` ne couvre que `src/ui/features/**/*.ts` : containers et composants n'ont **aucun** filet de mutation, seule la RTL les protège. Un chiffre de mutation flatteur ne dit donc **rien** sur un container. Corollaire de design : une décision (quand vider un champ, quand verrouiller un bouton) appartient au slice, qui est muté — pas au container, qui ne l'est pas. _(Vécu FR-3 : échec d'ajout silencieux et double-soumission vivaient tous deux dans un `.tsx`, à 99 % de mutation — trouvés par la revue indépendante, 2026-08-11.)_

## Diff d'architecture (fin de cycle)

Les décisions de design prises pour passer au vert (où placer une abstraction, port vs adapter, nommage, découpage de dossiers) ne « cassent » rien → elles ne déclenchent aucun garde-fou et restent invisibles. Pour les rendre visibles sans relire tout le code, le rapport de fin de cycle inclut un **diff d'architecture** :

- **Par couche** (`domain/` / `data/` / `ui/`) : fichiers créés / déplacés.
- **Dépendances entre couches ajoutées**, chacune justifiée (ou « aucune »).
- Tout nouveau **port**, dossier, ou convention introduit.

## Convention de construction

Toute classe exportée constructible expose une **factory statique** comme unique point d'entrée, et rend son **constructeur privé** pour forcer son usage (pas de `new X()` sur les classes du projet) :

- Factory `create()` par défaut, ou **nommée** quand elle porte du sens : `StubIdGenerator.returning(id)`, `ThrowingRecipeRepository.rejectingWith(msg)`, `RecipeBuilder.aRecipe()`.
- Vaut pour les adapters `data/`, les test-doubles et les builders.
- Le constructeur privé n'est pas de la cérémonie : il garantit que si la factory gagne un jour de la logique (validation, wiring), aucun appelant ne la contourne.

## Convention Test Data Builders

Pas de littéraux verbeux dans les tests. Un builder par entity, chaînable, avec une base valide par défaut :

```ts
RecipeBuilder.aRecipe().withoutTitle().build();
```

## Convention Test Doubles — un double ne promet jamais plus que son port

Un test-double **plus aimable que son contrat** rend la suite verte sur un comportement que le vrai adapter n'a jamais eu. C'est un faux vert structurel : aucun test ne peut l'attraper, puisque c'est le référentiel lui-même qui ment.

- Là où un port déclare une garantie **absente** (« ordre non garanti », unicité non garantie…), le double doit **exercer activement cette absence** — ordre délibérément mélangé par un shuffle déterministe et seedé, jamais l'ordre d'insertion « par gentillesse ». Tout test qui dépendait implicitement de la garantie casse alors dans `domain/`, des semaines avant que l'adapter réel n'existe.
- Quand le contrat d'un port change, **le double change dans la même passe**. Un double en retard sur son port est un faux vert en attente.
- _Vécu FR-3 : `InMemoryConviveRepository` rendait l'ordre d'insertion, Firestore rend l'ordre des identifiants (cuid2, non triable par construction). Suite verte, écran affichant un ordre aléatoire à chaque rechargement — trouvé par la vérif navigateur seulement (2026-08-11)._

## État transitoire et rémanence du store

Le store Redux est un **singleton de session** (créé une fois dans `main.tsx`) : démonter un composant ne réinitialise que son `useState`, jamais l'état du slice. Or les tests RTL créent un store neuf par test — chacun est donc un « premier montage de la session », et **l'état résiduel est structurellement invisible**.

- Tout champ représentant un **événement transitoire** (constat, résultat one-shot, statut d'une opération ponctuelle) doit avoir un **déclencheur de remise à zéro explicitement spécifié et testé**. Sans lui, le constat ressurgit sur un montage ultérieur sans aucun rapport.
- Toute feature portant un tel champ a **au moins un test qui démonte puis remonte sur le MÊME store** (`unmount()` puis nouveau `render()` en réutilisant l'instance). Un test qui recrée le store ne peut pas reproduire le défaut.
- **Ne jamais supposer qu'un démontage a lieu** : un conteneur animé (sheet, modale, drawer) reste monté pendant sa transition de sortie, et une réouverture pendant l'animation peut annuler le démontage sans qu'aucun cycle ne se produise. Si la remise à zéro dépend d'un remontage, ce remontage doit être **prouvé**, pas déduit.
- Attention au symétrique : une remise à zéro **inconditionnelle** peut déverrouiller une opération encore en vol — un thunk RTK n'est pas annulé par un démontage. La condition se justifie par un test rouge, pas par une intuition.
- _Vécu : `addStatus: 'unconfirmed'` survivait toute la session ; l'écran affichait le convive dans la liste **et** « l'ajout n'a pas pu être confirmé », bouton verrouillé jusqu'au rechargement complet de l'onglet (2026-08-12)._

## Vérification post-TDD (features `src/ui/` uniquement)

Les tests unitaires garantissent que **le code fait ce que le test dit** ; la vérif navigateur garantit que **la feature fait ce que l'utilisateur voit**. Les deux sont requis.

Pour toute feature qui touche `src/ui/`, après le cycle TDD, l'agent principal (pas `tdd-clean-coder` qui n'a pas les tools MCP) doit :

1. S'assurer que Vite dev tourne (`npm run dev` en background sinon).
2. `mcp__chrome-devtools__navigate_page` vers la route concernée.
3. `mcp__chrome-devtools__take_screenshot` (résolution iPhone 393×852 portrait — l'app est mobile-only).
4. `mcp__chrome-devtools__list_console_messages` — aucune erreur autre que HMR/Vite.
5. Si interaction requise : `click`, `fill`, `press_key` puis re-screenshot pour valider l'état après.
6. **États non-nominaux** : le screenshot du seul chemin nominal ne suffit pas. Vérifier explicitement les états pertinents pour l'écran — **vide** (liste/collection sans données), **erreur** (échec de chargement/validation), **chargement** (spinner/skeleton). Un état non pertinent est écarté explicitement, pas oublié.
7. **Sortie de chaque état non-nominal** : vérifier l'**entrée** dans un état ne suffit pas — il faut vérifier qu'on en **sort**. Pour chaque état non-nominal atteint, rejouer le retour au nominal (rétablir le réseau, corriger la saisie, refermer/rouvrir, recharger) et confirmer que l'écran ne garde **aucune trace** : message résiduel, bouton verrouillé, liste périmée. Une liste d'états est un instantané ; les défauts vivent dans les **séquences**. _(Vécu : la vérif hors-ligne couvrait « couper le réseau, observer » mais jamais « rétablir, refermer, rouvrir » — l'écran affichait alors le convive ajouté ET le constat d'échec, 2026-08-12.)_
8. Screenshot final joint au report utilisateur.

Alternative à la demande : slash command **`/verify <route>`**.

### Si la vérif Chrome révèle un bug (les tests unitaires étaient verts)

Le bug est une **spec absente**, pas un accident. Cycle de recovery obligatoire :

1. **INTERDICTION** de fixer directement dans le code (cowboy fix → régression garantie plus tard).
2. Formuler le bug comme un **nouveau test rouge** qui capture le comportement attendu (ex. _"le bouton X doit dispatcher Y quand cliqué"_).
3. Redéléguer à `tdd-clean-coder` avec cette nouvelle spec.
4. Cycle TDD complet : baseline → RED → GREEN → REFACTOR.
5. Si le fix casse un ancien test qui était vert : appliquer le protocole **anti test-tampering** (STOP, classifier, décider).
6. Re-vérification Chrome. Boucler tant que Chrome n'est pas OK.

La checklist DoD n'est **pas** un état figé au moment du 1er cycle : c'est un état vivant qui reflète l'itération courante. Si Chrome décoche sa case, la feature est ré-ouverte et les cases précédentes doivent être re-visitées sur le nouveau code.

## Revue de code indépendante (AVANT chaque commit)

Quand le travail semble fini et que **tous les checks passent** (lint / test / **build** / mutation), **avant de commit** — jamais de commit automatique dans la foulée des checks verts.

La revue porte sur du **code écrit**, jamais sur une spec : elle intervient après le cycle TDD et après la vérif Chrome, à l'étape 5 du flux de travail. Conséquence assumée : les défauts de **forme** — comme l'échec d'ajout silencieux de FR-3, lisible dans `await dispatch()` suivi d'un reset inconditionnel — sont trouvés tard. C'est un coût accepté, pas un oubli.

1. Lancer un **sous-agent de code review INDÉPENDANT** — contexte frais, **pas** l'agent (ni un fork de l'agent) qui a orchestré le code — sur le diff.
2. Le sous-agent **rapporte ses findings, ne corrige rien**. Il traque en priorité ce que la mutation ne voit pas : **tests qui valident la mauvaise intention métier**, entorses aux frontières de couche, assertions trop faibles. **Lui demander explicitement d'instruire le cycle de vie et la rémanence d'état** — c'est par là que les trois bugs de la branche hors-ligne ont été trouvés, jamais par une lecture ligne à ligne.
3. **L'agent principal vérifie chaque finding AVANT de le présenter** — reproduire le scénario dans le code ou dans Chrome. Les agents se trompent dans les deux sens : un finding sur des mutants survivants a été infirmé en lisant le rapport Stryker, plusieurs autres confirmés par la mesure. L'utilisateur tranche sur pièces, pas sur l'affirmation d'un agent.
4. **Discuter chaque finding avec l'utilisateur** : pertinent vs non-pertinent.
5. Appliquer **seulement les findings pertinents** (via `tdd-clean-coder` si code productif, protocole habituel) ; écarter les autres avec justification explicite.
6. Si un finding a été appliqué, **le flux repart à l'étape 1** — nouveau cycle, nouvelle mutation, nouvelle vérif Chrome, re-revue sur le **delta**.
7. **Vérification manuelle de l'utilisateur** (features UI uniquement), puis **son feu vert explicite**. Jamais de commit sans lui.

Si le code rebouclé n'a changé que sur quelques points, la re-revue porte sur le **delta**, avec les findings précédents fournis en contexte et l'interdiction de les redécouvrir. Relancer une revue complète à chaque tour coûte un agent entier pour re-instruire ce qui est déjà tranché.

### Règle d'arrêt — quand une branche est finie

Une revue trouve **toujours** quelque chose : c'est sa fonction, pas un signal que le travail n'est pas fini. Sans frontière écrite, chaque branche se rouvre indéfiniment sur des findings réels mais accessoires.

**Un finding PRÉ-EXISTANT et NON BLOQUANT ne rouvre pas le cycle en cours — il devient le suivant.** Seul un défaut **introduit par la branche**, ou **bloquant pour l'utilisateur**, la maintient ouverte.

- **Pré-existant** : le défaut est déjà sur `main` avant la branche. Le fait que la branche le rende plus visible, plus fréquent ou plus gênant **ne le rend pas nouveau** — c'est la rationalisation exacte qui a doublé la durée de la passe recettes (2026-08-13).
- **Bloquant** : perte de donnée, faux signal de succès, écran qui se contredit, impasse sans porte de sortie. Pas « ce serait mieux autrement ».

Quand la règle s'applique, **ne pas soumettre le choix à l'utilisateur comme une option ouverte** : annoncer que le finding est reporté, avec son motif, et le tracer. Lui présenter « corriger maintenant » comme une alternative d'égale dignité fabrique la décision coûteuse en la rendant raisonnable. Il reste libre de trancher l'inverse — mais sur une proposition, pas sur un menu.

**L'agent principal ne rejoue pas systématiquement `lint`/`test`/`build` après chaque rapport d'agent** : sur une dizaine de rejeux, aucun n'a jamais contredit le rapport. Un seul passage complet avant commit suffit. En revanche le **run de mutation isolé reste rejoué** — lui a révélé de vrais écarts (100 % annoncé, 85 % réel).

## Quand consulter l'utilisateur, quand trancher

Une question bloquante coûte un aller-retour. Trop peu, on impose des décisions qui ne nous appartiennent pas ; trop, on transforme une session en questionnaire. Le critère n'est ni l'importance ni l'irréversibilité : c'est **est-ce que la réponse change le travail ?**

**Consulter — la réponse change ce qui est produit :**

- décision **produit** (libellé vu par l'utilisateur, comportement d'un écran, périmètre d'une feature) ;
- arbitrage **anti test-tampering** sur une intention métier, y compris la révocation d'une décision antérieure ;
- **point de contrôle rouge** : validation de l'intention avant implémentation ;
- choix de **conception durable** (nouveau port, nouvelle convention, placement d'une abstraction) ;
- **findings de revue** : pertinent vs non-pertinent.

**Trancher et signaler — il existe un défaut évident et se tromper coûte un rollback trivial :**

- valeurs d'outillage et de configuration (seuils, timeouts, options de test) ;
- application d'une correction **mécanique** déjà arbitrée sur un cas identique ;
- découpage des commits, formulation des messages, nommage interne ;
- ordre d'exécution des étapes, choix de déléguer ou de faire soi-même.

En cas de doute sur la catégorie : **trancher, et exposer la décision** avec ce qu'elle écarte. Un choix annoncé se conteste ; une question de plus se subit.

## Commits

Conventional Commits : `feat:`, `fix:`, `test:`, `refactor:`, `chore:`, `docs:`.

## Definition of Done (checklist par feature)

Aucune case n'est cochée "définitivement" avant que **toutes** le soient sur le dernier état du code.

- [ ] Tests rouges écrits en premier (échec observé, pas juste écrits)
- [ ] Impl minimale → tests verts
- [ ] Refactor si utile, suite toujours verte
- [ ] `npm run lint` OK (boundaries respectées)
- [ ] `npm run test` OK (seuils coverage tenus)
- [ ] `npm run build` OK (`tsc -b` — Vitest ne typecheck PAS ; seul le build attrape les erreurs de types, y compris dans les fichiers de test)
- [ ] `npm run test:mutation` OK (seuil `break: 80` tenu — gate bloquant, pas décoratif)
- [ ] **Run de mutation ISOLÉ** (`--mutate` ciblé) sur chaque fichier modifié, et c'est **ce** chiffre qui est rapporté — le score global masque des survivants derrière des timeouts
- [ ] **Si use-case / logique métier** : intention validée au **rouge** avant implémentation (point de contrôle « rouge »)
- [ ] **Si nouvelle collection Firestore** : bloc `match` ajouté dans `firestore.rules` **et déployé** (le fichier du repo ne fait pas foi)
- [ ] **Si nouveau test-double ou port modifié** : le double n'offre aucune garantie que son port ne promet pas (ordre, unicité…)
- [ ] **Si nouvel état transitoire** (constat, statut d'opération ponctuelle) : déclencheur de remise à zéro spécifié + test de remontage sur le **même** store
- [ ] Diff d'architecture fourni (créé/déplacé par couche + dépendances justifiées)
- [ ] **Revue de code indépendante** passée AVANT commit (findings pertinents traités, non-pertinents justifiés)
- [ ] **Si feature `src/ui/`** : vérif Chrome MCP jointe au report (screenshot + console check + interactions + **états non-nominaux** vide/erreur/chargement + **sortie** de chacun d'eux)
- [ ] **Vérification manuelle de l'utilisateur** (features `src/ui/`) et son **feu vert explicite** — jamais de commit sans lui
- [ ] Commit conforme aux Conventional Commits
