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
        { type: 'entry', pattern: 'src/main.tsx' },
        // Scénarios Playwright. Déclarés ICI pour que la règle les évalue : un fichier
        // qu'aucun élément ne reconnaît n'est jamais soumis à `boundaries/element-types`,
        // et un `import ... from '../../src/data/...'` passait alors lint ET build. La
        // frontière que documente `e2e/support/e2e-controls.ts` — rien du code applicatif
        // n'est visible depuis `e2e/` — n'était tenue que par ce commentaire.
        // `partialMatch: false` : sans lui, les patterns sont évalués DE LA DROITE, et
        // `e2e/**` capturait aussi `src/data/e2e/**` — les adapters in-memory se retrouvaient
        // typés `e2e` et leurs imports de `domain/` en erreur. Le pattern doit valoir depuis
        // la racine du projet, et lui seul.
        { type: 'e2e', pattern: 'e2e/**', partialMatch: false },
      ],
      'boundaries/ignore': ['**/*.test.{ts,tsx}'],
      /**
       * SANS CECI, `boundaries/element-types` NE VOIT RIEN. Le plugin résout chaque import via
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
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'domain', allow: ['domain'] },
            { from: 'data', allow: ['domain', 'data'] },
            { from: 'ui', allow: ['domain', 'data', 'ui', 'config'] },
            { from: 'config', allow: ['config'] },
            { from: 'test', allow: ['domain', 'data', 'ui', 'config', 'test'] },
            { from: 'entry', allow: ['ui', 'config'] },
            // `e2e` n'atteint l'application QUE par le navigateur. Ses seuls imports internes
            // sont ses propres helpers (`./support/*`) ; tout le reste — `domain`, `data`,
            // `ui`, `config` — tombe sous le `default: 'disallow'`.
            { from: 'e2e', allow: ['e2e'] },
          ],
        },
      ],
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
