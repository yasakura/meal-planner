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

## Commits

Conventional Commits : `feat:`, `fix:`, `test:`, `refactor:`, `chore:`, `docs:`.

## Definition of Done (checklist par feature)

- [ ] Tests rouges écrits en premier (échec observé, pas juste écrits)
- [ ] Impl minimale → tests verts
- [ ] Refactor si utile, suite toujours verte
- [ ] `npm run lint` OK (boundaries respectées)
- [ ] `npm run test` OK (seuils coverage tenus)
- [ ] `npm run test:mutation` OK (seuil mutation tenu)
- [ ] Commit conforme aux Conventional Commits
