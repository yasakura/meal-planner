---
title: "Addendum — Product Brief Meal Planner"
status: ready
created: 2026-06-12
updated: 2026-06-12
project: meal-planner-bmad
parent: "brief.md"
note: |
  Contenu volontairement plus dense que le brief. Sert d'archive de profondeur
  pour les phases aval (PRD, UX, Architecture). Tout ce qui est ici n'a pas
  vocation à remonter dans le brief — le brief reste court et lisible.
---

# Addendum — Product Brief Meal Planner

## Scènes vécues (matière persona)

### Scène #1 — La session « faire le menu » (semaine du 2026-06-01, racontée par Lionel)

- **Contexte** : Aurélie devait faire les courses en ligne ; pour les faire, il faut d'abord savoir quoi manger. Elle demande à Lionel de l'aider à faire le menu.
- **Forme** : session de réflexion à 2, en couple. **Durée totale : ~45 minutes**, parfois étalées en **2 sessions** (interrompues).
- **Friction principale** : pas le manque d'envie, **mais la difficulté à mettre sur le papier ce qu'on a envie**, et à **composer avec les nuits de travail d'Aurélie**.
- **Friction contextuelle** : bloquer 45 minutes « juste pour faire le menu » est dur — leur fils (8 ans) et leur chien occupent l'espace mental et physique.
- **Pas de drame** : personne ne s'énerve. C'est une **friction silencieuse / récurrente**, pas une crise.
- **Cycle complet de la peine** :
  1. Décider le menu (~45 min, à 2, en mode "couple")
  2. Aurélie repart seule sur l'app de courses
  3. Elle reconstitue **de tête** les ingrédients à acheter à partir des recettes décidées
  4. Risque silencieux : oublier un ingrédient ; au minimum, charge cognitive supplémentaire

### Implications pour le produit *(validées avec Lionel — voir `.decision-log.md`)*

- **« Menu prêt à l'ouverture » (idée #1 du brainstorm) n'est pas juste sympa — c'est la réponse directe au "pas facile de mettre sur la feuille ce qu'on a envie".** Le problème n'est pas l'idéation, c'est la **mise en forme** d'envies floues.
- **La liste de courses agrégée auto** n'est pas qu'un confort : elle supprime l'étape #3 (reconstruction de tête), qui est une **deuxième charge mentale invisible** dans la chaîne actuelle.
- **Les nuits de travail d'Aurélie** sont un **input contextuel du planificateur** (à creuser : profession ? quelles nuits ? impact sur qui mange / qui cuisine ?).
- **Le foyer = couple + enfant 8 ans + chien.** Le temps disponible pour des "tâches admin familiales" n'est pas du temps libre — c'est du temps arraché.

### Chiffres durs (recueillis 2026-06-12)

- **Aurélie : infirmière, 3 nuits/semaine en moyenne.**
- Les soirs où Aurélie travaille → **3 repas différents** sur le même créneau :
  1. **Aurélie : son propre repas qu'elle prépare avant de partir** (gamelle/transport).
  2. **Rory (8 ans, fils) : son repas** (compatible enfant — pâtes ou équivalent).
  3. **Lionel : son repas** (peut être identique à Rory ou différent).
- **Fréquence "session menu" : ~3 fois par mois** (courses ≈ tous les 10 jours, et non pas tous les 14).
  → **Coût agrégé : ~2h15/mois de temps familial arraché** rien que pour décider du menu (sans compter les courses).
- **Horizon planification réel : 10 jours** (pas 14). Le brainstorm avait écrit "2 semaines" — à corriger en "10-14 jours" ou rendre paramétrable.

### Frictions secondaires découvertes — la liste de courses confronte le monde réel

- Aurélie **n'oublie pas** les ingrédients (de tête), mais...
- **Items indisponibles sur le site de courses** déclenchent une cascade :
  1. **Changer la recette** à la volée (impacte le menu et la liste)
  2. **Le plat se fait sans** l'ingrédient (sous-optimal)
  3. **Re-commander le lendemain** (coût temps)
  4. **Petites courses physiques en semaine** — *"faut se souvenir quoi acheter"* (troisième charge mentale qui apparaît ici, non listée jusqu'à présent)
- **Règle implicite déjà apprise** : ne pas commander le dimanche (rupture de stock).

### Implications produit supplémentaires *(toutes arbitrées en séance Discovery — voir `.decision-log.md` D1-D6)*

- **Modèle "convives × repas"** → `1..N recettes par repas`, chacune avec ses convives *(D1)*.
- **Repas-gamelle d'Aurélie** → Slot gamelle pré-rempli, **libre par défaut**, avec possibilité d'associer manuellement n'importe quelle recette du catalogue *(D2 + D2bis révisé par U21 du PRD le 2026-06-17 : plus de sous-pool typé « format gamelle »)*.
- **Liste de courses face aux indispos** → hors-MVP côté drive (pas d'API publique). Adressé indirectement via la liste secondaire physique *(D4)*.
- **Liste de courses physiques résiduelles** → liste secondaire dédiée, cochable, accessible mobile *(D4)*.

### Décisions prises (séance Discovery #1) — synthèse

| Sujet | Décision MVP |
|---|---|
| Convives × recettes par repas | `1..N recettes par repas`, chacune avec ses convives |
| Gamelle Aurélie les nuits | Slot gamelle pré-rempli, par défaut **libre** ; possibilité d'y associer manuellement une recette du catalogue *(sans sous-pool typé — révision PRD U21 du 2026-06-17, voir `.decision-log.md` du brief)* |
| Horizon planification | Fenêtre paramétrable 7-14 jours (défaut 14) |
| Cascade item indispo | Liste de courses principale + liste secondaire physique (toggle sur chaque item) |
| Form-factor | Mobile exclusivement (foyer iPhone) |
| PWA installable | Décision reportée à la phase Architecture |

## Détails persona *(synthétisés dans le brief, conservés ici en intégralité pour PRD/UX)*

- **Aurélie** : conjointe de Lionel, d'origine vietnamienne, **infirmière (3 nuits/semaine en moyenne)**, prend l'inspiration recettes sur Instagram. Les soirs de travail, elle prépare son propre repas à emporter avant de partir. Fait les courses en ligne (La Belle Vie principal, Monoprix secondaire). Porteuse principale de la charge mentale repas/courses dans le foyer aujourd'hui.
- **Lionel** : conjoint, dev. Co-décideur du menu, cuisine pour lui + Rory les soirs où Aurélie travaille. Construit l'app.
- **Rory, 8 ans** (fils) : phase pâtes — demande un plat séparé fréquent (pâtes + légumes à côté). Compté comme un adulte en portion (simplification MVP).
- **Chien** : occupe l'espace familial, contribue à la difficulté de "bloquer du temps" mais hors-scope produit.

