import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = resolve(__dirname, '..');

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
});
