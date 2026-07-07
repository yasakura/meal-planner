---
name: Polish review — DESIGN.md
status: draft
created: 2026-07-01
project: meal-planner-bmad
target: "_bmad-output/planning-artifacts/ux-designs/ux-meal-planner-2026-06-18/DESIGN.md"
passes:
  - structure (bmad-editorial-review-structure)
  - prose (bmad-editorial-review-prose)
purpose: "DESIGN.md spec Google Labs pour app mobile Meal Planner — servira UX/Architecture/Implementation aval"
audience: "Sally UX, Winston Architecture, Amelia Dev, Lionel PM-dev"
reader_type: humans
language: fr
length_target: null
---

## Document Summary

- **Purpose:** Spec Google Labs (design system) pour l'app mobile Meal Planner — brief pour construction UI et cohérence UX/Architecture/Dev aval.
- **Audience:** Sally (UX), Winston (Architecture), Amelia (Dev), Lionel (PM-dev).
- **Reader type:** humains.
- **Structure model:** Reference/Database (spec canonique Google Labs). Ordre des sections figé par convention — aucun réordonnancement proposé.
- **Current length:** ~200 lignes, 8 sections canoniques + frontmatter YAML de tokens.
- **Overall verdict:** Le document est solide, la voix éditoriale tenue de bout en bout, la charpente Google Labs respectée. Une poignée de contradictions internes et d'ambiguïtés typographiques dégradent l'utilisabilité pour l'aval — corrigeables sans restructuration.

---

## Pass 1 — Structural Review

### Structure Recommendations

#### 1. QUESTION — Composants Pill « Ultra-simple » et Pill contextuelle
**Localisation :** L.181 et L.183 (section Components).
**Rationale :** Les deux composants partagent le même vocabulaire visuel (`accent-warm` pastel, meta label, `rounded/full`, marqueur d'orientation non-anxiogène). Le premier est un cas particulier du second (variante « Ultra-simple » de la Pill contextuelle). Deux entrées séparées suggèrent deux composants distincts au lecteur aval (Amelia va coder deux choses).
**Recommandation :** Fusionner en un composant unique `Pill contextuelle` avec sous-liste de variantes documentées : *(Ultra-simple, Convives, Magasin/soft-delete, État Catalogue…)*. Sinon, croiser explicitement les deux en disant « variante spécifique du pattern Pill contextuelle » sur Pill « Ultra-simple ».
**Impact :** ~40 mots consolidés + économie d'un composant à implémenter aval.

#### 2. QUESTION — Bloc YAML `components:` (frontmatter) duplique la section Components
**Localisation :** L.76-87 (frontmatter) vs L.166-183 (section Components).
**Rationale :** Le YAML `components:` liste chaque composant avec une description prose abrégée (`recette-card: 'Carte Recette — photo 16:9 top, titre serif New York Title 1, ingrédients en body, notes en italique meta.'`), qui est ensuite ré-énoncée avec plus de détail dans la section Components. Sans consommateur outillé identifié (design tokens tooling), c'est une redondance. Si tooling il y a *(Style Dictionary, Figma sync)*, garder — la prose YAML sert alors de source machine.
**Recommandation :** Trancher : (a) si tooling → garder mais aligner la prose YAML pour qu'elle soit strictement descriptive (pas d'anecdote) ; (b) si pas de tooling → couper le bloc YAML `components:` et laisser seule la section Components. Les autres blocs YAML *(colors, typography, spacing…)* restent — ce sont vraiment des tokens.
**Impact :** ~200 mots si (b) est retenu.

#### 3. QUESTION — Triple mention du Mode sombre
**Localisation :** frontmatter L.31-40 (tokens dark), L.101 (paragraphe Brand & Style), L.195 (ligne Do's/Don'ts).
**Rationale :** Trois traces différentes : tokens (définition machine), paragraphe (justification NFR-X5 + calibration hors-MVP), Do's/Don'ts (règle exécutable). Les trois ont des rôles distincts — pas une vraie redondance. Mais la ligne Do's/Don'ts et le paragraphe Brand & Style disent la même chose sous deux formes.
**Recommandation :** PRESERVE le paragraphe Brand & Style (contient la justification). Simplifier la ligne Do's/Don'ts pour qu'elle soit purement exécutable : « Mode clair seul au MVP » / « Activer le mode sombre au MVP ». La motivation vit déjà en amont.
**Impact :** ~10 mots + réduction du triple.

#### 4. QUESTION — Paragraphe « Éviter » de Colors chevauche Do's/Don'ts
**Localisation :** L.117 (paragraphe Éviter) et L.191 (ligne Do's/Don'ts « Cartes ombrées, fills colorés derrière du texte »).
**Rationale :** Le paragraphe « Éviter » de Colors énonce quatre interdictions *(rouges saturés, gradients, fills colorés derrière texte d'état, nuances multi-saturées)*. Deux d'entre elles remontent quasi-identiques dans Do's/Don'ts. C'est un léger doublon mais dans deux registres différents *(chromatique-spécifique vs. règles globales)*.
**Recommandation :** PRESERVE. Les deux vues servent — l'une contextualise dans Colors, l'autre synthétise. Vérifier juste que le contenu ne dérive pas si l'un est modifié.
**Impact :** 0 mots.

#### 5. PRESERVE — Deux registres visuels (Recettes vs. autres écrans)
**Localisation :** L.94-97 (Brand & Style).
**Rationale :** Cette bipartition manifeste (éditorial NYT sur Recettes / épure Bear sur écrans fonctionnels) structure tout le spec aval. Elle apparaît manifeste-forme dans Brand & Style et se manifeste ensuite dans les composants. Aucune coupure.
**Impact :** 0 mots — élément load-bearing.

#### 6. PRESERVE — Frontmatter YAML tokens (colors, typography, spacing, rounded)
**Rationale :** Ce sont des design tokens exportables, distincts de la prose. Redondance apparente avec les sections est en fait intentionnelle : machine-readable vs. human-readable. Le doublon des hex codes est standard Google Labs.
**Impact :** 0 mots.

### Structural Summary

- **Total structural recommendations:** 6 (2 QUESTION substantielles, 2 QUESTION mineures, 2 PRESERVE).
- **Cuts sévères proposés :** aucun.
- **Sections manquantes vs. canon Google Labs :** aucune (Brand & Style, Colors, Typography, Layout & Spacing, Elevation & Depth, Shapes, Components, Do's/Don'ts toutes présentes et dans l'ordre canonique).
- **Sections superflues :** aucune. Le frontmatter YAML `components:` est le seul candidat, sous réserve de tooling.

---

## Pass 2 — Prose Review

Passes de copy-edit selon Microsoft Writing Style Guide en français, sans toucher aux termes techniques anglais volontairement assumés *(hex, backdrop-filter, hairline, tokens, Slot, Repas, etc.)* ni aux italiques intentionnelles.

| Original Text | Revised Text | Changes |
|---|---|---|
| (L.101) `les tokens sombre sont définis pour permettre l'activation post-MVP` | `les tokens sombres sont définis pour permettre l'activation post-MVP` | Accord adjectif : "sombre" s'accorde au pluriel "tokens" → "sombres". |
| (L.195) `Mode clair seul au MVP, tokens sombre définis pour activation v2` | `Mode clair seul au MVP, tokens sombres définis pour activation v2` | Même erreur d'accord, deuxième occurrence. |
| (L.135) `pas de variantes italiques en hors-corps *(les italiques sont réservées aux notes manuscrites — voir Components)*` | `pas de variantes italiques en hors-corps *(les italiques sont réservées aux notes manuscrites de Recette, aux Slots libres, et aux items cochés de la Liste secondaire — voir Components)*` | **Contradiction interne** : la règle actuelle dit italiques réservées aux notes manuscrites, mais Components (L.173, L.175) utilise l'italique pour Slot libre et item coché. Élargir la règle pour refléter la réalité des composants. |
| (L.131) `Display : iOS Title 1 *(28pt regular, monté à Title XL pour les Recettes héro)*` | `Display : iOS Title 1 *(28pt regular, monté à iOS Large Title 34pt pour les Recettes héro)*` — OU spécifier la taille exacte en pt. | "Title XL" n'est pas un niveau iOS Dynamic Type standard. Ambigu pour Amelia (implémentation) et Sally (Figma). Aligner sur la nomenclature iOS *(Large Title)* ou donner un pt explicite. |
| (L.172) `En-tête : jour de la semaine + créneau en Title 2 sans + date en meta` | `En-tête : jour de la semaine + créneau en Title 2 sans-serif + date en meta` | "Title 2 sans" est ambigu — "sans" abréviation de "sans-serif" non introduite ailleurs. Écrire complet. |
| (L.173) `Cellule Slot *(dans un Repas)* — inline dans la Repas row` | `Cellule Slot *(dans un Repas)* — inline dans la ligne Repas` | Franglais article/nom ("la Repas row" mélange déterminant FR + tête EN). "ligne Repas" est déjà utilisé au singulier ailleurs — cohérence terminologique. |
| (L.175) `comme l'item principale, plus un toggle d'état à droite` | `comme l'Item Liste principale, plus un toggle d'état à droite` | Accord + désignation : "item" est masculin ("principal"), mais surtout il faut désigner explicitement le composant référencé *(Item Liste principale, majuscule d'entité)* — pas "l'item principale" qui laisse ambigu. |
| (L.144) `La densité sert la scan-rapide pendant la commande drive ou en magasin` | `La densité sert le scan rapide pendant la commande drive ou en magasin` — OU `La densité sert la lecture rapide…` | "la scan-rapide" est un anglicisme mal formé (scan = m., et le trait d'union crée un faux composé). Deux options : garder l'anglicisme "scan" masculin, ou passer à "lecture rapide". |
| (L.153) `L'ombre est réservée à un seul cas : la modale plein écran *(...)* portée par une overlay opaque ink-primary @ 50% opacity, jamais une ombre douce.` | `La seule séparation visuelle par-dessus le contenu est réservée à la modale plein écran *(...)* : un overlay opaque ink-primary @ 50% opacity, jamais une ombre douce.` | La formulation actuelle est auto-contradictoire : "L'ombre est réservée… un overlay… jamais une ombre douce". Le lecteur doit reconstruire l'intention (overlay opaque remplace le shadow). Reformuler pour dire directement : pas de shadow, on utilise un overlay. |
| (L.181) `Pill « Ultra-simple » — accent-warm #C8843C fond pastel, meta label, rounded/full` | `Pill « Ultra-simple » — fond accent-warm pastel *(dérivation claire de #C8843C, voir tokens)*, meta label, rounded/full` — OU choisir : soit token seul, soit hex + preset "pastel" documenté. | Triple description ambiguë : token `accent-warm` = `#C8843C` en saturation pleine, mais "fond pastel" suggère une dérivation plus claire. Sally et Amelia ne sauront pas si c'est le hex plein ou une variante. Trancher. |
| (L.178) `Bouton ghost *(...)*. Usage standard *(« régénère », « choisir une Recette », « modifier »)*` | `Bouton ghost *(...)*. Usage standard *(« Régénérer », « Choisir une Recette », « Modifier »)*` | Cohérence de casse et forme : autres exemples de libellés bouton dans le doc utilisent la capitale initiale et l'infinitif *(« Valider le menu », « Vider la Liste secondaire », « Importer », « Sauvegarder »)*. Aligner. |
| (L.123) `c'est l'ancre visuelle de l'ambition 2-3 ans du brief *(Vision §1 PRD)*` | `c'est l'ancre visuelle de l'ambition 2-3 ans du brief *(PRD §1 Vision)*` | Cohérence référencielle : L.99 utilise `§1 Vision PRD`, L.123 utilise `Vision §1 PRD`. Unifier — proposer format `PRD §1 Vision` (source puis section) et propager. |
| (L.99) `*(« personne ne s'énerve dans ce foyer »* — calibration explicite §1 Vision PRD*)*` | `*(« personne ne s'énerve dans ce foyer » — calibration explicite PRD §1 Vision)*` | Encadrement d'italiques cassé : les astérisques ouvrent/ferment autour d'un fragment mais laissent la parenthèse fermante isolée d'italique. Simplifier en encadrant toute la parenthèse en italique une seule fois. |
| (L.96) `Sur les Recettes *(Catalogue, vue de consultation, vue de cuisson)*` | `Sur les Recettes *(Catalogue, vue de consultation, mode cuisson)*` — OU définir explicitement "vue de cuisson" en Components. | "vue de cuisson" est introduite sans référence à un composant/écran documenté. Renommer "mode cuisson" pour l'aligner sur d'autres modes/états, ou introduire une entrée Composant/Écran dédiée. |

### Prose Summary

- **Total prose fixes:** 14.
- **Contradictions internes bloquantes ou quasi-bloquantes :** 2 *(L.135 règle italique vs. usages, L.153 phrase auto-contradictoire sur l'ombre)*.
- **Ambiguïtés techniques pour l'aval :** 3 *(L.131 Title XL, L.172 Title 2 sans, L.181 accent-warm hex + pastel)*.
- **Accords/franglais :** 4 *(L.101, L.195, L.173, L.175)*.
- **Cohérence de format/casse/référence :** 4 *(L.99, L.123, L.144, L.178)*.
- **Introductions manquantes :** 1 *(L.96 vue de cuisson)*.

---

## Consolidated Fixes by Severity

### BLOCKING (contradictions internes qui empêchent l'implémentation cohérente)

- **B1 — L.135 : Règle italique contredite par les Components.** Le paragraphe Typography restreint les italiques aux notes manuscrites, mais Components utilise des italiques pour Slot libre (L.173), Item Liste secondaire coché (L.175), et notes Recette. Amelia et Sally ne sauront pas quelle règle appliquer.
  → **Fix :** Élargir la parenthèse L.135 pour lister les trois usages effectifs *(notes Recette, Slot libre, item coché Liste secondaire)*.

- **B2 — L.153 : Elevation & Depth auto-contradictoire.** « L'ombre est réservée à un seul cas… portée par une overlay opaque… jamais une ombre douce. » Le lecteur doit résoudre "ombre existe / n'existe pas / est un overlay". Reformuler en direct : pas de shadow, on utilise un overlay opaque sur la modale plein écran.
  → **Fix proposé (voir table).**

### HIGH (ambiguïtés qui forcent l'aval à deviner)

- **H1 — L.131 « Title XL »** non défini dans iOS Dynamic Type. Renommer `Large Title` (34pt) ou donner un pt explicite.
- **H2 — L.172 « Title 2 sans »** ambigu : "sans" pour "sans-serif" ? Écrire complet.
- **H3 — L.181 Pill « Ultra-simple » — `accent-warm #C8843C fond pastel`.** Trois signifiants pour un fill : hex plein saturation + label "pastel" contradictoire. Trancher : hex plein OU variante pastel documentée dans tokens.
- **H4 — L.181 vs. L.183 Pill « Ultra-simple » ≈ Pill contextuelle.** Deux composants pour un même pattern visuel. Fusionner ou déclarer explicitement variante-de.
- **H5 — L.96 « vue de cuisson »** introduite sans documentation. Renommer "mode cuisson" ou ajouter une entrée dans Components/Screens.

### MEDIUM (défauts de cohérence, franglais, accords)

- **M1 — L.101 et L.195 :** `tokens sombre` → `tokens sombres` (accord pluriel).
- **M2 — L.175 :** `comme l'item principale` → `comme l'Item Liste principale` (accord + entity naming).
- **M3 — L.173 :** `la Repas row` → `la ligne Repas` (Franglais).
- **M4 — L.144 :** `la scan-rapide` → `le scan rapide` OU `la lecture rapide` (anglicisme mal formé).
- **M5 — L.178 :** libellés bouton ghost en bas-de-casse (`« régénère »…`) inconsistants avec bouton primaire (`« Valider… »`). Uniformiser casse + infinitif.
- **M6 — L.99 vs. L.123 :** format référence PRD inconsistant *(`§1 Vision PRD` vs. `Vision §1 PRD`)*. Adopter `PRD §1 Vision` partout.
- **M7 — Ligne Do's/Don'ts Mode sombre + paragraphe Brand & Style :** rejoue la même justification deux fois. Alléger la ligne Do's/Don'ts en règle pure.

### LOW (polish éditorial)

- **L1 — L.99 :** encadrement d'italiques cassé autour de la parenthèse. Simplifier.
- **L2 — Frontmatter `components:` YAML :** duplique la section Components. Trancher : tooling *(garder)* ou pas *(couper)*.
- **L3 — Colors "Éviter" (L.117) partiellement recoupe Do's/Don'ts.** Non-bloquant, garder si l'un ne dérive pas de l'autre au fil du temps.

---

## Summary

- **Total recommendations:** 22 (2 BLOCKING, 5 HIGH, 7 MEDIUM, 3 LOW, 5 PRESERVE/QUESTION structurels).
- **Estimated reduction:** aucune obligatoire (pas de cible). Réductions optionnelles ~200 mots si le YAML `components:` est coupé.
- **Meets length target:** N/A (no target).
- **Comprehension trade-offs:** aucun cut ne sacrifie la compréhension. La plupart des fixes améliorent la compréhension aval en résolvant des contradictions ou ambiguïtés.
- **Voix éditoriale préservée :** italiques intentionnelles, ton manifeste, termes techniques anglais assumés — tous laissés intacts.
