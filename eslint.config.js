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
      ],
      'boundaries/ignore': ['**/*.test.{ts,tsx}'],
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
