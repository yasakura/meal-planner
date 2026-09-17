# ADR 0043 — Ce que chaque garde-fou attrape, mesuré

- **Statut** : en vigueur
- **Date** : 2026-09-09
- **Portée** : `CLAUDE.md`, `.github/ISSUE_TEMPLATE/finding.md`, `stryker.conf.mjs`
- **Issues** : [#165](https://github.com/yasakura/meal-planner/issues/165),
  [#156](https://github.com/yasakura/meal-planner/issues/156)

## Contexte

Le dépôt empile des garde-fous depuis juin 2026 : frontières ESLint, tests d'architecture, cliquets
de couverture et de complexité, mutation testing, scénarios Playwright, vérification navigateur,
revue de code indépendante. Aucun n'avait jamais été évalué sur ce qu'il **attrape réellement**.

La règle du projet — _un garde-fou qu'on n'a jamais vu échouer n'est pas un garde-fou_ — se retourne
en mesure : lesquels ont mordu depuis leur introduction ?

## La mesure

226 commits, 87 issues (60 fermées, 27 ouvertes), du 2026-06-12 au 2026-08-31. Attribution par la
ligne de provenance que portent les issues (« Relevé par `/code-review` sur… », « Trouvé pendant la
vérification navigateur de… »).

| Garde-fou                      | Findings attribués | Ce qu'il attrape                                    |
| ------------------------------ | -----------------: | --------------------------------------------------- |
| **Revue de code indépendante** |             **13** | Tests validant la mauvaise intention, messages faux |
| **Vérification navigateur**    |              **7** | Impasses sans sortie, constats survivants           |
| Lint / gardes statiques        |                  3 | Dont **deux contre les gardes eux-mêmes**           |
| Mutation testing               |                  3 | _Aucun défaut de production — voir ci-dessous_      |
| Cliquets de couverture         |                  2 | Zones non couvertes, révélées **à la pose**         |
| Playwright                     |                  1 | Course contre une animation                         |
| Utilisateur                    |                  1 | Constaté sur une preview                            |

Un premier passage comptait des **co-occurrences de mots** et créditait la mutation de 32 findings —
l'issue #165, « la mesure de mutation ment par timeouts », y comptait comme _trouvée par_ la
mutation. L'instrument a été refait sur la ligne de provenance avant d'être rapporté.

## Le résultat qui décide

Les trois findings de la mutation portent sur **elle-même** : la notice de sa propre commande était
fausse, une de ses directives était inerte, un écart de convention. Aucun ne porte sur un défaut de
production.

Et deux cas documentés vont dans l'autre sens :

- commit `1c380a7` — un garde inatteignable vivait dans un fichier à « 100 % de mutation, zéro
  survivant ». Trouvé par la revue ;
- commit `762232f` — « aucun filet du dépôt ne voyait la différence, et **la mutation ne pouvait pas
  aider** : l'outil ne génère aucun mutant pour cette forme ».

Toutes les autres occurrences du mot « survivant » dans les 226 commits sont des **rapports de zéro
survivant**.

## Ce que la mesure ne sait pas voir

Trois limites, à ne pas escamoter — elles interdisent de conclure « la mutation est inutile ».

1. **La prévention est invisible.** Un outil de mutation agit surtout en amont : on écrit des tests
   serrés parce qu'on sait qu'il va passer. Les trous qui n'ont jamais existé ne laissent aucune
   trace, et aucune mesure a posteriori ne distingue un détecteur sans rien à détecter d'un
   détecteur aveugle.
2. **Il a agi comme contrainte de conception.** [ADR 0011](0011-les-decisions-vivent-dans-des-fichiers-mutes.md)
   — « une décision vit dans un `.ts` muté » — vient entièrement de lui. C'est une influence, pas un
   finding.
3. **Il était déréglé sur toute la période** ([ADR 0042](0042-la-concurrence-de-stryker-est-declaree.md)).
   On ne juge pas le rendement d'un instrument qu'on sait faussé.

**58 issues sur 87 ne portaient aucune provenance.** Le classement ci-dessus est donc un **rang
fiable, pas un compte exact**.

## Décision

1. **La provenance devient obligatoire** sur toute issue, en première ligne, avec un vocabulaire
   fermé — les dix valeurs que la mesure a réellement observées. Sans elle, on ne peut pas savoir
   quel garde-fou attrape quoi, donc pas savoir lequel supprimer.
2. **Tout survivant de mutation qui entraîne un changement part en issue**, même corrigé dans le
   cycle, avec son verdict. C'est la seule façon de refermer l'angle mort n°1 ci-dessus.
3. **La mutation est démotée, pas supprimée** : déclenchement mécanique sur le `diff`, un seul run
   avant commit au lieu d'un par tour de rebouclage. Elle reste dans la DoD.
4. **Ni la vérification navigateur ni Playwright ne sont rabotées.** La première a 7 findings à son
   actif et voit ce que jsdom ne peut structurellement pas voir ; la seconde a pour objet le
   balayage **non ciblé**, qu'un run partiel détruirait.

## Conséquences

- **La question « le mutation testing sert-il encore ? » reste ouverte**, et c'est délibéré. Elle se
  rejugera sur des données propres — réglage corrigé, provenance obligatoire, issue par survivant —
  après deux à trois mois.
- **La revue de code indépendante est le filet à plus fort rendement du dépôt.** Elle attrape une
  classe que rien d'autre ne voit : le test faux. Un test faux est vert, et un mutant tué par un test
  faux est un mutant tué.
- **Deux gardes ont été trouvés inertes** par cette famille de mesures ([ADR 0015](0015-frontieres-de-couches-inertes.md)).
  Le coût d'un garde-fou qui ne mord pas n'est pas nul : il rassure.
- Le coût du dispositif a été mesuré au passage : 7 581 lignes de production contre 23 338 de filet,
  et **44 % des itérations mergées (35 sur 79) servaient la machinerie elle-même**.
