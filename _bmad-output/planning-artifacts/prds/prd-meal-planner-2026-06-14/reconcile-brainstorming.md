# Réconciliation Brainstorming → PRD

**Date :** 2026-06-30
**Inputs comparés :**
- Brainstorming : `_bmad-output/brainstorming/brainstorming-session-2026-05-28-061315.md` (16 idées, 7 thèmes)
- PRD : `_bmad-output/planning-artifacts/prds/prd-meal-planner-2026-06-14/prd.md` (24 FR, 8 OQ)

**Objet :** vérifier que chaque idée validée au brainstorming a trouvé sa contrepartie dans le PRD, et signaler les éventuels silences.

---

## 1. Verdict global

**Couverture quasi-complète, aucun trou structurel.** Les 16 idées du brainstorming sont toutes traçables dans le PRD — soit comme FR du §4, soit comme entrée explicite des §5 Non-Goals / §6.2 Out of Scope. Le PRD a même enrichi la matière (Liste secondaire, pattern récurrent gamelle, anti-récence intra-Fenêtre) sans dériver des intentions initiales.

Trois gaps mineurs identifiés, tous de sévérité **basse**, à corriger par micro-ajout au PRD ou par transmission à la phase Architecture. Aucun ne bloque la phase Implementation.

---

## 2. Idées MVP du brainstorming → FR/sections du PRD

| # | Idée brainstorming | Statut brainstorming | Emplacement PRD | Verdict |
|---|---|---|---|---|
| #1 | Menu prêt à l'ouverture | MVP | FR-11, UJ-1 beat 1, Vision §1 | **OK** |
| #2 | Pool de recettes aimées uniquement | MVP | Implicite via Catalogue (F2) | **Partiel** — voir gap G1 |
| #5 | Automatique mais 100% éditable | MVP | FR-12, FR-13, FR-14, FR-15 ; UJ-1 beats 2-3 | **OK** |
| #7 | Import par lien web/blog | MVP (Instagram natif repoussé) | FR-5, UJ-5a, OQ-11 ; Instagram natif en §6.2 v2+ | **OK** |
| #9 | Saisie manuelle | MVP | FR-6, UJ-5b ; NFR-X1 (exception assumée) | **OK** |
| #10 | Recette = version perso + notes | MVP | FR-7 (édition), FR-8 (notes), Glossary « Note libre (recette) » | **OK** |
| #11 | Source unique consultable à la cuisson | MVP | FR-17 drill-down Slot, UJ-2 beat 3 (« garde l'app ouverte sur le plan de travail ») | **OK** — voir note G3 |
| #12 | Portions + repas scindé (2 recettes / 1 repas) | MVP | Glossary « Slot » (1..N par Repas), FR-3, FR-15, modèle D1 brief repris | **OK** |
| #13 | Régénération en 2 temps | MVP | FR-12 (auto) + FR-13 (manuel), UJ-1 beat 2, U2 du decision-log | **OK** |
| #15 | Planification multi-semaines | MVP (corrigé en 7-14 j) | Glossary « Fenêtre », FR-11 (7-14 j, défaut 14) | **OK** |
| #16 | Historique des menus | MVP | FR-19, profondeur illimitée (séance Lionel « iii ») | **OK** — amélioré (illimité au lieu de 2-3 semaines) |
| — | Comptes perso + board partagé (Thème F) | MVP | FR-1, FR-2, Glossary « Board partagé » / « Compte » | **OK** |
| — | Liste de courses agrégée cochable (Thème E) | MVP | FR-20 (agrégation), F5/F6 (cochage déplacé sur secondaire) | **OK** — divergence justifiée (cochage principal supprimé par U1 pour le double usage drive) |
| — | Portion enfant = adulte (simplif MVP) | MVP | Glossary Convive (« Rory compté comme un adulte en portion par simplification MVP ») | **OK** |
| — | Minimiser la saisie manuelle (exigence transverse) | MVP | NFR-X1 « Zéro saisie = scénario réussi » (garde-fou cardinal) | **OK** — bien remonté |

---

## 3. Idées hors-MVP du brainstorming → §5 / §6.2

| # | Idée brainstorming | Statut brainstorming | Emplacement PRD | Verdict |
|---|---|---|---|---|
| #3 | Équilibre nutritionnel | v2+ (SCAMPER Eliminate) | §5 Non-Goals « Pas un assistant nutritionnel » + §6.2 v2+ « Équilibre nutritionnel discret » | **OK** |
| #4 | Planification consciente de l'énergie | v2+ (opérationnalisée via #14) | §6.2 v2+ « Budget effort/temps … rend la planification consciente de l'énergie » | **OK** — expression citée |
| #6 | Export liste → panier drive | v2+ (étoile du nord, SCAMPER Substitute) | §5 Non-Goals « Pas connecté aux drives au MVP » + §6.2 v2+ « Export panier vers le drive — l'étoile du nord » | **OK** |
| #8 | Import par photo / OCR livre | v2+ (SCAMPER Eliminate) | §6.2 v2+ « Import photo / OCR de livres de cuisine » | **OK** |
| #14 | Effort/recette + budget effort/jour | v2+ (SCAMPER Eliminate, « à creuser ») | §6.2 v2+ « Budget effort/temps par recette et par jour » | **OK** |
| — | Anti-gaspi / inventaire frigo (hors-scope assumé) | Hors-scope définitif | §5 Non-Goals « Pas un anti-gaspi / inventaire du frigo. Définitivement écarté » | **OK** — bien marqué irréversible |
| — | Repas récurrents / épingler (Thème C, « à confirmer ») | Quick win post-MVP | §6.2 quick wins « Repas récurrents / épingler des favoris » + OQ-16 (revue 3 mois) | **OK** |
| — | Élargir l'import (Quick wins brainstorming) | Quick win post-MVP | §6.2 quick wins « Élargir les sources d'import au-delà de schema.org » + OQ-17 | **OK** |

---

## 4. Gaps identifiés

### G1 — « Pool de recettes aimées UNIQUEMENT » (#2) — principe non explicité — sévérité **basse**

**Constat.** Le brainstorming pose comme principe fondateur : *« le catalogue ne contient que des recettes que le couple aime déjà ; la génération pioche dedans, donc tout menu proposé est safe. (…) on n'optimise pas la découverte mais la fiabilité — zéro mauvaise surprise. »* C'est un **principe différenciant** par rapport à Jow ou Marmiton.

Le PRD parle de « Catalogue » de manière neutre (F2, Glossary) — le mot « aimées » n'apparaît nulle part. Conséquence : un lecteur aval pourrait imaginer qu'un futur module « suggestions de recettes externes » serait compatible avec le MVP, alors que le brainstorming l'exclut implicitement.

**Recommandation.** Ajouter une phrase courte dans la définition Glossary « Catalogue » du §3 : *« le Catalogue ne contient que des Recettes choisies activement par le foyer — pas de suggestion externe, pas de découverte algorithmique »*. Cela cristallise le principe « zéro mauvaise surprise » et borne durablement le scope.

### G2 — Contrainte « 2 environnements DB dev/prod » — non transmise — sévérité **basse**

**Constat.** Le brainstorming, dans sa section « Contraintes / préférences techniques pressenties », formule explicitement : *« Vouloir 2 environnements de base de données distincts : dev et prod. »* C'est une préférence forte du profil utilisateur (cf. mémoire utilisateur : « développeur à l'aise avec Firebase env. dev/prod »).

Le PRD §8 Open Questions / Délégations Architecture (OQ-9 à OQ-14) ne reprend pas cette contrainte. Elle n'est ni dans NFR-X5 (Soutenabilité) ni dans les OQ Winston.

**Recommandation.** Ajouter un OQ Architecture explicite (OQ-18 ou similaire) : *« Stack Firebase + séparation dev/prod : confirmer la mécanique (projets distincts ? émulateurs ? autre ?) — préférence Lionel énoncée au brainstorming. Owner : Winston. »* Risque sinon : Winston pourrait proposer un setup mono-environnement par souci de simplicité, et la préférence serait perdue silencieusement.

### G3 — « Source unique aussi à la cuisson » (#11) — principe non nommé — sévérité **très basse**

**Constat.** L'idée #11 du brainstorming pose : *« L'app sert à la fois à planifier ET de référence à la cuisson — pas qu'un outil de planif déconnecté de l'exécution. »* C'est un principe d'architecture produit.

Le PRD le réalise opérationnellement via FR-17 (drill-down sur Slot affiche la Recette complète, ingrédients aux quantités effectives, étapes, photo, notes, URL source) et l'illustre brillamment dans UJ-2 beat 3 (« il garde l'app ouverte sur le plan de travail »). Mais le principe n'est nulle part nommé comme tel — un lecteur aval pourrait sous-évaluer la qualité d'affichage de la Recette en consultation et la traiter comme une vue secondaire.

**Recommandation.** Non bloquant — éventuellement renforcer la **Description** de F4 (§4.4) en ajoutant : *« Sert également de matière de référence pendant l'exécution culinaire — l'app n'est pas qu'un outil de planification déconnecté du moment de la cuisson. »* Cela cadre l'attention UX/Sally sur la qualité de la vue Recette en lecture.

---

## 5. Vocabulaire — propositions Glossary

Le Glossary du PRD est déjà très riche et discipliné. Quelques termes du brainstorming pourraient être annexés en synonymes pour aider les phases aval à naviguer entre les deux documents :

- **« Repas scindé »** (brainstorming #12) → équivalent du modèle « Repas à 2..N Slots » (PRD). Mentionner en note dans Glossary « Slot ».
- **« Pool de recettes aimées »** (brainstorming #2) → voir G1, à intégrer dans la définition « Catalogue ».
- **« Session menu »** (PRD, vocabulaire courant) et **« session-rituel »** (Vision §1) sont déjà utilisés clairement — pas d'ajout nécessaire.

Aucun terme du brainstorming n'est trahi ou contredit. Les corrections du brief (« 1..N recettes » vs « 2 max », « 7-14 j » vs « 2 semaines fixes », « iPhone-only » vs « web app ») sont bien intégrées comme attendu et exclues du périmètre de cette revue.

---

## 6. Récapitulatif

- 16 idées du brainstorming → 16 idées tracées dans le PRD (FR ou §5/§6.2).
- 3 gaps mineurs, tous corrigibles par petits ajouts ciblés (1 phrase Glossary, 1 OQ Architecture, 1 phrase de Description).
- Aucun trou structurel, aucune idée silencieusement abandonnée.
- La transformation brainstorming → brief → PRD a préservé l'intention et l'a même renforcée (principe NFR-X1 hissé au rang de garde-fou cardinal, Liste secondaire ajoutée pour la 3ᵉ charge mentale).

**Pas de blocage Implementation.** Les 3 ajustements proposés peuvent être traités en passe finale du PRD (édit Glossary, ajout OQ-18, micro-renfort de F4) ou délégués sans risque à la revue 3 mois.
