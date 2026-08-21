import { RuleTester, type Rule } from 'eslint';
import { describe, it, expect } from 'vitest';
import { mealPlanner } from '../../eslint.config.js';

const regle = mealPlanner.rules['no-comments'];

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run('gage du garde no-comments', regle as unknown as Rule.RuleModule, {
  valid: [
    {
      name: 'tolérance : Stryker disable, justification comprise',
      code: "// Stryker disable next-line StringLiteral : boilerplate RTK, mutant équivalent.\nconst type = 'menu/charger';",
    },
    {
      name: 'tolérance : Stryker restore',
      code: '// Stryker restore all\nconst compteur = 1;',
    },
    {
      name: 'tolérance : eslint-disable',
      code: '// eslint-disable-next-line no-console\nconst compteur = 1;',
    },
    {
      name: 'tolérance : @ts-expect-error avec sa description',
      code: '// @ts-expect-error le port refuse ce cas\nconst compteur = 1;',
    },
    {
      name: 'tolérance : /// <reference>',
      code: '/// <reference types="vite/client" />\nconst compteur = 1;',
    },
    {
      name: 'tolérance : prettier-ignore',
      code: '// prettier-ignore\nconst compteur = 1;',
    },
  ],
  invalid: [
    {
      name: 'frontière : eslint-disabledtruc est refusé, la tolérance eslint-disable est bornée par une frontière de mot',
      code: '// eslint-disabledtruc\nconst compteur = 1;',
      errors: [{ messageId: 'interdit' }],
    },
    {
      name: 'prose refusée : commentaire de ligne',
      code: 'const compteur = 1; // on part de un, sinon la première page saute',
      errors: [{ messageId: 'interdit' }],
    },
    {
      name: 'prose refusée : commentaire de bloc',
      code: '/* on part de un, sinon la première page saute */\nconst compteur = 1;',
      errors: [{ messageId: 'interdit' }],
    },
    {
      name: 'prose refusée : commentaire JSX',
      code: 'const vue = <section>{/* la marge vient du Layout */}</section>;',
      errors: [{ messageId: 'interdit' }],
    },
    {
      name: 'frontière : Strykerize est refusé, la tolérance Stryker est bornée à disable et restore',
      code: '// Strykerize\nconst compteur = 1;',
      errors: [{ messageId: 'interdit' }],
    },
    {
      name: 'frontière : @ts-ignore est refusé, la règle ne tolère que @ts-expect-error',
      code: '// @ts-ignore\nconst compteur = 1;',
      errors: [{ messageId: 'interdit' }],
    },
    {
      name: 'frontière : @ts-nocheck est refusé, la règle ne tolère que @ts-expect-error',
      code: '// @ts-nocheck\nconst compteur = 1;',
      errors: [{ messageId: 'interdit' }],
    },
  ],
});

describe('gage du garde no-comments : le message', () => {
  it("n'annonce que les directives que la règle accepte réellement", () => {
    const message = regle.meta.messages.interdit;

    expect(message).toContain('@ts-expect-error');
    expect(message).not.toContain('@ts-ignore');
    expect(message).not.toContain('@ts-nocheck');
  });
});
