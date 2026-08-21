# ADR 0012 — Configurations Stryker mesurées et écartées

- **Statut** : en vigueur — **ne pas retenter les pistes ci-dessous**
- **Date** : mesures du 2026-08-13 et du 2026-08-17 ; run isolé corrigé le 2026-08-18 (`6d1639d`)
- **Portée** : `stryker.conf.mjs`, `package.json`

## Contexte

Le score de mutation global **n'est pas reproductible**. Un même mutant est compté « tué par
timeout » ou « survivant » selon la charge de la machine, et **Stryker compte un timeout comme un
mutant tué** : le score global est donc structurellement **optimiste**, et un survivant réel peut
s'y cacher.

Le réflexe naturel — élargir `timeoutMS`, réduire la concurrence — a été essayé. Il ne marche pas,
et il coûte cher en temps de run.

## La mesure

Toutes sur le **même commit**, 2026-08-13, fichier `convives-slice.ts` :

| Configuration                         | Durée    | Score                    | Timeouts | Survivants |
| ------------------------------------- | -------- | ------------------------ | -------- | ---------- |
| défaut (21 workers, `timeoutMS` 10 s) | 5 min 30 | 100,00 %                 | 7        | 0          |
| 21 workers, `timeoutMS` 30 s          | 6 min 57 | 96,08 %                  | 5        | 2          |
| 8 workers, `timeoutMS` 30 s           | ~29 min  | abandonné (5× plus lent) | —        | —          |
| **run isolé** (la vérité)             | ~2 min   | **92,16 %**              | **0**    | **4**      |

Élargir la borne rapproche de la vérité **sans la rejoindre** : certains mutants ne frôlent pas le
seuil, ils **bloquent franchement** sous parallélisme — vider un préfixe de type d'action empêche un
reducer de matcher, et un `await` de test reste alors sans réponse. Un blocage franc expire quelle
que soit la borne.

**Piste supplémentaire, testée le 2026-08-17 et écartée** : désactiver les mutants de préfixe de
type d'action (les `// Stryker disable` des slices) devait supprimer la source des blocages. Mesuré
sur le run global : **48 → 42 timeouts** seulement. Ils viennent donc massivement d'ailleurs, et la
non-reproductibilité reste entière.

## Décision

1. **`timeoutMS: 10000` et la concurrence par défaut restent.** Les alternatives sont mesurées et
   plus mauvaises.
2. **Le run isolé fait foi**, sur machine au repos, pour tout fichier modifié dans un cycle. Le
   global ne vaut que comme **signal de fumée**.
3. **`npx stryker run --mutate '<fichier>'` seul n'isole PAS.** Avec `incremental: true`, Stryker
   relit `reports/` et **fusionne les résultats en cache de tous les autres fichiers** dans le
   tableau et dans le score : le chiffre affiché reste plausible, mais ce n'est pas celui du fichier
   demandé. Le script `npm run test:mutation:isolated` détourne le cache vers un fichier jetable
   **et le supprime avant chaque run** — sans cette suppression, le fichier jetable redevient un
   cache. `--no-incremental` **n'existe pas**, et `--force` reconstruirait le cache réel en le
   limitant au fichier ciblé, détruisant l'incrémental des autres.
4. **Le run isolé règle la fusion, pas les timeouts.** Un fichier peut sortir à 100 % **avec** des
   timeouts. Un score isolé s'annonce donc toujours **avec son nombre de timeouts**, jamais nu ; un
   chiffre assorti de timeouts inattendus se rejoue au repos avant d'être rapporté.
5. **Un run ne se lance pas pendant qu'autre chose occupe la machine** — suite de tests, build,
   serveur de dev, autre agent. Sous charge, l'erreur va dans le sens dangereux.

## Conséquences

- `incremental: true` mémorise le statut de chaque mutant, **`Timeout` compris** : un mutant expiré
  une fois reste crédité tant que son fichier ne bouge pas. Le rejeu à froid est ce qui lui rend sa
  chance.
- L'état incrémental vit dans `reports/`, **gitignoré** : le bénéfice est **local**.
- La mutation **ne tourne pas en CI** (job retiré le 2026-08-20, `3cb3350`). Le seul check requis
  est `Lint + Test + Build`. Le gate `break: 80` est une discipline de poste de travail, pas un
  garde-fou de la forge.
- Les adapters du mode e2e (`src/data/e2e/**`) sont **exclus du `mutate`** : c'est de l'infra de
  scénario, éliminée du bundle de production ([ADR 0016](0016-mode-e2e-embarque.md)). Les muter
  mesurerait la solidité de l'outillage, pas celle du produit.
