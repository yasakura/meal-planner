import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
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
  // `CalendarDate` est une date civile ancrée sur UTC : le domaine n'a aucune bibliothèque de
  // date, et un `addDays` importé la rendrait inutile. Permis dans `ui/` pour le formatage.
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

function extractImports(source: string): string[] {
  const importRegex = /(?:import|from)\s+['"]([^'"]+)['"]/g;
  const specifiers: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(source)) !== null) {
    if (match[1]) specifiers.push(match[1]);
  }
  return specifiers;
}

function matchesForbidden(specifier: string, forbidden: string[]): boolean {
  return forbidden.some((f) => specifier === f || specifier.startsWith(`${f}/`));
}

// Contrairement à `collectSourceFiles`, les fichiers de test sont inclus : un cycle refermé
// depuis un `.test.tsx` reste un cycle.
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

/** feature source -> feature cible -> fichiers qui portent l'arête. */
function featureEdges(): Map<string, Map<string, string[]>> {
  const edges = new Map<string, Map<string, string[]>>();
  for (const file of collectFeatureFiles(FEATURES_DIR)) {
    const from = featureOf(file);
    if (from === undefined) continue;
    for (const spec of extractImports(readFileSync(file, 'utf-8'))) {
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

/** Premier cycle rencontré, sous la forme `[a, b, ..., a]`. */
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
      const specifiers = extractImports(readFileSync(file, 'utf-8'));
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
      const specifiers = extractImports(readFileSync(file, 'utf-8'));
      for (const spec of specifiers) {
        if (matchesForbidden(spec, FORBIDDEN_IN_DATA)) {
          violations.push(`${relative(ROOT, file)} importe ${spec}`);
        }
      }
    }
    expect(violations, `Violations dans data/ :\n${violations.join('\n')}`).toHaveLength(0);
  });

  it('les dossiers de src/ui/features ne doivent pas former de cycle', () => {
    const edges = featureEdges();
    const cycle = findCycle(edges);
    expect(cycle, cycle ? describeCycle(cycle, edges) : '').toBeUndefined();
  });

  // Le garde ci-dessus est vert aujourd'hui, et sa seule assertion est une absence. Les deux
  // tests suivants sont ses gages : sans eux, un détecteur qui ne détecte plus ou un walker
  // qui ne voit plus rien le rendraient vert pour toujours, et silencieusement inutile.
  it('findCycle nomme le cycle, et describeCycle imprime les fichiers qui portent chaque arête', () => {
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

  it('le graphe est construit sur les fichiers réels des features, .tsx compris', () => {
    expect(featureEdges().get('recipe')?.get('recipe-detail')).toContain(
      join('ui', 'features', 'recipe', 'RecipeEditContainer.tsx'),
    );
  });
});
