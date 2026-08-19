# Meal Planner — invariants projet

## Architecture (clean archi light)

3 couches, frontières enforced par ESLint `eslint-plugin-boundaries` :

- `src/domain/` — **PUR**. Entities, use cases, ports (interfaces repositories). Aucun import de React, Redux, Firebase, styled-components, ou toute lib UI/infra.
- `src/data/` — Implémentations Firebase des ports définis par `domain/`. Peut importer `domain/` et le SDK Firebase. Interdit d'importer React, Redux, styled-components.
- `src/ui/` — React (components dumb + containers Redux). Peut importer `domain/` (types, use cases) et `data/` (via injection dans le store/root). Aucune logique métier — les containers orchestrent, les use cases décident.
- Tout contrat entre couches passe par un port dans `domain/ports/`. Le "M" du MVC = `domain + data`. Le "V" = components dumb. Le "C" = containers Redux + thunks.

## Un garde-fou qu'on n'a jamais vu échouer n'est pas un garde-fou

- **Tout garde-fou déclaré est confronté une fois, à son introduction** : introduire délibérément la violation qu'il annonce, **observer le rouge**, retirer. Un garde-fou ajouté sans ce rouge est à considérer comme **absent**.
- **La règle vaut aussi pour les instruments de MESURE.** Toute commande dont on rapporte le résultat doit avoir été confrontée à un cas dont on connaît la réponse d'avance, et **re-confrontée à chaque modification de sa configuration**.

## Flux de travail

- L'agent principal **orchestre** : il ne développe pas, il ne révise pas. Chaque rôle a son agent, à contexte frais.
- Un geste qui **produit un artefact** — code, test, configuration, documentation — part en **délégation**. Un geste qui **ne produit rien** reste à l'agent principal ; un script de reproduction jetable vit dans le scratchpad et n'est pas délégué.
- Les deux seules choses que l'agent principal exécute lui-même sont la **vérif Chrome** (étape 4) et la **vérification des findings** (étape 5).
- L'agent principal **vérifie** les findings puis **délègue** les corrections — y compris sur des fichiers de test, y compris quand elles paraissent triviales.

1. **Discussion** utilisateur ↔ agent principal, jusqu'à savoir quoi faire.
2. **`tdd-clean-coder`** développe en TDD.
3. **Agent mutation** — un agent distinct, PAS celui qui a écrit le code : il lance Stryker et **instruit chaque survivant** (équivalent toléré, ou vrai trou de test avec le scénario non couvert).
4. **Vérification navigateur**, deux volets complémentaires :
   - **Chrome MCP** par l'agent principal, si la feature touche `src/ui/` — il regarde **la feature en cours**, y compris ses états non-nominaux et leurs sorties.
   - **`npm run e2e`** (Playwright, sur le mode e2e) — il vérifie que **tout le reste** tient encore, c'est-à-dire les parcours qui ne sont pas la feature du jour. La suite tourne sur les adapters in-memory : pas de réseau, pas de base partagée, identifiants séquentiels.
5. **Agent de revue** indépendant — il remonte ses findings à l'agent principal, qui les **vérifie** avant de les présenter à l'utilisateur.
6. **Si des findings sont retenus → retour à l'étape 1.** Sinon, on avance.
7. **L'utilisateur vérifie à la main** (features UI) et donne son **feu vert explicite**.
8. **Commit.**

- L'ordre 3 → 4 → 5 est **séquentiel**, pas parallèle : la revue porte sur du code déjà validé au navigateur.
- La CI rejoue les scénarios Playwright dans un **job séparé**, à côté de Stryker et non dans le check bloquant.

## TDD Uncle Bob (règle absolue)

- Toute ligne d'implémentation naît d'un **test rouge observé**. Jamais l'inverse.
- Pour toute écriture ou modification de code productif dans `src/`, **DÉLÉGUER au sous-agent `tdd-clean-coder`** (`~/.claude/agents/`) ou utiliser la slash command `/tdd <tâche>`.
- Interdit : green-on-arrival.
- **Ce qui compte n'est pas l'ordre, c'est la confrontation** : un test n'a de valeur que s'il a été **vu échouer face à une implémentation fausse**.
- **Batching autorisé, et recommandé.** Pour un ensemble cohérent de comportements : écrire **tous** les tests rouges, observer le rouge **en bloc**, puis implémenter jusqu'au vert.
- **Pas d'émergence pas à pas.** L'agent écrit l'implémentation complète d'un seul tenant, puis refactore si utile.
- La contrainte n'est pas la **taille** du pas, c'est que **rien ne dépasse la spec** : aucune ligne qu'aucun test du lot n'exige. Pas de garde défensif « au cas où », pas de généralisation anticipée, pas de branche que rien n'emprunte. Quand la mutation révèle du code qu'aucun test ne demande, **supprimer le code** plutôt qu'écrire un test pour le justifier.
- Quand un test ne **peut pas** naître rouge — filet posé sur un comportement déjà correct, réponse à un mutant survivant — la confrontation se fait par **sabotage** : casser volontairement la ligne que le **nom du test** désigne, observer le rouge, restaurer. Saboter _une_ ligne quelconque ne suffit pas.
- **Quand une forme permanente existe, elle est préférable au sabotage.**
- L'**assertion d'absence** — `toHaveCount(0)`, `queryBy… === null` — doit être adossée à l'une de ces deux formes : le **même localisateur** asserté présent (`toHaveCount(1)`) plus tôt dans le même test, avant que l'absence ne soit exigée ; ou un **scénario témoin** voisin, qui montre ce localisateur trouvant son texte là où ce texte a le droit d'exister. Une assertion d'absence qu'aucune des deux formes ne couvre n'est pas un filet.
- Le sabotage reste le recours quand aucune forme permanente n'est possible, et la règle du nom continue de s'y appliquer.

## Point de contrôle « rouge » (use-cases & logique métier)

La mutation prouve que les tests sont **serrés**, pas qu'ils testent la **bonne chose**. Pour tout **use-case** ou toute **logique métier** (agrégation, prorata FR-15, règles de calcul/décision) — **PAS** pour les value objects/entities à invariants de forme triviaux :

1. `tdd-clean-coder` écrit le(s) test(s) rouge(s), **OBSERVE le rouge, puis S'ARRÊTE sans implémenter**.
2. Il rapporte : les tests rouges + **en une phrase chacun, la règle métier qu'ils valident**.
3. L'agent principal présente cette intention à l'utilisateur pour **validation AVANT implémentation**.
4. Après accord seulement : seconde délégation → implémentation → vert → refactor.

Pour un value object trivial (non-vide, borne, type, immuabilité), le cycle complet rouge → vert → refactor en une passe reste autorisé.

## Anti test-tampering

- Un test qui passe de vert à rouge suite à une modif de code productif n'est **JAMAIS** modifié dans la même étape. Cycle obligatoire : **STOP → diagnostiquer → classifier** (régression involontaire vs rupture volontaire) **→ présenter impact → décider avec l'utilisateur → agir**.
- Toute modification d'un test hors périmètre requiert une justification explicite dans le message de commit.
- **Le protocole vaut aussi pour les scénarios Playwright** : un scénario e2e rouge se diagnostique et se classifie avant d'être touché.
- **Exception pré-autorisée — rupture de FORME uniquement.** L'agent **applique et rapporte** au lieu de s'arrêter, à trois conditions cumulatives : le seul écart est **l'ajout de clés** avec leur valeur attendue ; **aucune** assertion n'est supprimée ni relâchée (pas de `toEqual` → `toMatchObject`, pas de littéral → regex partielle) ; la valeur attendue ajoutée est **discriminante**, c'est-à-dire une assertion sur le nouveau champ et non un remplissage.
- Tout le reste déclenche le STOP : sémantique modifiée, assertion affaiblie, test supprimé, jeu de données changé, intention métier révoquée.

## Stack & tests

- **TypeScript** strict + **Vite** + `vite-plugin-pwa` (mode `prompt`).
- **React 18** + **React Router** + **Redux Toolkit** + **styled-components** dans `src/ui/`.
- **Firebase** Auth email/password + **Firestore**, 2 projets (dev / prod) sélectionnés via `VITE_ENV`.
- **Vitest** + **React Testing Library** ; **Stryker Mutator** pour mutation testing.
- **cuid2** (IDs générés dans `domain/` via port `IdGenerator`), **date-fns** (timezone `Europe/Paris`) via port `Clock`. Pas de `new Date()` direct dans `domain/`.
- Tests par couche :
  - `domain/` : Vitest + adapters in-memory + Test Data Builders.
  - `data/` : **pas d'émulateur Java**. Pattern **humble object** : le mapping pur entité ↔ document Firestore vit dans un module pur, testé à 100 % en Vitest (aucune infra) ; les adapters Firestore sont des wrappers minces (I/O only), au plus un test léger avec SDK mocké. Le **round-trip réel** et les **Security Rules** ne sont **pas** testés automatiquement.
    - **Garde-fou compensatoire, obligatoire** : un test statique vérifie que **toute collection Firestore référencée dans `src/data/**` possède un bloc `match` dans `firestore.rules`**. Purement statique, aucun émulateur requis.
    - `firestore.rules` **n'est pas la source de vérité tant qu'il n'est pas déployé** : rien dans le repo ne le pousse. Après toute modification, déploiement explicite puis vérification.
  - `ui/` containers : RTL + store Redux réel + ports mockés.

## Mutation testing

- **Mutation testing sur le code de PRODUCTION** : `domain/`, `data/`, et la **logique UI** (`src/ui/features/**/*.ts` — slices/thunks). **Exclus du `mutate`** : les fichiers de test ET l'**infra de test** (`domain/test-doubles/**`, `domain/test-builders/**`). Gate **bloquant global** `break: 80` (`stryker.conf.mjs`). Les mutants équivalents de boilerplate RTK (nom du type d'action, `name` de slice, objet de config `createSlice`) sont tolérés dès lors que **toute la logique de transition est couverte**.
- **Le score global n'est PAS reproductible : le run isolé fait foi.** Avec `timeoutMS: 10000` et la concurrence par défaut, un même mutant est compté « tué par timeout » ou « survivant » selon la charge machine. Pour **tout fichier modifié dans un cycle**, rejouer `npm run test:mutation:isolated -- '<fichier>'` et **rapporter ce chiffre-là** ; le global ne vaut que comme signal de fumée.
- **`npx stryker run --mutate '<fichier>'` seul ne suffit PAS à isoler.** Avec `incremental: true`, la commande relit `reports/` et **fusionne les résultats en cache de tous les autres fichiers** dans le tableau et dans le score. Le script `test:mutation:isolated` détourne le cache vers un fichier jetable **et le supprime avant chaque run** ; sans cette suppression le fichier jetable redevient un cache. `--no-incremental` n'existe pas, et `--force` reconstruirait le cache réel en le limitant au fichier ciblé, détruisant l'incrémental des autres.
- **Le run isolé règle la fusion, pas les timeouts.** Un fichier peut sortir à 100 % en run isolé **avec des timeouts** ; Stryker compte un timeout comme un mutant tué. Un score isolé assorti de timeouts se rapporte **avec** son nombre de timeouts, jamais nu.
- **Le run global est incrémental** (`incremental: true`) : il ne rejoue que les mutants des fichiers modifiés et des tests affectés. L'état vit dans `reports/`, gitignoré : le bénéfice est **local**, la CI repart de zéro à chaque fois.
- **Le boilerplate RTK est désactivé à la source**, par des `// Stryker disable next-line` ciblés par mutateur : préfixes de types d'action, `name` de slice, objet de config `createSlice`. **Tout survivant restant demande une explication.**
- **Les `.tsx` ne sont pas mutés du tout.** `mutate` ne couvre que `src/ui/features/**/*.ts` : containers et composants n'ont **aucun** filet de mutation. Deux filets seulement les protègent : la **RTL**, qui monte un composant par test avec des ports mockés, et la **suite Playwright**, qui exerce l'application assemblée — vrai routeur, vrai store, vrai CSS, vrais cycles de montage. Un chiffre de mutation ne dit **rien** sur un container. Corollaire de design : une décision (quand vider un champ, quand verrouiller un bouton) appartient au slice, qui est muté — pas au container, qui ne l'est pas.

## Diff d'architecture (fin de cycle)

Le rapport de fin de cycle inclut un **diff d'architecture** :

- **Par couche** (`domain/` / `data/` / `ui/`) : fichiers créés / déplacés.
- **Dépendances entre couches ajoutées**, chacune justifiée (ou « aucune »).
- Tout nouveau **port**, dossier, ou convention introduit.

## Conventions de code

### Construction — une factory statique, un constructeur privé

Toute classe exportée constructible expose une **factory statique** comme unique point d'entrée, et rend son **constructeur privé** pour forcer son usage (pas de `new X()` sur les classes du projet).

- Factory `create()` par défaut, ou **nommée** quand elle porte du sens : `StubIdGenerator.returning(id)`, `ThrowingRecipeRepository.rejectingWith(msg)`, `RecipeBuilder.aRecipe()`.
- Vaut pour les adapters `data/`, les test-doubles et les builders.

### Test Data Builders

Pas de littéraux verbeux dans les tests. Un builder par entity, chaînable, avec une base valide par défaut :

```ts
RecipeBuilder.aRecipe().withoutTitle().build();
```

### Test Doubles — un double ne promet jamais plus que son port

- Là où un port déclare une garantie **absente** (« ordre non garanti », unicité non garantie…), le double doit **exercer activement cette absence** — ordre délibérément mélangé par un shuffle déterministe et seedé, jamais l'ordre d'insertion.
- Quand le contrat d'un port change, **le double change dans la même passe**.

## État transitoire et rémanence du store

Le store Redux est un **singleton de session** (créé une fois dans `main.tsx`) : démonter un composant ne réinitialise que son `useState`, jamais l'état du slice. Les tests RTL créent un store neuf par test, donc **l'état résiduel y est structurellement invisible**.

- Tout champ représentant un **événement transitoire** (constat, résultat one-shot, statut d'une opération ponctuelle) doit avoir un **déclencheur de remise à zéro explicitement spécifié et testé**.
- Toute feature portant un tel champ a **au moins un test qui démonte puis remonte sur le MÊME store** (`unmount()` puis nouveau `render()` en réutilisant l'instance). Un test qui recrée le store ne reproduit pas le défaut.
- **Ne jamais supposer qu'un démontage a lieu** : un conteneur animé (sheet, modale, drawer) reste monté pendant sa transition de sortie, et une réouverture pendant l'animation peut annuler le démontage. Si la remise à zéro dépend d'un remontage, ce remontage doit être **prouvé**, pas déduit.
- Une remise à zéro **inconditionnelle** peut déverrouiller une opération encore en vol — un thunk RTK n'est pas annulé par un démontage. La condition se justifie par un test rouge, pas par une intuition.

## Vérification post-TDD (features `src/ui/` uniquement)

Pour toute feature qui touche `src/ui/`, après le cycle TDD, l'agent principal (pas `tdd-clean-coder`, qui n'a pas les tools MCP) doit :

1. S'assurer que Vite dev tourne (`npm run dev` en background sinon).
2. `mcp__chrome-devtools__navigate_page` vers la route concernée.
3. `mcp__chrome-devtools__take_screenshot` (résolution iPhone 393×852 portrait — l'app est mobile-only).
4. `mcp__chrome-devtools__list_console_messages` — aucune erreur autre que HMR/Vite.
5. Si interaction requise : `click`, `fill`, `press_key` puis re-screenshot pour valider l'état après.
6. **États non-nominaux** : vérifier explicitement les états pertinents pour l'écran — **vide** (liste/collection sans données), **erreur** (échec de chargement/validation), **chargement** (spinner/skeleton). Un état non pertinent est écarté explicitement, pas oublié.
7. **Sortie de chaque état non-nominal** : pour chaque état atteint, rejouer le retour au nominal (rétablir le réseau, corriger la saisie, refermer/rouvrir, recharger) et confirmer que l'écran ne garde **aucune trace** : message résiduel, bouton verrouillé, liste périmée.
8. Screenshot final joint au report utilisateur.

Alternative à la demande : slash command **`/verify <route>`**.

### Si la vérif Chrome révèle un bug (les tests unitaires étaient verts)

Le bug est une **spec absente**, pas un accident. Cycle de recovery obligatoire :

1. **INTERDICTION** de fixer directement dans le code.
2. Formuler le bug comme un **nouveau test rouge** qui capture le comportement attendu.
3. Redéléguer à `tdd-clean-coder` avec cette nouvelle spec.
4. Cycle TDD complet : baseline → RED → GREEN → REFACTOR.
5. Si le fix casse un ancien test qui était vert : appliquer le protocole **anti test-tampering** (STOP, classifier, décider).
6. Re-vérification Chrome. Boucler tant que Chrome n'est pas OK.

La checklist DoD est un **état vivant** qui reflète l'itération courante. Si Chrome décoche sa case, la feature est ré-ouverte et les cases précédentes doivent être re-visitées sur le nouveau code.

## Revue de code indépendante (AVANT chaque commit)

Quand le travail semble fini et que **tous les checks passent** (lint / test / **build** / mutation), **avant de commit** — jamais de commit automatique dans la foulée des checks verts. La revue porte sur du **code écrit**, jamais sur une spec : elle intervient après le cycle TDD et après la vérif Chrome, à l'étape 5 du flux de travail.

1. Lancer un **sous-agent de code review INDÉPENDANT** — contexte frais, **pas** l'agent (ni un fork de l'agent) qui a orchestré le code — sur le diff.
2. Le sous-agent **rapporte ses findings, ne corrige rien**. Il traque en priorité ce que la mutation ne voit pas : **tests qui valident la mauvaise intention métier**, entorses aux frontières de couche, assertions trop faibles. **Lui demander explicitement d'instruire le cycle de vie et la rémanence d'état.**
3. **L'agent principal vérifie chaque finding AVANT de le présenter** — reproduire le scénario dans le code ou dans Chrome.
4. **Discuter chaque finding avec l'utilisateur** : pertinent vs non-pertinent.
5. Appliquer **seulement les findings pertinents** (via `tdd-clean-coder` si code productif, protocole habituel) ; écarter les autres avec justification explicite.
6. Si un finding a été appliqué, **le flux repart à l'étape 1** — nouveau cycle, nouvelle mutation, nouvelle vérif Chrome, re-revue sur le **delta**.
7. **Vérification manuelle de l'utilisateur** (features UI uniquement), puis **son feu vert explicite**. Jamais de commit sans lui.

Si le code rebouclé n'a changé que sur quelques points, la re-revue porte sur le **delta**, avec les findings précédents fournis en contexte et l'interdiction de les redécouvrir.

**L'agent principal ne rejoue pas systématiquement `lint`/`test`/`build` après chaque rapport d'agent** : un seul passage complet avant commit suffit. Le **run de mutation isolé, lui, est rejoué**.

### Règle d'arrêt — quand une branche est finie

- **Un finding PRÉ-EXISTANT et NON BLOQUANT ne rouvre pas le cycle en cours — il devient le suivant.** Seul un défaut **introduit par la branche**, ou **bloquant pour l'utilisateur**, la maintient ouverte.
- **Pré-existant** : le défaut est déjà sur `main` avant la branche. Le fait que la branche le rende plus visible, plus fréquent ou plus gênant **ne le rend pas nouveau**.
- **Bloquant** : perte de donnée, faux signal de succès, écran qui se contredit, impasse sans porte de sortie. Pas « ce serait mieux autrement ».
- Quand la règle s'applique, **ne pas soumettre le choix à l'utilisateur comme une option ouverte** : annoncer que le finding est reporté, avec son motif, et le tracer. L'utilisateur reste libre de trancher l'inverse, sur une proposition et non sur un menu.
- **« Tracer » veut dire OUVRIR UNE ISSUE GitHub, pas l'écrire dans un rapport.** Tout finding reporté part en issue, sans exception et sans attendre qu'on le demande. Un finding qui ne vit que dans un message de conversation, un corps de PR ou un message de commit est **perdu**.
- L'issue porte le **scénario concret**, les références `fichier:ligne`, et le classement (introduit/pré-existant, bloquant/non bloquant) : elle doit être reprenable sans le contexte de la session qui l'a produite. Regrouper est permis et souvent préférable — plusieurs findings qui se referment dans la même passe font une seule issue.

## Quand consulter l'utilisateur, quand trancher

Le critère n'est ni l'importance ni l'irréversibilité : c'est **est-ce que la réponse change le travail ?**

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

En cas de doute sur la catégorie : **trancher, et exposer la décision** avec ce qu'elle écarte.

### Rester chirurgical

- Chaque ligne modifiée doit se rattacher à la demande.
- **Épouser le style existant** plutôt que le sien. Ne pas « améliorer » le code adjacent, ses commentaires ou sa mise en forme.
- **Nettoyer son propre mess, pas celui des autres.** Une correction qui rend un import ou une variable orphelins les retire. Le code mort **sans rapport** qu'on croise se **signale**, il ne se supprime pas.
- La règle « supprimer plutôt qu'écrire un test pour le justifier » vise ce que **le cycle courant** révèle inutile — un mutant survivant, un garde qu'aucun test n'exige. Elle ne vise pas ce qu'on trouve en passant.
- **Un périmètre plus large que demandé se propose, il ne se prend pas.**

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
- [ ] **Run de mutation ISOLÉ** (`npm run test:mutation:isolated -- '<fichier>'`) sur chaque fichier modifié, et c'est **ce** chiffre qui est rapporté, timeouts compris — `npx stryker run --mutate` seul fusionne le cache incrémental et rend un chiffre qui n'est pas celui du fichier
- [ ] **Si use-case / logique métier** : intention validée au **rouge** avant implémentation (point de contrôle « rouge »)
- [ ] **Si nouvelle collection Firestore** : bloc `match` ajouté dans `firestore.rules` **et déployé** (le fichier du repo ne fait pas foi)
- [ ] **Si nouveau test-double ou port modifié** : le double n'offre aucune garantie que son port ne promet pas (ordre, unicité…)
- [ ] **Si nouvel état transitoire** (constat, statut d'opération ponctuelle) : déclencheur de remise à zéro spécifié + test de remontage sur le **même** store
- [ ] Diff d'architecture fourni (créé/déplacé par couche + dépendances justifiées)
- [ ] **Revue de code indépendante** passée AVANT commit (findings pertinents traités, non-pertinents justifiés)
- [ ] **Findings reportés → issues GitHub ouvertes**, avec scénario, `fichier:ligne` et classement. « Tracé » dans un rapport ne compte pas : ce qui n'est pas dans une issue est perdu à la fermeture de la session
- [ ] **Si feature `src/ui/`** : vérif Chrome MCP jointe au report (screenshot + console check + interactions + **états non-nominaux** vide/erreur/chargement + **sortie** de chacun d'eux)
- [ ] `npm run e2e` OK — les parcours qui ne sont PAS la feature du jour tiennent toujours. Un scénario rouge relève du protocole anti test-tampering : classifier avant de toucher
- [ ] **Vérification manuelle de l'utilisateur** (features `src/ui/`) et son **feu vert explicite** — jamais de commit sans lui
- [ ] Commit conforme aux Conventional Commits
