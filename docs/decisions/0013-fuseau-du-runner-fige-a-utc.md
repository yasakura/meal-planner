# ADR 0013 — Fuseau du runner figé à UTC, au niveau du processus

- **Statut** : en vigueur
- **Date** : 2026-08-19 (`3554110`)
- **Portée** : `vitest.config.ts`, `src/test/runner-timezone.test.ts`

## Contexte

Sans fuseau imposé, la suite hérite de celui de la machine : `Europe/Paris` sur un poste français,
`UTC` sur un runner GitHub. Deux exécutions qui **ne mesurent pas la même chose**.

Deux garde-fous en dépendaient, **en sens opposés** — donc l'un des deux mentait toujours :

1. les tests de changement d'heure de `domain/entities/calendar-date.test.ts`, dont
   l'implémentation est ancrée sur UTC ([ADR 0007](0007-date-civile-ancree-sur-utc.md)) et donc
   insensible au fuseau ;
2. le mutant qui **vide les options** de `Intl.DateTimeFormat` dans `src/data/system-clock.ts`,
   **indistinguable sous `Europe/Paris`**.

UTC tranche pour le second et ne coûte rien au premier.

## Décision

`process.env.TZ = 'UTC'` est posé **au niveau du processus**, en tête de `vitest.config.ts`, avant
tout démarrage de worker — et **non** dans `test.env`.

La raison est mesurable : **`test.env` ne couvre que les workers que Vitest démarre lui-même**. Le
runner Vitest de **Stryker** n'en héritait pas et mesurait sous le fuseau de la machine.

## La mesure

Sur un poste à Paris, run **isolé** de `src/data/system-clock.ts` :

| Configuration                      | Score                       |
| ---------------------------------- | --------------------------- |
| `test.env` seul                    | 90 % (1 survivant)          |
| `process.env.TZ` en tête de config | **100 %** (10 mutants tués) |

Chiffres repris du commentaire de `vitest.config.ts`, qui ne les date pas, et de
`src/test/runner-timezone.test.ts`, qui les date du 2026-08-17 — **non re-vérifiés à la
rédaction**, et cette date-là est **écartée** : elle est impossible. Le fichier mesuré et la ligne
`process.env.TZ` sont nés ensemble le 2026-08-19, dans `3554110`
(`git log --diff-filter=A -- src/data/system-clock.ts`) ; rien de ce qu'on mesure ici n'existait
avant. La mesure n'est donc pas antérieure à cette date, et faute de pouvoir la dater mieux, elle
est citée sans date.

Posé au niveau du processus, il couvre les deux runners — et `test.env` devient une ligne que plus
rien n'exige.

## Conséquences

- Cette ligne n'est référencée par **aucun import** : rien ne la retient, et son retrait ne casse
  rien de visible. C'est précisément le danger — la suite reste verte pendant que deux garde-fous se
  dégradent en silence.
- Elle est donc tenue par un garde dédié, `src/test/runner-timezone.test.ts`, qui asserte
  `Intl.DateTimeFormat().resolvedOptions().timeZone === 'UTC'`. Il vit dans `src/test/` et non dans
  l'un des deux fichiers concernés : c'est un invariant du **runner**, dont les deux dépendent
  également.
- Corollaire pour toute future mesure : **un instrument de mesure se confronte à un cas dont on
  connaît la réponse d'avance, et se re-confronte à chaque modification de sa configuration.**
- Autre borne du runner, même fichier : `include: ['src/**/*.{test,spec}.{ts,tsx}']`. Sans elle, les
  globs par défaut de Vitest balayent tout le dépôt et embarquent `e2e/*.spec.ts` — Playwright n'est
  pas un runner Vitest (mesuré le 2026-08-17 : **4 fichiers en échec**). L'`exclude: ['e2e/**']` qui
  l'accompagne est redondant **à dessein** : `include` dit où sont les tests, `exclude` **nomme** le
  répertoire qui ne doit jamais passer par là.
