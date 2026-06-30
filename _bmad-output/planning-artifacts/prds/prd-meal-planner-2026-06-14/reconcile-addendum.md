---
title: "Réconciliation Addendum brief → PRD"
status: review
created: 2026-06-30
project: meal-planner-bmad
inputs:
  - "_bmad-output/planning-artifacts/briefs/brief-meal-planner-2026-06-12/addendum.md"
  - "_bmad-output/planning-artifacts/prds/prd-meal-planner-2026-06-14/prd.md"
purpose: |
  Vérifier que les éléments de l'addendum brief (scènes vécues, chiffres durs,
  frictions secondaires, persona détaillée) qui devaient informer les exigences
  fonctionnelles ont bien été traduits dans le PRD. Surface les pertes.
---

# Réconciliation Addendum brief → PRD

## Verdict global

Le PRD couvre **fidèlement** la matière forte de l'addendum : la session-rituel (45 min → cible < 5 min), les 3 charges mentales en cascade, le pattern récurrent des nuits, le triplé « 3 repas parallèles » les soirs-nuits, l'écosystème La Belle Vie / Monoprix, l'origine vietnamienne d'Aurélie comme source de patrimoine culinaire, Instagram comme source d'inspiration recettes. Les décisions D1-D6 sont **toutes** opérationnalisées via U1-U28. **Quatre gaps mineurs à modérés** subsistent — aucun n'est bloquant pour l'Implementation mais ils méritent une décision explicite avant Architecture / UX, ou au minimum une trace dans `.decision-log.md`.

Aucun gap **sévère** détecté. Le risque principal est une **perte de traçabilité de chiffres durs** — pas une perte d'exigence fonctionnelle.

## Inventaire ligne-à-ligne

### 1. Implications produit (addendum « Implications pour le produit »)

| Élément addendum | Traduit dans PRD | Verdict |
|---|---|---|
| Menu prêt à l'ouverture = réponse au « pas facile de mettre sur la feuille ce qu'on a envie » | Vision §1, UJ-1 beat 1, FR-11 *(génération initiale pré-remplie)* | **OK** — bien explicité comme cœur de valeur |
| Liste agrégée auto supprime étape #3 (2ᵉ charge mentale) | Vision §1, UJ-3 climax, SM-2, FR-20 | **OK** — explicitement tracé comme « 2ᵉ charge mentale du brief » |
| Nuits d'Aurélie = input contextuel du planificateur | FR-4 *(pattern récurrent)*, Glossary « Setup foyer », U3 | **OK** — modélisé proprement |
| Foyer = couple + enfant + chien, « temps arraché » | Vision §1 *(« espace mental occupé par un enfant de 8 ans et un chien »)*, §2.1 méta-contextuel | **OK** — chien hors-scope produit conformément à l'addendum |

### 2. Implications produit supplémentaires (addendum)

| Élément addendum | Traduit dans PRD | Verdict |
|---|---|---|
| Modèle « 1..N recettes par repas » (D1) | Glossary « Slot », FR-11, FR-14 | **OK** |
| Slot gamelle pré-rempli, libre par défaut (D2 + D2bis U21) | Glossary « Slot gamelle », FR-4, FR-11, U21 | **OK** — révision D2bis bien intégrée |
| Indispos drive = hors-MVP côté drive (D4) | §5 Non-Goals, §6.2 hors-scope définitif, F6 | **OK** |
| Liste secondaire dédiée cochable mobile (D4) | F6 entier *(FR-22 à FR-24)*, U16, U17, U18 | **OK** |

### 3. Chiffres durs (addendum « Chiffres durs »)

| Chiffre | Tracé PRD | Verdict |
|---|---|---|
| Aurélie infirmière | UJ-1, UJ-2, persona | **OK** |
| 3 nuits/semaine en moyenne | UJ-2 *(« environ 3 fois par semaine »)*, FR-4 | **OK** |
| 3 repas différents sur le créneau soir-nuit | FR-11, Glossary Slot, UJ-1, UJ-2 | **OK** |
| ~2h15/mois temps arraché | Vision §1 *(« environ 2h15 par mois »)* | **OK** |
| **~3 sessions menu/mois** | **Absent du PRD** | **GAP-2 modéré** — le chiffre qui justifie la valeur de 2h15 n'est pas traçable |
| **Cycle courses ~10 jours (pas 14)** | Vision §1 *(« 10-14 jours »)* + Glossary « Fenêtre » *(7-14 j, défaut 14)* | **GAP-3 modéré** — la décision D3 garde 14 par défaut, l'addendum dit que le cycle réel est 10. Tension non-explicitée |

### 4. Frictions secondaires (addendum « Frictions secondaires »)

| Friction | Tracé PRD | Verdict |
|---|---|---|
| Items indispos drive — cascade #1 « changer la recette » | Pas explicitement reconnue (U9 tranche « pas de modification du menu validé en plein flux ») | **GAP-1 modéré** — friction non reconnue, décision implicite contre |
| Items indispos — cascade #2 « plat sans » | Reconnu indirectement *(UJ-2 edge case, Lionel improvise hors-app)* | **OK partiel** |
| Items indispos — cascade #3 « re-commander le lendemain » | Hors-scope explicite *(§5 Non-Goals, §6.2)* | **OK** |
| Items indispos — cascade #4 « petites courses physiques » = 3ᵉ charge mentale | F6 *(description, climax UJ-4)*, SM-4 | **OK** — pierre angulaire de F6 |
| **« Ne pas commander le dimanche »** | **Absent du PRD** | **GAP-4 mineur** — friction concrète, ne change pas une FR mais informe le « timing session » (UJ-1 à 10h samedi, UJ-3 commande ~12h30 samedi) |
| Risque silencieux « oublier un ingrédient » | Couvert indirectement par FR-20 *(agrégation auto)* et Vision §1 | **OK** |

### 5. Persona détaillée (addendum « Détails persona »)

| Élément | Tracé PRD | Verdict |
|---|---|---|
| Aurélie d'origine vietnamienne | Vision §1 *(« recettes vietnamiennes d'Aurélie »)* | **OK** |
| Instagram source inspiration recettes | UJ-5 entry state, edge case Instagram natif, §6.2 v2+ | **OK** — bien explicité comme source majoritaire |
| La Belle Vie principal / Monoprix secondaire | UJ-3 *(« familière du drive La Belle Vie principal et Monoprix secondaire »)* | **OK** |
| Aurélie porteuse principale charge mentale | UJ-1 *(« porteuse principale de la planification »)*, §2.1 émotionnel rééquilibrage | **OK** |
| Rory 8 ans, phase pâtes, compté adulte en portion | Glossary Convive, UJ-2, FR-15 *(prorata)* | **OK** |
| Lionel co-décideur + dev + cuisine soirs-nuits | UJ-1, UJ-2, §2.1 méta-job BMAD | **OK** |
| Chien hors-scope produit | Vision §1, UJ-1 *(contexte uniquement)* | **OK** |

## Gaps prioritaires

### GAP-1 — Cascade « changer la recette » non reconnue *(sévérité : modérée)*

L'addendum décrit que face à un item indispo, la 1ʳᵉ stratégie naturelle d'Aurélie est de **changer la recette à la volée**, ce qui « impacte le menu et la liste ». Le PRD tranche **U9 : pas de modification du Menu validé en plein flux**, et **FR-16** acte l'immuabilité du Menu validé. La décision est cohérente avec la philosophie produit, **mais la friction qu'elle laisse non-couverte n'est jamais nommée dans le PRD**. Conséquence : Aurélie devra continuer à « bricoler mentalement » dans ce cas. Recommandation : ajouter une ligne dans §5 Non-Goals ou §6.2 hors-scope définitif du type *« édition de Recette dans un Slot du Menu validé en plein flux : hors-scope ; la bascule item-vers-secondaire reste le canal »*. **Owner : Lionel (PM)**.

### GAP-2 — « ~3 sessions menu/mois » perdu *(sévérité : modérée — traçabilité)*

Le PRD garde le coût agrégé *(2h15/mois)* mais perd le sous-jacent *(3 sessions × 45 min)*. Conséquence : on ne saura plus, dans 6 mois, **combien de sessions** sont concernées quand on évaluera SM-1. La cible « < 5 min » est mesurable par session, mais l'amplification *(x3 sessions/mois)* est invisible. Recommandation : ajouter une ligne dans §1 Vision ou §2.1 Jobs-To-Be-Done — *« ~3 sessions menu/mois × 45 min historique = 2h15/mois »*. Sans urgence. **Owner : Lionel (PM)**.

### GAP-3 — Tension « cycle réel 10 jours » vs « défaut 14 » *(sévérité : modérée — décision déjà tranchée)*

L'addendum est explicite : *« Horizon planification réel : 10 jours (pas 14). Le brainstorm avait écrit '2 semaines' — à corriger en '10-14 jours' ou rendre paramétrable. »* La décision D3 du brief a tranché « 7-14 jours, défaut 14 ». Le PRD reprend D3 telle quelle (Glossary, FR-11). La consigne dit « pas D1-D6 », donc on ne re-débat pas D3. Mais **un défaut à 10 (et non 14) serait plus aligné avec la donnée d'usage réel**. Pas une perte d'exigence, c'est un choix par défaut potentiellement sous-optimal. Recommandation : laisser tel quel pour Implementation, **revoir à 3 mois** dans la revue post-MVP. **Owner : Lionel (PM)**, revue à 3 mois.

### GAP-4 — Règle « pas le dimanche » non reconnue *(sévérité : mineure)*

L'addendum mentionne *« règle implicite déjà apprise : ne pas commander le dimanche (rupture de stock) »*. Le PRD ne mentionne nulle part cette contrainte. Le scénario UJ-3 prend déjà soin de placer la commande **samedi midi** (cohérent avec la règle), mais c'est **par accident**, pas explicitement. Pas d'impact sur les FR. Recommandation : si UX construit un *« nudge »* du moment de session menu *(rappel hebdomadaire, etc.)*, garder cette règle en tête. À mentionner éventuellement dans une note UX sur F1/F3. **Owner : Sally (UX)**, faible priorité.

## Éléments hors-périmètre (mentionnés pour mémoire)

Conformément à la consigne, je n'ai pas re-débattu :

- Les décisions D1-D6 *(déjà tracées par U1-U28)*.
- La révision D2bis → U21 *(déjà actée en séance finalize)*.
- Les délégations Architecture/UX *(les NOTE FOR PM et §8 Open Questions sont en place)*.

## Conclusion

Le PRD réussit à transformer la matière humaine de l'addendum en exigences fonctionnelles précises sans perte rédhibitoire. Les 4 gaps identifiés sont des **améliorations de traçabilité ou de reconnaissance explicite**, pas des trous dans la spec. Le PRD est **prêt pour la phase Implementation** sous réserve d'une décision sur GAP-1 (cascade « changer la recette ») — pour les 3 autres, une mention en §6.2 ou §8 suffit.
