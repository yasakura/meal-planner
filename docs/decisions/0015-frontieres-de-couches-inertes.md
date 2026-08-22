# ADR 0015 — Les frontières de couches étaient déclarées et inertes

- **Statut** : en vigueur — **piège**
- **Date** : 2026-08-17 (`aaf4d22`, `fix(lint): les frontières de couches n'étaient évaluées sur
aucun fichier`)
- **Amendée le** : 2026-08-23 (point 4 : `boundaries/external` supprimée)
- **Portée** : `eslint.config.js`

## Contexte

Les trois couches `domain/` / `data/` / `ui/` sont annoncées comme « enforced par
`eslint-plugin-boundaries` ». Elles ne l'étaient pas. La configuration était présente, lisible,
plausible — et **inerte**.

## La mesure

Un `import ... from '../../ui'` ajouté dans `src/domain/` passait `npm run lint` **sans un mot**.

Cause : le plugin résout chaque import via `eslint-import-resolver-node`, dont les extensions par
défaut sont `.mjs / .js / .json / .node`. **Aucun `.ts` ne se résolvait**, la cible de chaque import
local restait « unknown », et la règle ne pouvait comparer aucun couple de types.

## Décision

Quatre réglages, chacun payé par une violation qui passait :

1. **`settings['import/resolver'].node.extensions` inclut `.ts` et `.tsx`.** Sans cela,
   `boundaries/dependencies` ne voit **rien**. C'est le réglage sans lequel tous les autres sont
   décoratifs.
2. **`src/main.tsx` est déclaré par `boundaries/files`, pas par `boundaries/elements`.** C'est un
   **fichier**, pas un dossier : déclaré en élément, son pattern était interprété comme un pattern
   de dossier, ce que le plugin signalait à chaque lint. Un descripteur de fichier le classe par
   `category`, et les policies le sélectionnent via `from: { file: { categories: 'entry' } }`.
3. **`{ type: 'e2e', pattern: 'e2e/**', partialMatch: false }`.** Les scénarios Playwright sont
   déclarés ici pour que la règle les **évalue** : un fichier qu'aucun élément ni aucune catégorie
   ne reconnaît n'est **jamais** soumis à `boundaries/dependencies`, et un
   `import ... from '../../src/data/...'` passait alors lint **et** build. Le `partialMatch: false`
   n'est pas cosmétique : sans lui, les patterns sont évalués **de la droite**, et `e2e/**`
   capturait aussi `src/data/e2e/**` — les adapters in-memory se retrouvaient typés `e2e` et leurs
   imports de `domain/` en erreur.
4. **`boundaries/external` portait les interdits de bibliothèques externes, en syntaxe LEGACY.**
   La règle est dépréciée **en bloc** : son avertissement est émis en tête de handler quelle que
   soit la configuration. Elle a été **supprimée** le 2026-08-23 et ses interdits repliés dans
   `boundaries/dependencies` — voir l'amendement en fin d'ADR.

Vocabulaire du plugin, pour ne pas s'y perdre : `boundaries/element-types` est le nom **déprécié**
de `boundaries/dependencies` (v6), et son option `rules` le nom déprécié de `policies` (v7). Les
sélecteurs raccourcis (`from: 'domain'`) sont la syntaxe legacy v5 : ils fonctionnent encore, mais
ne savent désigner qu'un type d'élément — pas une catégorie de fichier.

## Conséquences

- La leçon dépasse ce fichier : **un garde-fou qu'on n'a jamais vu échouer n'est pas un garde-fou.**
  Tout garde-fou déclaré se confronte une fois à la violation qu'il annonce, rouge observé, puis
  retrait de la violation. C'est devenu une règle de `CLAUDE.md`.
- Les frontières sont désormais tenues par **deux** garde-fous indépendants : le plugin ESLint et
  `src/test/architecture.test.ts`, qui lit les imports en statique. Le second ne dépend d'aucune
  résolution de module — il ne pouvait pas être victime du même défaut.
- `e2e/` n'atteint l'application **que par le navigateur** : ses seuls imports internes sont ses
  propres helpers, tout le reste tombe sous `default: 'disallow'`.

## Amendement du 2026-08-23 — `boundaries/external` supprimée

`boundaries/external` laissait trois avertissements au lint. Le premier
(`Rule "boundaries/external" is deprecated`) est **inconditionnel** :
`Rules/External.js` appelle `warnMigrationToDependencies(...)` en tête de handler, avant toute
lecture des options. Moderniser `rules` → `policies` et les sélecteurs éteint les deux autres,
**pas celui-là**. Zéro avertissement exigeait donc de supprimer la règle, pas de la moderniser.

### La forme retenue

`boundaries/dependencies` reçoit `checkAllOrigins: true`, et ses policies sont ordonnées par
l'évaluation en **last-write-wins** (`Rules/Dependencies.js`, `evaluatePolicies`) :

1. `{ allow: { to: { module: { origin: ['external', 'core'] } } } }` — restaure le `default: allow`
   que portait `external`, sans quoi le `default: 'disallow'` de `dependencies` interdirait tout
   `node_modules` ;
2. les policies de couche existantes, qui ne sélectionnent que des éléments locaux et ne peuvent
   donc pas rencontrer une dépendance externe ;
3. les `disallow` externes de `domain` et `data`, **en dernier**, sinon la policy 1 les écrase.

La policy 1 doit être une entrée **séparée**, et non un `allow` fusionné dans les entrées
`from: domain` / `from: data`. Le last-write-wins n'est pas seul en cause : au sein d'**une même**
policy, `disallow` l'emporte et `allow` n'est **même pas évalué** (`evaluatePolicies`, garde
`if (!denyMatched && ...)`). Fusionner rendrait l'`allow` inatteignable dès qu'un `disallow` matche,
et la forme séparée — qui semble arbitraire au premier lecteur — est ce qui la rend nécessaire.

### Les mesures

Les trois réglages sont **load-bearing**, chacun confronté en le cassant seul :

| Sabotage                     | `react` dans `domain/` | `date-fns` dans `ui/`    |
| ---------------------------- | ---------------------- | ------------------------ |
| aucun (config retenue)       | rouge                  | vert                     |
| `checkAllOrigins` retiré     | **vert** — inerte      | vert                     |
| policy 1 déplacée en dernier | **vert** — inerte      | vert                     |
| policy 1 supprimée           | rouge                  | **rouge** — faux positif |

Retirer `checkAllOrigins` reproduit **exactement** l'inertie de 2026-08-17 : la règle est écrite,
lisible, et ne regarde aucune dépendance externe. C'est le réglage le plus dangereux du lot, parce
que son absence ne produit **aucun** message.

Une grille de 25 imports — 12 interdits, 13 légitimes, dans `domain/`, `data/`, `ui/`, `config/`,
`test/`, `e2e/`, un fichier de test, `scripts/` et `main.tsx` — a été jouée **avant et après** la
migration : verdicts identiques ligne à ligne.

### Deux corrections à l'analyse préalable

- **Les fichiers qu'aucun élément ne classe ne sont pas concernés par `checkAllOrigins`.**
  `Rules/Support/DependencyRule.js` sort dès `create()` sur
  `entity.file.isIgnored || (entity.file.isUnknown && entity.element.isUnknown)`. `vite.config.ts`,
  `playwright.config.ts` et les `*.test.ts` (via `boundaries/ignore`) restent hors de portée. Le
  risque de `checkAllOrigins` porte sur les fichiers **classés**, pas sur tout le dépôt.
- **Le `source` d'un module externe est sa base, jamais son sous-chemin.** `firebase/firestore`
  est décrit avec `source: 'firebase'` et `internalPath: 'firestore'`. Les entrées `'firebase/*'` et
  `'date-fns/*'` de l'ancienne liste ne pouvaient donc matcher **rien** : elles étaient déjà inertes
  avant la migration, et n'ont pas été reportées. Mesuré : `firebase/auth`, `date-fns/locale` et
  `react-dom/client` dans `domain/` sont rouges sans elles. **Ne pas les restaurer en croyant
  réparer un oubli** : leur suppression est le constat de leur inertie, pas une omission.

### Le drapeau `--max-warnings 0`, et ce qu'il ne garde pas

`npm run lint` porte désormais `--max-warnings 0`. Le statu quo — trois avertissements tolérés —
n'avait plus de sens une fois le zéro atteint. Confronté : un avertissement introduit fait sortir
`npm run lint` en **exit 1**, retiré il repasse à 0.

Mais le drapeau **ne couvre pas la classe d'avertissements que cet amendement vient de supprimer.**
Réintroduire `boundaries/external` fait réapparaître ses trois lignes à l'écran et `npm run lint`
sort tout de même en **exit 0**. Le plugin les émet par `console.warn` (`Debug/Debug.js`,
`warnOnce` → `printBlock`), hors du pipeline de messages d'ESLint ; `--max-warnings` ne compte que
les messages de règle en `severity: 1`. Le drapeau garde donc les avertissements de **règles**
— `react-refresh/only-export-components`, directives `eslint-disable` inutiles — et **rien** de ce
qu'un plugin écrit sur la console. Le seul garde contre une rechute de cette famille reste la
grille de confrontation, rejouée à la main.
