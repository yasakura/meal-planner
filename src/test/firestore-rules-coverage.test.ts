import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

// Firestore REFUSE par défaut toute collection qui n'a pas de bloc `match`. Un adapter
// neuf dont la collection n'est pas déclarée donne donc une feature verte en test
// unitaire et morte dans le navigateur — vécu sur FR-3, collection `convives` : 355 tests
// verts et écran cassé.
//
// Ce garde est le compensatoire de la décision « pas d'émulateur Java » (CLAUDE.md) :
// purement statique, aucune infra, il croise ce que `data/` utilise avec ce que
// `firestore.rules` déclare.
//
// Il ne dit RIEN de ce qui est réellement déployé : `firestore.rules` n'est la source de
// vérité qu'une fois poussé, et rien dans le repo ne le pousse.

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

/**
 * Repère les littéraux de collection passés au SDK Firestore : `collection(db, 'x')` et
 * `doc(db, 'x', id)`. Un nom construit dynamiquement échapperait à ce garde — c'est la
 * limite assumée d'une analyse statique, et une raison de garder ces littéraux en clair.
 */
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

    // Set et non tableau : une même collection est référencée par plusieurs appels dans
    // un même adapter (collection() pour la liste, doc() pour l'unité), et répéter la
    // ligne n'apprend rien de plus au lecteur du rapport d'échec.
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
    // Le garde ci-dessus est vert aujourd'hui. Sans ce second test, rien ne prouverait
    // qu'il sait virer au rouge : un croisement cassé (regex qui ne capture plus rien)
    // le rendrait vert pour toujours, et silencieusement inutile.
    const reglesAmputees = readFileSync(RULES_FILE, 'utf-8').replace(
      /match\s+\/convives\/\{[^}]*\}[^}]*\}/s,
      '',
    );

    const declared = collectionsDeclaredInRules(reglesAmputees);

    expect(declared.has('recipes')).toBe(true);
    expect(declared.has('convives')).toBe(false);
  });
});
