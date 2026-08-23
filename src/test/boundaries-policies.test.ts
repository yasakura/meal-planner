import { ESLint } from 'eslint';
import { describe, it, expect } from 'vitest';

const eslint = new ESLint({
  overrideConfig: {
    languageOptions: { parserOptions: { projectService: false, project: null } },
    rules: {
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'off',
    },
  },
});

async function verdict(fichier: string, cible: string): Promise<string[]> {
  const code = `import { x } from '${cible}';\nexport const y = x;\n`;
  const [resultat] = await eslint.lintText(code, { filePath: fichier, warnIgnored: false });
  return (resultat?.messages ?? []).map((message) => `${message.ruleId}: ${message.message}`);
}

const refus = (depuis: string, vers: string) =>
  `boundaries/dependencies: There is no policy allowing dependencies from elements of type "${depuis}" to elements of type "${vers}"`;

describe('Policies boundaries', () => {
  it('gage de la policy config : config → domain est REFUSÉ, et config → config reste permis', async () => {
    expect(await verdict('src/config/exemple.ts', '../domain/entities/recipe')).toEqual([
      refus('config', 'domain'),
    ]);
    expect(await verdict('src/config/exemple.ts', './require-env')).toEqual([]);
  });

  it('gage de la policy test : test → e2e est REFUSÉ, et test → ui reste permis', async () => {
    expect(await verdict('src/test/exemple.ts', '../../e2e/support/account-sheet')).toEqual([
      refus('test', 'e2e'),
    ]);
    expect(await verdict('src/test/exemple.ts', '../ui/features/convives/convives-slice')).toEqual(
      [],
    );
  });

  it('gage de la policy ui : ui → test est REFUSÉ, et ui → data reste permis', async () => {
    expect(await verdict('src/ui/exemple.ts', '../test/create-test-store')).toEqual([
      refus('ui', 'test'),
    ]);
    expect(await verdict('src/ui/exemple.ts', '../data/e2e/e2e-fixtures')).toEqual([]);
  });
});
