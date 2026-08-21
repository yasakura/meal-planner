# ADR 0015 — Les frontières de couches étaient déclarées et inertes

- **Statut** : en vigueur — **piège**
- **Date** : 2026-08-17 (`aaf4d22`, `fix(lint): les frontières de couches n'étaient évaluées sur
aucun fichier`)
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
4. **`boundaries/external` reste écrit en syntaxe LEGACY, délibérément.** La règle est dépréciée
   **en bloc** : son avertissement est émis en tête de handler quelle que soit la configuration.
   L'éteindre exigerait de **supprimer** la règle et de replier ses interdits dans
   `boundaries/dependencies` avec `checkAllOrigins: true` — une option **globale** qui ferait entrer
   tous les imports de `node_modules` du dépôt sous le `default: 'disallow'`. C'est un changement de
   comportement, pas un renommage : **ne pas « aligner » sur les policies voisines.**

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
