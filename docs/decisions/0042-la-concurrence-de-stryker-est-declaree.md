# ADR 0042 — La concurrence de Stryker est déclarée, pas subie

- **Statut** : en vigueur — remplace la décision 1 de
  [ADR 0012](0012-configurations-stryker-ecartees.md)
- **Date** : 2026-09-10
- **Portée** : `stryker.conf.mjs`
- **Issues** : [#165](https://github.com/yasakura/meal-planner/issues/165), qui porte la mesure ;
  [#156](https://github.com/yasakura/meal-planner/issues/156), dont elle donne la cause

## Contexte

[ADR 0012](0012-configurations-stryker-ecartees.md) décidait de **garder la concurrence par
défaut**, au motif que les alternatives étaient « mesurées et plus mauvaises ». Cette décision
portait le statut « ne pas retenter les pistes ci-dessous ».

Elle est fausse, et la raison tient en une phrase : **l'essai de 2026-08-13 faisait varier deux
paramètres à la fois**. Il testait « 8 workers **et** `timeoutMS` à 30 s », mesurait un run cinq
fois plus lent, et en concluait que réduire la concurrence ne valait rien. La borne de timeout
portait le coût ; la concurrence a été condamnée avec elle.

Le défaut de Stryker est `n-1` workers, où `n` est le nombre de cœurs logiques, sauf si `n <= 4`
auquel cas c'est `n` (source : `concurrency` dans le schéma d'options de `@stryker-mutator/core`).
Non déclaré, il fait donc dépendre **le résultat de la mesure** de la machine qui la rend.

## La mesure

Relevée dans [#165](https://github.com/yasakura/meal-planner/issues/165), pendant le lot
`liste-de-courses`, un seul paramètre modifié :

| Fichier                                    | Concurrence par défaut                           | `--concurrency 4`                   |
| ------------------------------------------ | ------------------------------------------------ | ----------------------------------- |
| `src/domain/use-cases/liste-de-courses.ts` | **100 %**, 7 à 21 timeouts — neuf runs, jamais 0 | **98,21 %**, 0 timeout, 1 survivant |
| `src/ui/features/menu/menu-slice.ts`       | **100 %**, 5 timeouts                            | **99,43 %**, 0 timeout, 1 survivant |

**Les deux survivants étaient invisibles au chiffre par défaut**, un timeout étant compté comme un
mutant tué. Et le run bridé est **plus rapide** : 30 secondes contre plusieurs minutes.

L'instrument a été confronté avant d'être utilisé, à deux cas dont la réponse était connue
d'avance : `src/ui/features/quantites/quantite-affichee.ts#quantiteAffichee` → 100 %, 16/16,
0 timeout ; `src/domain/use-cases/liste-de-courses.ts#listeDeCourses` → 98,21 %, survivant
reproduit à l'identique.

## Le corpus a été mesuré sur une autre machine

Constaté le 2026-09-10, et c'est la raison profonde de cette ADR.

[ADR 0012](0012-configurations-stryker-ecartees.md) écrit « défaut (21 workers) » et
[#165](https://github.com/yasakura/meal-planner/issues/165) « cette machine (22 cœurs) ». Le poste
de travail d'aujourd'hui est un Apple M2 :

```
hw.ncpu / hw.physicalcpu / hw.logicalcpu : 8
```

Le défaut y vaut donc **7 workers**, pas 21. Tout le corpus de calibration Stryker du dépôt — ADR
0012, #165, #156 — décrit un poste qui n'est plus celui où le projet tourne. Les chiffres de
timeouts qu'il rapporte ne sont pas transposables tels quels.

C'est exactement ce qu'une concurrence non déclarée produit : une mesure qui change de sens quand
la machine change, sans que rien ne le signale.

## Décision

**`concurrency: 4` est déclaré dans `stryker.conf.mjs`.**

1. La valeur est **fixe et explicite**, pas déduite de la machine. Une mesure de mutation doit
   pouvoir se comparer d'un run à l'autre et d'un poste à l'autre ; un défaut variable l'en empêche.
2. `timeoutMS: 10000` **ne bouge pas**. C'est ce qui distingue cette décision de l'essai écarté par
   ADR 0012 : un seul paramètre change.
3. La valeur `4` a été retenue **sans être optimisée**. Elle vaut la moitié des cœurs de la machine
   actuelle et le cinquième de ceux du poste où la mesure a été prise. Elle est défendable, pas
   démontrée optimale.

## Ce que ADR 0012 garde

Seule sa **décision 1** est remplacée. Tout le reste demeure en vigueur, et rien ici ne l'entame :

- le run isolé fait foi, le global n'est qu'un signal de fumée ;
- `npx stryker run --mutate` seul n'isole pas, à cause du cache incrémental ;
- un score isolé s'annonce toujours avec son nombre de timeouts, jamais nu ;
- un run ne se lance pas pendant qu'autre chose occupe la machine.

Ce dernier point **reste entier**. Brider la concurrence retire la saturation que Stryker
s'infligeait à lui-même ; il ne protège de rien d'autre. Une suite de tests, un build ou un serveur
de dev qui tournent à côté faussent toujours la mesure.

## Conséquences

- **Le réglage n'a pas encore été re-confronté sur ce poste.** La règle du projet l'exige à chaque
  modification d'un instrument de mesure. Au 2026-09-10, la machine n'était pas au repos — charge
  mesurée entre 3,4 et 5,6 sur 8 cœurs, l'agent lui-même en faisant partie — et aucun chiffre
  n'a donc été produit. **Tant que cette confrontation n'a pas eu lieu, l'instrument est réglé mais
  pas gagé.**
- **Les scores de mutation antérieurs au 2026-09-10 sont à lire avec précaution.** Ils ont été
  rendus à concurrence par défaut, sur un poste à 22 cœurs, donc à 21 workers : les timeouts qu'ils
  rapportent, et les 100 % qui les accompagnent, appartiennent à ce contexte.
- **Une mesure de mutation qui change de machine change de sens.** Si le poste change à nouveau, la
  valeur fixe garde la comparabilité des runs — mais le rapport entre 4 workers et les cœurs
  disponibles, lui, se déplace. C'est le prix assumé d'un chiffre fixe contre un pourcentage.
- `concurrency` accepte aussi une **chaîne de pourcentage** (`'50%'`), qui s'adapterait à la
  machine. Écartée ici au profit d'une valeur fixe, pour la raison donnée en décision 1. La piste
  est notée, pas condamnée.
