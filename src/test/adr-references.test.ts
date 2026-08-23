import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = resolve(__dirname, '../..');
const DOCS = join(ROOT, 'docs');

function collectMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectMarkdownFiles(full));
    } else if (entry.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

function withoutFencedBlocks(markdown: string): string {
  return markdown.replace(/^ *```[\s\S]*?^ *```/gm, '');
}

function lineAnchorsIn(markdown: string): string[] {
  const anchors = /[A-Za-z0-9_./-]+\.(?:tsx?|jsx?|mjs|json|rules|yml|md):\d+/g;
  return withoutFencedBlocks(markdown).match(anchors) ?? [];
}

function symbolReferencesIn(markdown: string): string[] {
  const references = /[A-Za-z0-9_./-]+\.(?:tsx?|jsx?|mjs|json|rules|yml)#[A-Za-z_][A-Za-z0-9_]*/g;
  return markdown.match(references) ?? [];
}

function unresolvedIn(references: string[], read: (file: string) => string | undefined): string[] {
  const broken: string[] = [];
  for (const reference of references) {
    const [file, symbol] = reference.split('#');
    const source = read(file as string);
    if (source === undefined) {
      broken.push(`${reference} — fichier introuvable`);
    } else if (!new RegExp(`\\b${symbol as string}\\b`).test(source)) {
      broken.push(`${reference} — symbole absent`);
    }
  }
  return broken;
}

function readFromRoot(file: string): string | undefined {
  const full = join(ROOT, file);
  return existsSync(full) ? readFileSync(full, 'utf-8') : undefined;
}

describe('Références des ADR vers le code', () => {
  it('aucun ADR ne désigne le code par un numéro de ligne, hors sortie d’outil citée en bloc', () => {
    const fautives: string[] = [];
    for (const doc of collectMarkdownFiles(DOCS)) {
      for (const anchor of lineAnchorsIn(readFileSync(doc, 'utf-8'))) {
        fautives.push(`${relative(ROOT, doc)} : ${anchor}`);
      }
    }

    expect(
      fautives,
      `Un numéro de ligne dérive en silence. Désigne le symbole :\n${fautives.join('\n')}`,
    ).toHaveLength(0);
  });

  it('toute référence « fichier#symbole » d’un ADR désigne un symbole qui existe', () => {
    const fautives: string[] = [];
    for (const doc of collectMarkdownFiles(DOCS)) {
      const references = symbolReferencesIn(readFileSync(doc, 'utf-8'));
      for (const rupture of unresolvedIn(references, readFromRoot)) {
        fautives.push(`${relative(ROOT, doc)} : ${rupture}`);
      }
    }

    expect(fautives, `Références d’ADR rompues :\n${fautives.join('\n')}`).toHaveLength(0);
  });

  it('gage du garde de lignes : un numéro de ligne écrit en prose est NOMMÉ, celui d’une trace citée en bloc est laissé', () => {
    const markdown = [
      '`src/config/firebase.ts:23` initialise par `getFirestore(app)`.',
      '',
      '```',
      'TypeError: window.matchMedia is not a function',
      '  ❯ prefersReducedMotion src/ui/AccountSheet.tsx:90:45',
      '```',
    ].join('\n');

    expect(lineAnchorsIn(markdown)).toEqual(['src/config/firebase.ts:23']);
  });

  it('gage du garde de symboles : une référence #symbole est relevée jusque dans un bloc de code, là où un numéro de ligne y est laissé', () => {
    const markdown = [
      '```ts',
      '// src/domain/entities/ingredient.ts#createIngredient',
      '// src/ui/features/recipe/ingredient-rows.ts:15',
      '```',
    ].join('\n');

    expect(symbolReferencesIn(markdown)).toEqual([
      'src/domain/entities/ingredient.ts#createIngredient',
    ]);
    expect(lineAnchorsIn(markdown)).toEqual([]);
  });

  it('gage du garde de symboles : le symbole renommé est NOMMÉ, celui qui est resté ne l’est pas', () => {
    const references = symbolReferencesIn(
      '`src/test/architecture.test.ts#featureEdges` et `src/test/architecture.test.ts#featureNodes`',
    );

    expect(references).toEqual([
      'src/test/architecture.test.ts#featureEdges',
      'src/test/architecture.test.ts#featureNodes',
    ]);
    expect(unresolvedIn(references, () => 'function featureEdges() {}')).toEqual([
      'src/test/architecture.test.ts#featureNodes — symbole absent',
    ]);
  });

  it('gage du garde de symboles : un fichier déplacé est NOMMÉ comme introuvable', () => {
    expect(unresolvedIn(['src/config/firebase.ts#getFirestore'], () => undefined)).toEqual([
      'src/config/firebase.ts#getFirestore — fichier introuvable',
    ]);
    expect(readFromRoot('src/config/firebase.ts')).toContain('getFirestore');
  });
});
