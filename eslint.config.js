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
        { type: 'e2e', pattern: 'e2e/**', partialMatch: false },
      ],
      'boundaries/files': [{ category: 'entry', pattern: 'src/main.tsx' }],
      'boundaries/ignore': ['**/*.test.{ts,tsx}'],
      'import/resolver': {
        node: { extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'] },
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
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
            { from: { element: { types: 'e2e' } }, allow: { to: { element: { types: 'e2e' } } } },
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
