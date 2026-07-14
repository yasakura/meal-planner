# Meal Planner — invariants projet

## Architecture (clean archi light)

3 couches, frontières enforced par ESLint `eslint-plugin-boundaries` :

- `src/domain/` — **PUR**. Entities, use cases, ports (interfaces repositories). Aucun import de React, Redux, Firebase, styled-components, ou toute lib UI/infra.
- `src/data/` — Implémentations Firebase des ports définis par `domain/`. Peut importer `domain/` et le SDK Firebase. Interdit d'importer React, Redux, styled-components.
- `src/ui/` — React (components dumb + containers Redux). Peut importer `domain/` (types, use cases) et `data/` (via injection dans le store/root). Aucune logique métier — les containers orchestrent, les use cases décident.

Tout contrat entre couches passe par un port dans `domain/ports/`. Le "M" du MVC = `domain + data`. Le "V" = components dumb. Le "C" = containers Redux + thunks.

## TDD Uncle Bob (règle absolue)

- Toute ligne d'implémentation naît d'un **test rouge observé**. Jamais l'inverse.
- Cycle strict : rouge → vert → refactor.
- Pour toute écriture ou modification de code productif dans `src/`, **DÉLÉGUER au sous-agent `tdd-clean-coder`** (`~/.claude/agents/`) ou utiliser la slash command `/tdd <tâche>`.
- Interdit : green-on-arrival (un test qui passe dès l'écriture ne teste rien).

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

## Stack & tests

- **TypeScript** strict + **Vite** + `vite-plugin-pwa` (mode `prompt`).
- **React 18** + **React Router** + **Redux Toolkit** + **styled-components** dans `src/ui/`.
- **Firebase** Auth email/password + **Firestore**, 2 projets (dev / prod) sélectionnés via `VITE_ENV`.
- **Vitest** + **React Testing Library** ; **Stryker Mutator** pour mutation testing.
- **cuid2** (IDs générés dans `domain/` via port `IdGenerator`), **date-fns** (timezone `Europe/Paris`) via port `Clock`. Pas de `new Date()` direct dans `domain/`.
- Tests par couche :
  - `domain/` : Vitest + adapters in-memory + Test Data Builders.
  - `data/` : **pas d'émulateur Java** (projet front — décision 2026-07-14). Pattern **humble object** : le mapping pur entité ↔ document Firestore vit dans un module pur, testé à 100 % en Vitest (aucune infra) ; les adapters Firestore sont des wrappers minces (I/O only), au plus un test léger avec SDK mocké. Le **round-trip réel** et les **Security Rules** ne sont **pas** testés automatiquement pour l'instant — à revisiter via un émulateur Docker si le besoin se confirme.
  - `ui/` containers : RTL + store Redux réel + ports mockés.
- **Mutation score `domain/` ≥ 80 %** — gate **bloquant** (`stryker.conf.mjs`, `break: 80`), pas seulement exécuté. Tant que seul `domain/` est muté, le seuil global applique la règle. Quand `data/` grossira, si `data/` doit avoir un seuil distinct, scinder en configs par dossier (une passe Stryker scopée `domain/` à 80, une passe `data/` à son propre seuil).

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

## Vérification post-TDD (features `src/ui/` uniquement)

Les tests unitaires garantissent que **le code fait ce que le test dit** ; la vérif navigateur garantit que **la feature fait ce que l'utilisateur voit**. Les deux sont requis.

Pour toute feature qui touche `src/ui/`, après le cycle TDD, l'agent principal (pas `tdd-clean-coder` qui n'a pas les tools MCP) doit :

1. S'assurer que Vite dev tourne (`npm run dev` en background sinon).
2. `mcp__chrome-devtools__navigate_page` vers la route concernée.
3. `mcp__chrome-devtools__take_screenshot` (résolution iPhone 393×852 portrait — l'app est mobile-only).
4. `mcp__chrome-devtools__list_console_messages` — aucune erreur autre que HMR/Vite.
5. Si interaction requise : `click`, `fill`, `press_key` puis re-screenshot pour valider l'état après.
6. **États non-nominaux** : le screenshot du seul chemin nominal ne suffit pas. Vérifier explicitement les états pertinents pour l'écran — **vide** (liste/collection sans données), **erreur** (échec de chargement/validation), **chargement** (spinner/skeleton). Un état non pertinent est écarté explicitement, pas oublié.
7. Screenshot final joint au report utilisateur.

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

Quand le travail semble fini et que **tous les checks passent** (lint / test / **build** / mutation), **avant de commit** — jamais de commit automatique dans la foulée des checks verts :

1. Lancer un **sous-agent de code review INDÉPENDANT** — contexte frais, **pas** l'agent (ni un fork de l'agent) qui a orchestré le code — sur le diff.
2. Le sous-agent **rapporte ses findings, ne corrige rien**. Il traque en priorité ce que la mutation ne voit pas : **tests qui valident la mauvaise intention métier**, entorses aux frontières de couche, assertions trop faibles.
3. **Discuter chaque finding avec l'utilisateur** : pertinent vs non-pertinent.
4. Appliquer **seulement les findings pertinents** (via `tdd-clean-coder` si code productif, protocole habituel) ; écarter les autres avec justification explicite.
5. **Re-vérifier** (lint / test / mutation) après corrections.
6. **Seulement ensuite : commit.**

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
- [ ] **Si use-case / logique métier** : intention validée au **rouge** avant implémentation (point de contrôle « rouge »)
- [ ] Diff d'architecture fourni (créé/déplacé par couche + dépendances justifiées)
- [ ] **Revue de code indépendante** passée AVANT commit (findings pertinents traités, non-pertinents justifiés)
- [ ] **Si feature `src/ui/`** : vérif Chrome MCP jointe au report (screenshot + console check + interactions + **états non-nominaux** vide/erreur/chargement)
- [ ] Commit conforme aux Conventional Commits
