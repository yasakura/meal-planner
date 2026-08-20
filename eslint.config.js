import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import boundaries from 'eslint-plugin-boundaries';

export default tseslint.config(
  {
    ignores: [
      'dist',
      // Déclarations générées par `tsc -b` (projets référencés) : du code qu'on n'écrit pas,
      // et que le linter n'a rien à juger.
      '.tsbuild',
      'coverage',
      '.stryker-tmp',
      'reports',
      'node_modules',
      '_bmad',
      '_bmad-output',
      '.claude',
      'docs',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      boundaries,
    },
    settings: {
      'boundaries/elements': [
        { type: 'domain', pattern: 'src/domain/**' },
        { type: 'data', pattern: 'src/data/**' },
        { type: 'ui', pattern: 'src/ui/**' },
        { type: 'config', pattern: 'src/config/**' },
        { type: 'test', pattern: 'src/test/**' },
        // Scénarios Playwright. Déclarés ICI pour que la règle les évalue : un fichier
        // qu'aucun élément NI aucune catégorie de fichier ne reconnaît n'est jamais soumis à
        // `boundaries/dependencies` (`src/main.tsx` est justement dans le second cas),
        // et un `import ... from '../../src/data/...'` passait alors lint ET build. La
        // frontière que documente `e2e/support/e2e-controls.ts` — rien du code applicatif
        // n'est visible depuis `e2e/` — n'était tenue que par ce commentaire.
        // `partialMatch: false` : sans lui, les patterns sont évalués DE LA DROITE, et
        // `e2e/**` capturait aussi `src/data/e2e/**` — les adapters in-memory se retrouvaient
        // typés `e2e` et leurs imports de `domain/` en erreur. Le pattern doit valoir depuis
        // la racine du projet, et lui seul.
        { type: 'e2e', pattern: 'e2e/**', partialMatch: false },
      ],
      // `src/main.tsx` est un FICHIER, pas un dossier. Déclaré en élément, son pattern était
      // interprété en pattern de dossier (`boundaries/elements` classe des dossiers), ce que
      // le plugin signalait à chaque lint. Un descripteur de fichier le classe par `category`,
      // et les policies le sélectionnent via `from: { file: { categories: 'entry' } }`.
      'boundaries/files': [{ category: 'entry', pattern: 'src/main.tsx' }],
      'boundaries/ignore': ['**/*.test.{ts,tsx}'],
      /**
       * SANS CECI, `boundaries/dependencies` NE VOIT RIEN. Le plugin résout chaque import via
       * `eslint-import-resolver-node`, dont les extensions par défaut sont `.mjs/.js/.json/.node` :
       * aucun `.ts` ne se résolvait, la cible de chaque import local restait « unknown », et la
       * règle ne pouvait comparer aucun couple de types. Mesuré : un `import ... from '../../ui'`
       * ajouté dans `src/domain/` passait `npm run lint` sans un mot. Les frontières de couche
       * étaient donc déclarées, documentées — et inertes.
       */
      'import/resolver': {
        node: { extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'] },
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // `boundaries/element-types` est le NOM DÉPRÉCIÉ de `boundaries/dependencies` (v6), et
      // son option `rules` le nom déprécié de `policies` (v7). Les sélecteurs raccourcis
      // (`from: 'domain'`, `allow: ['domain']`) sont la syntaxe legacy v5 : ils fonctionnent
      // encore, mais ne savent désigner qu'un type d'élément — pas une catégorie de fichier,
      // dont `src/main.tsx` a désormais besoin.
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: { element: { types: 'domain' } },
              allow: { to: { element: { types: 'domain' } } },
            },
            {
              from: { element: { types: 'data' } },
              allow: { to: { element: { types: { anyOf: ['domain', 'data'] } } } },
            },
            {
              from: { element: { types: 'ui' } },
              allow: { to: { element: { types: { anyOf: ['domain', 'data', 'ui', 'config'] } } } },
            },
            {
              from: { element: { types: 'config' } },
              allow: { to: { element: { types: 'config' } } },
            },
            {
              from: { element: { types: 'test' } },
              allow: {
                to: { element: { types: { anyOf: ['domain', 'data', 'ui', 'config', 'test'] } } },
              },
            },
            {
              from: { file: { categories: 'entry' } },
              allow: { to: { element: { types: { anyOf: ['ui', 'config'] } } } },
            },
            // `e2e` n'atteint l'application QUE par le navigateur. Ses seuls imports internes
            // sont ses propres helpers (`./support/*`) ; tout le reste — `domain`, `data`,
            // `ui`, `config` — tombe sous le `default: 'disallow'`.
            { from: { element: { types: 'e2e' } }, allow: { to: { element: { types: 'e2e' } } } },
          ],
        },
      ],
      // Syntaxe LEGACY conservée délibérément — ne pas « aligner » sur les policies ci-dessus.
      // `boundaries/external` est déprécié en bloc : son avertissement est émis en tête de
      // handler, quelle que soit la configuration. L'éteindre exige de SUPPRIMER la règle et de
      // replier ses interdits dans `boundaries/dependencies` avec `checkAllOrigins: true` — une
      // option globale qui ferait entrer TOUS les imports de `node_modules` du dépôt sous le
      // `default: 'disallow'`. C'est un changement de comportement, pas un renommage.
      'boundaries/external': [
        'error',
        {
          default: 'allow',
          rules: [
            {
              from: 'domain',
              disallow: [
                'react',
                'react-dom',
                'react-router-dom',
                '@reduxjs/toolkit',
                'react-redux',
                'styled-components',
                'firebase',
                'firebase/*',
                // Le domaine n'a AUCUNE bibliothèque de date : `CalendarDate` est une date
                // civile, sans heure ni fuseau, et son arithmétique est ancrée sur UTC. Un
                // `import { addDays } from 'date-fns'` ici rendrait `CalendarDate` inutile et
                // ramènerait un instant — donc un fuseau — dans une couche qui n'en a pas.
                // Le formatage, lui, reste permis dans `ui/` (`menu-day-label.ts`).
                'date-fns',
                'date-fns/*',
              ],
            },
            {
              from: 'data',
              disallow: [
                'react',
                'react-dom',
                'react-router-dom',
                '@reduxjs/toolkit',
                'react-redux',
                'styled-components',
              ],
            },
          ],
        },
      ],
    },
  },
);
