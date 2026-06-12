---
stepsCompleted: [1, 2, 3, 4]
ideas_generated: 16
technique_execution_complete: true
workflow_completed: true
session_active: false
inputDocuments: []
session_topic: 'Meal Planner — application web de planification de repas et génération de liste de courses pour un couple (usage personnel, non commercial)'
session_goals: 'Découvrir la méthode BMAD et définir le périmètre du MVP'
selected_approach: 'progressive-flow'
techniques_used: ['What If Scenarios', 'Mind Mapping', 'SCAMPER', 'Resource Constraints']
ideas_generated: []
context_file: ''
---

# Brainstorming Session Results

**Facilitatrice :** Mary (Analyste BMAD)
**Date :** 2026-05-28

## Session Overview

**Topic :** Meal Planner — application web de planification des repas de la semaine et génération automatique de la liste de courses, pour un couple (Aurélie + conjoint), usage personnel et non commercial.

**Goals :** Découvrir la méthode BMAD de bout en bout et définir le périmètre du MVP.

### Session Setup

**Contexte produit (énoncé initial de l'utilisateur) :**
- **Pour qui :** un foyer / couple. Aide en priorité Aurélie, qui gère aujourd'hui courses, menus et repas.
- **Douleur principale :** ils ont des recettes qu'ils aiment mais les oublient → besoin d'un catalogue de recettes mémorisé.
- **Usage cible :** ouvrir l'app et demander « fais-moi le menu de la semaine prochaine ».
- **Vue menu :** voir les menus générés ; pour chaque repas, ajuster le nombre de convives (ex. le midi, Aurélie mange seule).
- **Repas scindé :** possibilité de faire 2 plats pour un même repas (leur fils ne mange pas comme eux).
- **Liste de courses :** une fois le menu validé, un bouton génère la liste de courses, agrégée à partir des quantités d'ingrédients par personne.
- **Cœur du produit :** (1) planifier les repas de la semaine, (2) générer la liste de courses.
- **Plateforme :** application web.
- **Collaboration :** collaboratif entre les membres du foyer.
- **Modèle :** aucune dimension business — strictement personnel (Aurélie + conjoint).

## Technique Selection

**Approche :** Flux progressif (Progressive Technique Flow)
**Conception du parcours :** développement systématique de l'exploration large vers la définition du MVP.

**Techniques progressives :**

- **Phase 1 — Exploration :** What If Scenarios (génération large d'idées)
- **Phase 2 — Reconnaissance de patterns :** Mind Mapping (regroupement en thèmes)
- **Phase 3 — Développement :** SCAMPER (raffinage et dégraissage des concepts)
- **Phase 4 — Planification :** Resource Constraints (convergence vers le périmètre MVP + prochaines étapes)

**Rationale :** le but est de définir un MVP. On diverge d'abord sans contrainte, on organise, on muscle les bonnes idées, puis on force les priorités pour isoler le strict nécessaire — base directement réutilisable pour le Product Brief.

## Idéation

### Phase 1 — Exploration large (What If Scenarios)

**[Idée #1] — Menu prêt à l'ouverture**
_Concept_ : on ouvre l'app et la semaine est déjà pré-remplie (midi + soir), il n'y a plus qu'à valider ou retoucher. Supprime la charge mentale du « qu'est-ce qu'on mange ? ».
_Novelty_ : l'app propose par défaut au lieu d'attendre une saisie — la planification devient une relecture, pas une création.

**[Idée #2] — Pool de recettes aimées uniquement**
_Concept_ : le catalogue ne contient que des recettes que le couple aime déjà ; la génération pioche dedans, donc tout menu proposé est « safe ».
_Novelty_ : on n'optimise pas la découverte mais la fiabilité — zéro mauvaise surprise.

**[Idée #3] — Équilibre nutritionnel comme contrainte**
_Concept_ : la génération veille à un équilibre sur la semaine (pas 3 plats lourds d'affilée, variété protéines/légumes…).
_Novelty_ : critère « santé » intégré automatiquement, sans que l'utilisateur ait à y penser.

**[Idée #4] — Planification consciente de l'énergie**
_Concept_ : chaque jour a un « budget énergie/temps ». Mardi soir = épuisée → recette rapide/facile ; week-end = plus de temps → plat plus élaboré. La génération adapte la complexité des recettes au jour.
_Novelty_ : on planifie selon la réalité de la fatigue de la semaine, pas seulement selon les goûts — très peu d'apps font ça.

**[Idée #5] — Automatique mais 100 % éditable**
_Concept_ : tout est proposé d'office, mais chaque repas reste modifiable (changer la recette, le nombre de convives, scinder le plat).
_Novelty_ : équilibre entre « zéro effort » et « garde la main » — l'auto n'enferme pas.

**[Idée #6] — Export de la liste vers le panier du drive en ligne** ⭐ (forte excitation)
_Concept_ : Aurélie fait déjà les courses en ligne (La Belle Vie, parfois Monoprix). La liste générée s'exporterait directement dans le panier du site → « génialissime ». Plus de ressaisie manuelle des articles.
_Novelty_ : l'app ne s'arrête pas à une liste à cocher, elle se branche sur le canal d'achat réel du foyer.

**Hors-scope identifié (à ce stade) :**
- **Anti-gaspillage / gestion du fond de frigo / inventaire** : écarté. Le couple ne gaspille pas (pas dans leurs habitudes) et surtout cela imposerait de **déclarer tout ce qu'on a** → trop d'effort de saisie pour le bénéfice. Confirme une exigence transverse forte : **minimiser la saisie manuelle**.

**[Idée #7] — Import d'une recette par lien (web / blog / Instagram)** ⭐
_Concept_ : coller une URL (Marmiton, blog, **Instagram** — source majeure pour Aurélie) → l'app extrait automatiquement ingrédients + quantités, qu'on ajuste ensuite.
_Novelty_ : transforme la veille recettes existante (Instagram) en catalogue exploitable sans ressaisie.

**[Idée #8] — Import par photo d'un livre (OCR)**
_Concept_ : photographier une recette d'un livre de cuisine → import auto. Usage plus rare mais « trop génial ».
_Novelty_ : pont entre le patrimoine papier (livres) et le catalogue numérique.

**[Idée #9] — Saisie manuelle pour les recettes « dans la tête »**
_Concept_ : beaucoup de recettes (notamment vietnamiennes, héritage familial) ne sont écrites nulle part → il faut un chemin de saisie manuelle simple.
_Novelty_ : capture le savoir-faire familial non documenté, pas seulement le web.

**[Idée #10] — La recette = VOTRE version personnalisée + notes** ⭐
_Concept_ : on ajuste les recettes importées (ex. « plus de sucre que marqué », « temps de cuisson plus long ») et on l'oublie d'une fois sur l'autre. L'app mémorise la version adaptée + des notes libres. Étapes de préparation = optionnelles.
_Novelty_ : ce n'est pas un agrégateur de recettes web, c'est le livre de recettes vivant et personnalisé du foyer.

**[Idée #11] — Source unique, aussi utilisée au moment de cuisiner**
_Concept_ : tout au même endroit. Le soir : « ce soir on prépare ça » → un clic → la recette (ingrédients, quantités, étapes/notes) s'affiche pour cuisiner.
_Novelty_ : l'app sert à la fois à planifier ET de référence à la cuisson — pas qu'un outil de planif déconnecté de l'exécution.

**Détail persona :** Aurélie est d'origine vietnamienne, aime les recettes vietnamiennes, et puise beaucoup d'inspiration sur Instagram.

**[Idée #12] — Portions par repas + repas scindé via 2 recettes**
_Concept_ : chaque repas porte un nombre de convives ; l'app recalcule les quantités d'ingrédients pour la liste de courses. Le « plat séparé » du fils = une **vraie 2ᵉ recette du catalogue** affectée au même repas (pas une variante à ressaisir).
_Novelty_ : modélise un repas comme « 1..n recettes × convives », ce qui colle à la vraie vie d'un foyer (un plat principal + un plat enfant).

**Décisions de simplification (MVP) :**
- **Portion enfant comptée comme un adulte** — on ne gère pas les demi-portions pour l'instant (« on ne se prend pas la tête »).
- **Détail persona :** le fils a 8 ans, en pleine « phase pâtes » → souvent pâtes + légumes à côté, d'où le plat séparé récurrent.

**[Idée #13] — Régénération d'un repas en deux temps**
_Concept_ : sur un repas qui ne plaît pas, bouton « Régénérer ce repas » → l'app en propose un autre (auto). Si ça ne plaît toujours pas, on ouvre la liste du catalogue et on pioche à la main.
_Novelty_ : philosophie « le système équilibre par défaut, l'humain reprend la main au besoin » — friction minimale d'abord, contrôle total ensuite.

**[Idée #14] — Effort/temps de préparation par recette + budget effort par jour** ⭐ (à creuser)
_Concept_ : chaque recette porte un niveau d'effort (ou temps de prépa). Dans les réglages, on définit un budget d'effort par jour de la semaine (mardi = faible, samedi = élevé). La génération respecte ce budget.
_Novelty_ : rend opérationnelle la « planif consciente de l'énergie » (idée #4) avec deux réglages simples — recette.effort + jour.budget.

**[Idée #15] — Planification multi-semaines (2-3 semaines à l'avance)**
_Concept_ : pouvoir générer/planifier les menus plusieurs semaines en avance, car on se projette pour faire les courses.
_Novelty_ : l'horizon n'est pas figé à « la semaine prochaine » — la planif suit le rythme réel d'anticipation du foyer.

**[Idée #16] — Historique des menus (2-3 semaines)**
_Concept_ : conserver un historique des menus passés (~2-3 semaines).
_Novelty_ : permet de voir ce qu'on a mangé récemment (éviter la répétition, réutiliser un menu qui a marché).

**Clarification Thème F — Collaboration :** modèle simple = chacun (toi + Aurélie) a **ses propres identifiants**, mais **un même board partagé** (foyer). Pas de besoin de temps réel sophistiqué. Multi-comptes sur un board commun.

## Phase 2 — Reconnaissance de patterns (Mind Mapping)

Carte des thèmes validée à partir des 16 idées :

**A — Catalogue de recettes** (le carburant) : pool de recettes aimées (#2), import par lien web/Instagram (#7), import photo/OCR (#8), saisie manuelle (#9), version perso + notes (#10), source unique consultable à la cuisson (#11).

**B — Génération du menu** (le cerveau) : menu prêt à l'ouverture (#1), équilibre nutritionnel (#3), planif selon l'énergie (#4), effort/recette + budget effort/jour (#14).

**C — Retouche & contrôle du menu** : tout éditable (#5), régénérer un repas en 2 temps (#13), épingler / repas récurrents (à confirmer).

**D — Convives & portions** : nb de convives par repas, repas scindé = 2 recettes (#12), enfant compté comme adulte (simplif.).

**E — Liste de courses & achat** : génération auto depuis les quantités, export vers le panier du drive La Belle Vie/Monoprix (#6).

**F — Collaboration du foyer** : comptes perso + board partagé (multi-utilisateurs, un foyer).

**G — Horizon temporel & historique** : planification multi-semaines (#15), historique des menus 2-3 semaines (#16).

**⚙️ Exigence transverse :** minimiser la saisie manuelle. **Hors-scope :** anti-gaspi / inventaire du frigo.

## Phase 3 — Développement (SCAMPER)

**Combine — la colonne vertébrale :** ce n'est pas 5 features séparées mais **un flux continu unique** : Catalogue de recettes → Génération du menu → Ajustement convives/portions → Liste de courses (cochable).

**Eliminate / repoussé après MVP (validé) :**
- Import photo/OCR (#8) — usage rare.
- Équilibre nutritionnel automatique (#3) — complexe à bien faire.
- Budget effort/jour + effort par recette (#14) — bonne idée mais « à creuser », v2.

**Substitute — export vers le panier du drive (#6) :** confirmé **hors MVP** (pas d'API publique fiable côté La Belle Vie / Monoprix). Remplacé au MVP par une **liste de courses propre, regroupée par catégorie, cochable** (et copiable). L'intégration drive reste l'« étoile du nord » post-MVP.

**Correction de périmètre importante :** la **planification multi-semaines (#15) est un besoin MVP**, pas v2. Aurélie fait généralement les courses **pour 2 semaines** → horizon minimum = **2 semaines**, et la liste de courses doit **agréger sur 2 semaines**.

## Phase 4 — Convergence MVP (Resource Constraints)

**Critère de cadrage :** le strict minimum pour qu'Aurélie utilise l'app dès la 1ʳᵉ semaine et que ça lui change la vie.

### Périmètre MVP (validé)

1. **Catalogue de recettes** : saisie d'une recette = titre + ingrédients/quantités (pour un nb de portions de référence) + étapes/notes optionnelles. **Import par lien depuis les sites de recettes classiques inclus au MVP** (extraction propre via données structurées type schema.org).
2. **Génération de menu sur 2 semaines** (midi + soir), en piochant dans les recettes aimées. Menu déjà prêt à l'ouverture. Génération simple au départ (pioche/règles basiques), pas d'IA « intelligente ».
3. **Retouche du menu** : régénérer un repas (auto, puis pioche manuelle dans le catalogue) ; tout éditable.
4. **Convives & portions** : nb de convives par repas ; repas scindé = 2 recettes affectées au même repas ; enfant compté comme adulte ; recalcul automatique des quantités.
5. **Liste de courses** : agrégée sur les 2 semaines, regroupée par catégorie, cochable (et copiable).
6. **Historique** des menus passés (lecture seule, ~2-3 semaines).
7. **Comptes & collaboration** : **2 comptes séparés (toi + Aurélie)**, chacun son mot de passe, pointant vers **un même board foyer partagé**.

### Quick wins (juste après le MVP)
- Repas récurrents / épingler des repas.
- Élargir l'import (plus de sources).

### Plus tard (v2+)
- Import Instagram & photo/OCR (#8).
- Équilibre nutritionnel automatique (#3).
- Budget effort/jour + effort par recette (#14).
- Export vers le panier du drive en ligne (#6) — étoile du nord.
- Génération « intelligente » (apprentissage des goûts).

### Contraintes / préférences techniques pressenties (à formaliser en phase Architecture)
- **Firebase** pressenti (notamment Firebase Auth = 2 comptes → même board, simple).
- Vouloir **2 environnements de base de données distincts : dev et prod**.

## Synthèse de session & prochaines étapes

**Bilan :** 16 idées générées, 1 exigence transverse, 1 hors-scope assumé, et un **périmètre MVP clair**, via un flux progressif (What If → Mind Mapping → SCAMPER → Resource Constraints).

**La colonne vertébrale du produit :** Catalogue de recettes → Génération du menu (2 semaines) → Convives/portions → Liste de courses cochable.

**Insights clés :**
- La valeur n°1 = **supprimer la charge mentale** d'Aurélie (« qu'est-ce qu'on mange ? »), pas découvrir de nouvelles recettes.
- Le produit n'est pas un agrégateur web mais le **livre de recettes vivant et personnalisé du foyer** (versions ajustées + notes).
- **Minimiser la saisie manuelle** est le fil rouge qui justifie l'import par lien et le rejet de l'inventaire/anti-gaspi.
- Contrainte réelle structurante : **courses sur 2 semaines** → horizon de planif et agrégation des courses = 2 semaines.

**Top priorités (MVP) :** catalogue (saisie + import lien), génération menu 2 semaines, convives/portions + repas scindé, liste de courses agrégée cochable, 2 comptes/board partagé.

**Plan d'action — prochaine étape BMAD :**
1. **Product Brief** (`/bmad-product-brief`, agent Mary) — transformer cette session en brief structuré (problème, utilisateurs/personas Aurélie + conjoint, objectifs, périmètre MVP, hors-scope). Ce document de brainstorming sert d'entrée directe.
2. Puis **PRD** (`/bmad-prd`), **UX** (`/bmad-ux`), **Architecture** (`/bmad-create-architecture` — c'est là qu'on tranche Firebase + dev/prod), etc.

