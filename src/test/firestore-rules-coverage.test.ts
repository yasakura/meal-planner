import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const SRC = resolve(__dirname, '..');
const RULES_FILE = resolve(__dirname, '../../firestore.rules');

function collectDataFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectDataFiles(full));
    } else if (/\.ts$/.test(entry) && !/\.test\.ts$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

function collectionsUsedIn(source: string): string[] {
  const names: string[] = [];
  const callRegex = /\b(?:collection|doc)\(\s*[^,()]+,\s*['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = callRegex.exec(source)) !== null) {
    if (match[1]) names.push(match[1]);
  }
  return names;
}

function collectionsDeclaredInRules(rules: string): Set<string> {
  const declared = new Set<string>();
  const matchRegex = /match\s+\/([A-Za-z0-9_-]+)\/\{/g;
  let match: RegExpExecArray | null;
  while ((match = matchRegex.exec(rules)) !== null) {
    if (match[1]) declared.add(match[1]);
  }
  return declared;
}

describe('Couverture des Security Rules Firestore', () => {
  it('toute collection utilisée dans src/data possède un bloc match dans firestore.rules', () => {
    const rules = readFileSync(RULES_FILE, 'utf-8');
    const declared = collectionsDeclaredInRules(rules);

    const manquantes = new Set<string>();
    for (const file of collectDataFiles(join(SRC, 'data'))) {
      for (const name of collectionsUsedIn(readFileSync(file, 'utf-8'))) {
        if (!declared.has(name)) {
          manquantes.add(`${relative(SRC, file)} utilise « ${name} »`);
        }
      }
    }

    expect(
      [...manquantes],
      `Collections sans bloc match dans firestore.rules :\n${[...manquantes].join('\n')}\n` +
        `Déclarées : ${[...declared].join(', ') || '(aucune)'}`,
    ).toHaveLength(0);
  });

  it('détecte réellement une collection non déclarée', () => {
    const reglesAmputees = readFileSync(RULES_FILE, 'utf-8').replace(
      /match\s+\/convives\/\{[^}]*\}[^}]*\}/s,
      '',
    );

    const declared = collectionsDeclaredInRules(reglesAmputees);

    expect(declared.has('recipes')).toBe(true);
    expect(declared.has('convives')).toBe(false);
  });
});
