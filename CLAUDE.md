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
  - `data/` : Vitest + émulateur Firebase (Auth + Firestore) + Firebase Rules Test SDK pour les Security Rules.
  - `ui/` containers : RTL + store Redux réel + ports mockés.
- **Mutation score `domain/` ≥ 80 %**.

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
6. Screenshot final joint au report utilisateur.

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

## Commits

Conventional Commits : `feat:`, `fix:`, `test:`, `refactor:`, `chore:`, `docs:`.

## Definition of Done (checklist par feature)

Aucune case n'est cochée "définitivement" avant que **toutes** le soient sur le dernier état du code.

- [ ] Tests rouges écrits en premier (échec observé, pas juste écrits)
- [ ] Impl minimale → tests verts
- [ ] Refactor si utile, suite toujours verte
- [ ] `npm run lint` OK (boundaries respectées)
- [ ] `npm run test` OK (seuils coverage tenus)
- [ ] `npm run test:mutation` OK (seuil mutation tenu)
- [ ] **Si feature `src/ui/`** : vérif Chrome MCP jointe au report (screenshot + console messages check + interactions user validées)
- [ ] Commit conforme aux Conventional Commits
