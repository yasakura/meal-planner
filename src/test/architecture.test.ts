import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import * as ts from 'typescript';
import { describe, it, expect } from 'vitest';

const ROOT = resolve(__dirname, '..');

const FEATURES_DIR = join(ROOT, 'ui', 'features');

const FORBIDDEN_IN_DOMAIN = [
  'react',
  'react-dom',
  'react-router-dom',
  '@reduxjs/toolkit',
  'react-redux',
  'styled-components',
  'firebase',
  'date-fns',
];

const FORBIDDEN_IN_DATA = [
  'react',
  'react-dom',
  'react-router-dom',
  '@reduxjs/toolkit',
  'react-redux',
  'styled-components',
];

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

function moduleSpecifierOf(node: ts.Node): ts.Expression | undefined {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return node.moduleSpecifier;
  if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword)
    return node.arguments[0];
  return undefined;
}

function typeImportSpecifierOf(node: ts.Node): ts.Expression | undefined {
  if (!ts.isImportTypeNode(node) || !ts.isLiteralTypeNode(node.argument)) return undefined;
  return node.argument.literal;
}

function extractImports(source: string, file: string): string[] {
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, false);
  const specifiers: string[] = [];
  const visit = (node: ts.Node): void => {
    const specifier = moduleSpecifierOf(node) ?? typeImportSpecifierOf(node);
    if (specifier && ts.isStringLiteral(specifier)) specifiers.push(specifier.text);
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  return specifiers;
}

function matchesForbidden(specifier: string, forbidden: string[]): boolean {
  return forbidden.some((f) => specifier === f || specifier.startsWith(`${f}/`));
}

function collectFeatureFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectFeatureFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

function featureOf(file: string): string | undefined {
  const rel = relative(FEATURES_DIR, file);
  return rel.startsWith('..') ? undefined : rel.split(sep)[0];
}

function featureEdges(): Map<string, Map<string, string[]>> {
  const edges = new Map<string, Map<string, string[]>>();
  for (const file of collectFeatureFiles(FEATURES_DIR)) {
    const from = featureOf(file);
    if (from === undefined) continue;
    for (const spec of extractImports(readFileSync(file, 'utf-8'), file)) {
      if (!spec.startsWith('.')) continue;
      const to = featureOf(resolve(dirname(file), spec));
      if (to === undefined || to === from) continue;
      const targets = edges.get(from) ?? new Map<string, string[]>();
      targets.set(to, [...new Set([...(targets.get(to) ?? []), relative(ROOT, file)])]);
      edges.set(from, targets);
    }
  }
  return edges;
}

function findCycle(edges: Map<string, Map<string, string[]>>): string[] | undefined {
  const visited = new Set<string>();
  const path: string[] = [];

  const visit = (node: string): string[] | undefined => {
    const openedAt = path.indexOf(node);
    if (openedAt !== -1) return [...path.slice(openedAt), node];
    if (visited.has(node)) return undefined;
    visited.add(node);
    path.push(node);
    for (const next of edges.get(node)?.keys() ?? []) {
      const cycle = visit(next);
      if (cycle) return cycle;
    }
    path.pop();
    return undefined;
  };

  for (const node of edges.keys()) {
    const cycle = visit(node);
    if (cycle) return cycle;
  }
  return undefined;
}

function describeCycle(cycle: string[], edges: Map<string, Map<string, string[]>>): string {
  const arrows = cycle.slice(1).map((to, index) => {
    const from = cycle[index] as string;
    return `  ${from} \u2192 ${to} : ${edges.get(from)?.get(to)?.join(', ')}`;
  });
  return `Cycle entre features : ${cycle.join(' \u2192 ')}\n${arrows.join('\n')}`;
}

describe('Architecture boundaries', () => {
  it('src/domain ne doit jamais importer React, Redux, Firebase, styled-components, date-fns', () => {
    const domainDir = join(ROOT, 'domain');
    const files = collectSourceFiles(domainDir);
    const violations: string[] = [];
    for (const file of files) {
      const specifiers = extractImports(readFileSync(file, 'utf-8'), file);
      for (const spec of specifiers) {
        if (matchesForbidden(spec, FORBIDDEN_IN_DOMAIN)) {
          violations.push(`${relative(ROOT, file)} importe ${spec}`);
        }
      }
    }
    expect(violations, `Violations dans domain/ :\n${violations.join('\n')}`).toHaveLength(0);
  });

  it('src/data ne doit jamais importer React, Redux, styled-components', () => {
    const dataDir = join(ROOT, 'data');
    const files = collectSourceFiles(dataDir);
    const violations: string[] = [];
    for (const file of files) {
      const specifiers = extractImports(readFileSync(file, 'utf-8'), file);
      for (const spec of specifiers) {
        if (matchesForbidden(spec, FORBIDDEN_IN_DATA)) {
          violations.push(`${relative(ROOT, file)} importe ${spec}`);
        }
      }
    }
    expect(violations, `Violations dans data/ :\n${violations.join('\n')}`).toHaveLength(0);
  });

  it("les dossiers de src/ui/features ne doivent pas former de cycle d'imports directs entre eux", () => {
    const edges = featureEdges();
    const cycle = findCycle(edges);
    expect(cycle, cycle ? describeCycle(cycle, edges) : '').toBeUndefined();
  });

  it('gage du garde de cycles : findCycle NOMME un cycle construit exprès, et describeCycle imprime les fichiers qui portent chaque arête', () => {
    const edges = new Map([
      ['a', new Map([['b', ['ui/features/a/A.ts']]])],
      ['b', new Map([['a', ['ui/features/b/B.test.tsx']]])],
    ]);

    const cycle = findCycle(edges);

    expect(cycle).toEqual(['a', 'b', 'a']);
    expect(describeCycle(cycle as string[], edges)).toBe(
      'Cycle entre features : a \u2192 b \u2192 a\n' +
        '  a \u2192 b : ui/features/a/A.ts\n' +
        '  b \u2192 a : ui/features/b/B.test.tsx',
    );
  });

  it("gage du garde de cycles : un chemin qui sort des features n'est pas une arête — recipe-detail importe ui/store, ui/store importe recipe, et le graphe ne relie pas recipe-detail à recipe", () => {
    const sliceFile = join(FEATURES_DIR, 'recipe-detail', 'recipe-detail-slice.ts');
    const storeFile = join(ROOT, 'ui', 'store', 'store.ts');

    expect(extractImports(readFileSync(sliceFile, 'utf-8'), sliceFile)).toContain(
      '../../store/store',
    );
    expect(extractImports(readFileSync(storeFile, 'utf-8'), storeFile)).toContain(
      '../features/recipe/recipe-edit-slice',
    );
    expect(featureEdges().get('recipe-detail')?.get('recipe')).toBeUndefined();
  });

  it('gage du garde de cycles : le graphe est construit sur les fichiers réels des features, .tsx compris', () => {
    expect(featureEdges().get('recipe')?.get('recipe-detail')).toContain(
      join('ui', 'features', 'recipe', 'RecipeEditContainer.tsx'),
    );
  });

  it("gage d'instrument : extractImports capture l'import statique, type-only, le ré-export, l'import dynamique et typeof import()", () => {
    const source = [
      "import { a } from './a';",
      "import type { B } from './b';",
      "export { c } from './c';",
      "const d = await import('./d');",
      "type E = typeof import('./e');",
    ].join('\n');

    expect(extractImports(source, join(ROOT, 'domain', 'exemple.ts'))).toEqual([
      './a',
      './b',
      './c',
      './d',
      './e',
    ]);
  });

  it("gage d'instrument : un .ts est analysé en TS — une arrow générique ne masque pas les imports qui la suivent", () => {
    const source = [
      "import { a } from './a';",
      'const id = <T>(x: T): T => x;',
      "const d = await import('./d');",
    ].join('\n');

    expect(extractImports(source, join(ROOT, 'domain', 'exemple.ts'))).toEqual(['./a', './d']);
  });

  it("gage d'instrument : extractImports voit l'import du fichier et ignore les chemins cités en commentaire ou en chaîne", () => {
    const source = [
      "import { RecipeDetailScreen } from './RecipeDetailScreen';",
      "// avant, ce module était importé from '../recipe/recipe-for-route'",
      'const legende = \'importé from "../recipe/legacy"\';',
    ].join('\n');

    expect(extractImports(source, join(FEATURES_DIR, 'recipe-detail', 'Exemple.tsx'))).toEqual([
      './RecipeDetailScreen',
    ]);
  });

  it("gage du garde de domain/ : un await import('firebase/firestore') est une violation", () => {
    const specifiers = extractImports(
      "export async function lire() {\n  await import('firebase/firestore');\n}",
      join(ROOT, 'domain', 'exemple.ts'),
    );

    expect(specifiers.filter((spec) => matchesForbidden(spec, FORBIDDEN_IN_DOMAIN))).toEqual([
      'firebase/firestore',
    ]);
  });

  it("gage du garde de data/ : un await import('styled-components') est une violation", () => {
    const specifiers = extractImports(
      "export async function styler() {\n  await import('styled-components');\n}",
      join(ROOT, 'data', 'exemple.ts'),
    );

    expect(specifiers.filter((spec) => matchesForbidden(spec, FORBIDDEN_IN_DATA))).toEqual([
      'styled-components',
    ]);
  });

  it("gage du garde de cycles : un await import('../recipe/…') depuis recipe-detail désigne la feature recipe", () => {
    const file = join(FEATURES_DIR, 'recipe-detail', 'RecipeDetailContainer.tsx');
    const specifiers = extractImports(
      "export async function charger() {\n  await import('../recipe/ingredient-rows');\n}",
      file,
    );

    expect(specifiers.map((spec) => featureOf(resolve(dirname(file), spec)))).toEqual(['recipe']);
  });
});
