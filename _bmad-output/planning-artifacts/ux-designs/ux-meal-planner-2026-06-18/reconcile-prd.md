---
title: "Réconciliation PRD ↔ Spines UX (DESIGN.md + EXPERIENCE.md)"
status: draft
created: 2026-06-30
project: meal-planner-bmad
inputs:
  - "_bmad-output/planning-artifacts/prds/prd-meal-planner-2026-06-14/prd.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-meal-planner-2026-06-18/DESIGN.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-meal-planner-2026-06-18/EXPERIENCE.md"
scope: "Audit de fidélité PRD → 2 spines UX. Pas de génération nouvelle."
---

# Réconciliation PRD ↔ Spines UX

## Verdict global

Les 2 spines couvrent **22 FR sur 24** avec une fidélité élevée au PRD, tranchent **7 OQ UX sur 8** *(OQ-3 partiellement)*, et respectent les **5 NFRs cross-cutting** ainsi que la calibration tonale du §1 Vision *(« personne ne s'énerve », « pas de dramatisation »)*. Deux gaps significatifs subsistent : **FR-19 (historique des Menus passés) silencieusement absent du modèle de navigation** et **catégorie « Autre » de fallback (FR-20) non opérationnalisée**. Plusieurs gaps mineurs *(FR-14 ajout Slot, FR-15 recalcul quantités, FR-2 fallback lien, FR-1 déconnexion, U20 validation champs obligatoires)* à reboucler avant la phase Architecture.

## Couverture FR (FR-1 → FR-24)

### F1 — Setup & Comptes

| FR | Statut | Localisation | Note |
|---|---|---|---|
| FR-1 — Création Compte + auth | OK partiel | EXPERIENCE State Patterns « Cold open — premier lancement » + Flow 2 « session persistante FR-1 » | La **déconnexion explicite** *(geste UX exigé par le PRD)* n'est pas patternée. Gap mineur. |
| FR-2 — Rattachement Board / QR | OK partiel | EXPERIENCE IA « Invitation QR » + Component Pattern « QR Setup affichage » *(rotation 5 min)*, DESIGN.components.qr-display | Le **fallback lien partagé** *(exigé par OQ-2 du PRD si scan QR ergonomiquement impossible)* n'est pas tranché. Gap mineur. |
| FR-3 — Définition Convives | OK | EXPERIENCE IA « Setup foyer » + State Pattern « Suppression Convive référencé » | Confirmation modale bien câblée à la non-réécriture des Slots historiques. |
| FR-4 — Pattern récurrent soirs-nuits | OK | EXPERIENCE IA « Setup foyer » + Flow 1 beat 4 *(« 3 Slots — pré-remplis selon le pattern récurrent »)* | Pattern « soir uniquement au MVP » implicite. |

### F2 — Catalogue

| FR | Statut | Localisation | Note |
|---|---|---|---|
| FR-5 — Import schema.org | OK | EXPERIENCE IA « Importer une Recette » + Flow 5 + State Pattern « Import Recette échec » | Fallback saisie manuelle proprement câblé. |
| FR-6 — Saisie manuelle | OK | EXPERIENCE Component Pattern « Champ saisie ingrédient » *(autocomplete, dropdown unité, stepper)* + DESIGN.components.ingredient-input | Friction soignée — NFR-X1 exception respectée. |
| FR-7 — Édition Recette | OK | EXPERIENCE IA « Recette — éditer » + Component Pattern « Carte Recette » *(autosave 600ms)* + Flow 5 variante édition | Tout Compte édite — U22 OK. |
| FR-8 — Notes libres | OK | EXPERIENCE Flow 5 variante édition *(« champ notes textarea simple — U22 »)* + DESIGN « Notes Recette en italique meta dans bloc dédié » | Champ unique respecté. |
| FR-9 — Suppression Recette | OK | EXPERIENCE Component Pattern « Ligne Recette compacte » *(swipe gauche → Supprimer)* + State Pattern « Suppression Recette utilisée dans Menu validé » | Confirmation modale + gel snapshot bien préservés. |
| FR-10 — Consultation Catalogue | OK | EXPERIENCE IA Tab « Catalogue » + Component Pattern « Ligne Recette compacte » + DESIGN.components.recette-row | Ordre chronologique inverse en *[ASSUMPTION]* — à valider, non bloquant. |

### F3 — Menu

| FR | Statut | Localisation | Note |
|---|---|---|---|
| FR-11 — Génération Menu draft | OK | EXPERIENCE Flow 1 beats 2-4 *(sélecteur 7-14j, pré-remplissage ~1s)* | Le cas Catalogue insuffisant traité State Pattern « Catalogue < 14 Recettes ». |
| FR-12 — Régénération auto Slot | OK | EXPERIENCE Component Pattern « Cellule Slot » *(bouton `Régénère` ghost)* + Flow 1 beat 5 + edge case | Pas de suggestion auto au-delà de 1 tentative — U2 OK. |
| FR-13 — Choix manuel Recette | OK | EXPERIENCE IA « Slot — détail / édition » + Component Pattern « Cellule Slot » *(bouton `Choisir…`)* | OK. |
| **FR-14 — Ajout / suppression / libre Slot** | **PARTIEL** | EXPERIENCE Component Pattern « Ligne Repas » *(swipe gauche sur Slot = supprimer)* | **L'ajout d'un Slot supplémentaire** *(brief : « 3 plats sur un même créneau »)* **n'a aucun geste / surface explicite.** Gap moyen. La transformation Slot ↔ Slot libre n'est pas non plus patternée. |
| **FR-15 — Ajustement Convives + recalcul** | **PARTIEL** | EXPERIENCE IA « Slot — détail / édition » *(« ajustement Convives »)* | Le **recalcul automatique au prorata** *(NFR feature-specific F3, formule explicite du PRD)* n'est pas spécifié comme pattern de réactivité ni testé en State Pattern. Gap mineur — la spine UX peut le laisser implicite, à condition que Architecture le prenne. |
| FR-16 — Validation Menu | OK | EXPERIENCE Component Pattern « Bouton « Valider le menu » » + Flow 1 beats 7-8 + DESIGN.components.primary-button | Modal de confirmation rapide + transition vers Listes. NFR-X2 servi. |

### F4 — Consultation Menu validé

| FR | Statut | Localisation | Note |
|---|---|---|---|
| FR-17 — Consultation Menu validé courant | OK | EXPERIENCE IA Tab « Menu » + Component Pattern « Ligne Repas » *(accordéon drill-down)* | U11 (drill-down par Repas) respecté. |
| FR-18 — Vue rapide « ce soir » < 5s | OK | EXPERIENCE IA Tab « Aujourd'hui » + State Pattern « Cold open — Menu validé en cours » + Flow 2 + Flow 2b | OQ-1 tranchée. Tabs secondaires `Lionel / Rory / Gamelle Aurélie` au top — design fort. |
| **FR-19 — Historique Menus passés** | **ABSENT** | Une seule mention *« FR-17, FR-19, lance FR-11 »* dans le tableau IA Tab Menu | **Aucune surface dédiée**, **aucun pattern d'accès**, **aucun flow** ne couvre l'historique *(« quand a-t-on fait les bo bun ? », « la semaine dernière on avait planifié quoi le mardi ? »)*. PRD : « tous les Menus validés sont conservés, lecture seule ». GAP HAUTE PRIORITÉ. |

### F5 — Liste principale

| FR | Statut | Localisation | Note |
|---|---|---|---|
| FR-20 — Agrégation auto + groupement catégorie | OK partiel | EXPERIENCE Flow 3 beat 2 *(« regroupée par catégorie — catégories décidées UX »)* + Component Pattern « Item Liste principale » + DESIGN.components.liste-principale-item | **La catégorie « Autre » obligatoire en fallback** *(exigée par le PRD §FR-20, signalée comme « tout Ingrédient non assignable »)* n'est PAS mentionnée dans les spines. Gap moyen — fallback essentiel pour ne jamais bloquer. OQ-3 reste partiellement ouvert *(taxonomie + méthode d'assignation pas tranchées par cette spine)*. |
| FR-21 — Bascule bidirectionnelle | OK | EXPERIENCE Component Pattern « Item Liste principale » et « Item Liste secondaire » *(swipe gauche dans les 2 sens)* + Flow 3 beats 4-5 | OQ-5 tranchée. Réinitialisation du compteur 24h au retour mentionnée. |

### F6 — Liste secondaire

| FR | Statut | Localisation | Note |
|---|---|---|---|
| FR-22 — Consultation hors-ligne | OK | EXPERIENCE Flow 4 + State Pattern « Offline — Liste secondaire en magasin » *(pas de bannière)* + Foundation PWA | OQ-9 adressée *(recommande PWA)*. |
| FR-23 — Cochage + soft-delete 24h | OK | EXPERIENCE Component Pattern « Item Liste secondaire » + Flow 4 beats 2-7 + edge case décochage | Pill ocre meta « coché 24h » + indicateur d'état toggle. Bien câblé. |
| FR-24 — Vidage manuel | OK | EXPERIENCE IA « Vider » + Component Pattern « Bouton primaire » *(« Vider la Liste secondaire » avec confirmation)* | Confirmation explicite respectée. |

## Statut des OQ UX (OQ-1 à OQ-8)

| OQ | Statut | Localisation / Note |
|---|---|---|
| **OQ-1** — Vue rapide « ce soir » | **Tranchée** | Tab « Aujourd'hui » avec Slot du créneau courant en évidence + tabs secondaires Lionel/Rory/Gamelle pour soirs-nuits. |
| **OQ-2** — Invitation QR | **Tranchée partiellement** | QR + rotation 5 min + countdown + detection auto. **Fallback lien partagé non précisé.** À reboucler. |
| **OQ-3** — Catégorisation Ingrédients | **PARTIELLEMENT EN SUSPENS** | « Regroupée par catégorie » mentionné mais **taxonomie exacte non tranchée** *(légumes / viandes / etc. = exemples)*, **méthode d'assignation non tranchée** *(saisie volontaire, dictionnaire, classification auto)*, **fallback « Autre » absent**. |
| **OQ-4** — Ergonomie saisie F2 | **Tranchée** | Autocomplete dès 2 caractères, dropdown unité, stepper, presse-papier intelligent *([ASSUMPTION] iOS UIPasteboard)*. |
| **OQ-5** — Geste bascule principale ↔ secondaire | **Tranchée** | Swipe gauche dans les 2 sens. |
| **OQ-6** — Visibilité X items sur secondaire | **Tranchée** | Badge meta « X items sur secondaire » en haut de l'onglet principal *(Flow 3 beat 6)*. |
| **OQ-7** — Format Liste secondaire | **Tranchée** | Item + indicateur d'état toggle + pill « coché 24h ». |
| **OQ-8** — Vue Menu draft densité / hiérarchisation | **Tranchée** | Liste verticale scrollable, Slots inline accordéon, 2 boutons ghost par Slot *(`Régénère` + `Choisir…`)*. |

## Respect des U-décisions (U1 → U26)

| U | Statut | Note |
|---|---|---|
| U1 | OK | « Pas de tap utile » sur Item Liste principale, pas de checkbox — DESIGN + EXPERIENCE. |
| U2 | OK | Régénération 2 temps via boutons `Régénère` puis `Choisir…`. Pas de suggestion au-delà de 1 tentative ratée. |
| U3 | OK | Pattern récurrent paramétré + suppression ponctuelle Slot gamelle par swipe. |
| U4 | OK | Liste principale reste affichée après commande — Flow 3 beat 6. |
| U5 | OK | Partage entre 2 Comptes implicite — State Pattern « Sync conflict ». |
| U6 | OK | Bouton primary « Valider le menu » + Menu validé persistant. |
| U7 | OK | Flow 1 « Variante observable » solo. |
| U8 | OK | Recette ultra-simple absorbée dans modèle Recette *(Flow 2 beat 4 « Ratatouille en boîte + falafels airfryer »)*. |
| U9 | OK | Pas de geste de modification du Menu validé en cuisson — Flow 2 edge case explicite. |
| U10 | OK | « Sync conflict — coche concurrente : last-write-wins ». |
| U11 | OK | Drill-down par Repas via accordéon. |
| U12 | OK partiel | Agrégation + groupement par catégorie respectés ; **catégorie « Autre » manquante** *(voir OQ-3)*. |
| U13 | OK | Swipe gauche bidirectionnel. |
| U14 | N/A | Hors-scope MVP. |
| U15 | OK | Format tranché par UX. |
| U16 | OK | Soft-delete 24h via pill + décochage réversible. |
| U17 | OK | Persistance + vidage manuel via FR-24 + pas de purge auto. |
| U18 | OK | Hors-ligne + sync silencieuse au retour réseau. |
| U19 | OK | Import schema.org + fallback saisie manuelle. |
| **U20** | **PARTIEL** | Les champs obligatoires *(titre, ingrédients avec quantités, nombre de Convives de référence)* ne sont pas formellement opérationnalisés *(validation du formulaire, blocage de la sauvegarde si vide)*. Gap mineur. |
| U21 | OK | Pas de typage gamelle — Catalogue neutre, Slot gamelle libre par défaut. |
| U22 | OK | Édition tout Compte + pas d'historique + textarea note unique. |
| U23 | OK | URL source mentionnée DESIGN.components.recette-card *(« URL source : meta ink-secondary, tap-to-open »)*. |
| U24 | OK | Modèle 1 Board partagé implicite. |
| U25 | OK | Terme « Slot » utilisé partout. |
| U26 | OK | Pas de flag d'absence — gestion implicite par Slots. |

## NFRs cross-cutting (NFR-X1 → NFR-X5)

| NFR | Statut | Note |
|---|---|---|
| **NFR-X1 — Zéro saisie** | OK | DESIGN « la friction-zéro de NFR-X1 s'incarne sur les écrans fonctionnels ». EXPERIENCE Foundation + Interaction Primitives *(stepper +/− pour éviter clavier)*. Aucun composant ne réclame de saisie hors FR-6. |
| **NFR-X2 — Performance perçue** | OK | EXPERIENCE Flow 1 *(« pré-remplit en ~1s »)* + Flow 2b *(« < 5 secondes »)* + State Pattern Loading *(« < 1s typique »)*. |
| **NFR-X3 — Cohérence éventuelle** | OK | EXPERIENCE State Pattern « Sync conflict — last-write-wins (NFR-X3) ». Pas de mécanique live-sync. |
| **NFR-X4 — Souveraineté données** | OK implicite | Pas d'analytics tiers / tracking — Rejected push notifications de re-engagement. Aucune mention explicite mais aucun élément contredit. |
| **NFR-X5 — Soutenabilité 1 dev** | OK | DESIGN Brand & Style + Typography *(polices iOS natives, pas de web font, mode sombre reporté)*. EXPERIENCE Foundation *(pas de système UI tiers — MUI / shadcn / Tailwind UI bannis)* + Rejected animations en cascade au scroll *(« coûteux à maintenir — NFR-X5 »)*. |

## Calibration tonale et Counter-metrics

| Élément | Statut | Note |
|---|---|---|
| « Personne ne s'énerve » | OK | EXPERIENCE Voice and Tone *(« aucun message ne doit signifier 'tu as fait bien' ou 'tu as fait mal' »)* + DESIGN Brand & Style *(« pas de couleurs d'erreur agressives »)*. |
| « Pas de dramatisation » | OK | Microcopy « Aucune connexion — tes coches seront synchronisées au retour réseau. » *(vs. « Erreur réseau ! Réessayer ? »)*. État offline sans bannière. |
| « Pas de gamification anxiogène » | OK | EXPERIENCE Rejected « Streaks / gamification » + Interaction Primitives bannis *(streaks, suivi régularité, badge counts sur tabs)*. |
| « Pas de notifications culpabilisantes » | OK | EXPERIENCE Rejected « Push notifications de re-engagement » *(« anxiogènes ou intrusives — zéro notification push au MVP »)*. |
| SM-C1 *(pas réduire SM-1 au prix de la concertation)* | OK | Aucun élément n'optimise contre la session duo. |
| SM-C2 *(ne pas gonfler Catalogue)* | OK | EXPERIENCE Rejected « Suggestions algorithmiques de Recettes » — découverte vient d'Aurélie / Lionel uniquement. |
| SM-C3 *(pas plus joli au prix de la friction de saisie)* | OK | DESIGN Do's and Don'ts *(polices iOS natives, pas de web font, hairlines au plus bas)* + Champ saisie ingrédient soigné. |

## Gaps prioritaires (synthèse)

### Haute sévérité

- **GAP-H1 — FR-19 (historique des Menus passés) sans surface ni pattern.** Le PRD exige *« tous les Menus validés conservés », « lecture seule », « la réponse est trouvable en quelques taps »*. EXPERIENCE.md le mentionne uniquement comme tag *(« FR-17, FR-19 »)* dans le tableau Tab Menu sans définir comment y accéder. **Localisation : EXPERIENCE.md.IA, tableau Tabs principaux + Carte de navigation.** Action attendue : ajouter une surface secondaire *(modale ou full-screen pushed)* « Historique des Menus » accessible depuis le tab Menu, + State Pattern *(« Pas encore d'historique » pour les premières semaines)* + éventuel Flow d'accès *(« quand a-t-on fait les bo bun ? »)*.

### Moyenne sévérité

- **GAP-M1 — FR-14 : ajout d'un Slot supplémentaire à un Repas non patterné.** Le PRD exige explicitement le cas *« ajouter un Slot ‹ plat Rory › à un Repas familial »*. EXPERIENCE.md couvre suppression *(swipe gauche)* mais pas ajout. **Localisation : EXPERIENCE.md.Component Patterns « Ligne Repas » + IA « Slot — détail / édition ».** Action attendue : geste d'ajout *(bouton inline `+ Slot` sous les Slots existants, ou via Slot — détail)*.

- **GAP-M2 — Catégorie « Autre » de fallback FR-20 non opérationnalisée.** Le PRD exige *« tout Ingrédient non assignable tombe dans une catégorie 'Autre' affichée en fin de Liste »*. Spines silencieuses. **Localisation : EXPERIENCE.md.Component Patterns « Item Liste principale » ou State Patterns.** Action attendue : confirmer comportement *(section « Autre » en bas de Liste principale + mécanique de recatégorisation manuelle UX-décidée)*.

- **GAP-M3 — OQ-3 partiellement en suspens.** La taxonomie exacte des catégories d'Ingrédients et la méthode d'assignation *(saisie volontaire, dictionnaire interne, classification auto, à la demande)* ne sont pas tranchées par la spine UX. **Localisation : EXPERIENCE.md.IA + Component Patterns.** Action attendue : Sally doit choisir une méthode *(probablement dictionnaire interne minimal + fallback Autre + recatégorisation à la demande)*.

### Basse sévérité

- **GAP-B1 — FR-2 fallback lien partagé non précisé.** OQ-2 du PRD demande explicitement *« fallback (lien partagé) si scan impossible »*. EXPERIENCE.md ne le mentionne pas. **Localisation : EXPERIENCE.md.Component Patterns « QR Setup affichage ».**

- **GAP-B2 — FR-1 déconnexion explicite absente.** Geste UX exigé par le PRD. **Localisation : EXPERIENCE.md.IA « Setup foyer » ou Component Patterns.**

- **GAP-B3 — U20 validation des champs obligatoires non patternée.** *(titre, ingrédients avec quantités, nombre de Convives de référence)* — pas de pattern de blocage de la sauvegarde si vide. **Localisation : EXPERIENCE.md.Component Patterns « Champ saisie ingrédient » ou State Patterns.**

- **GAP-B4 — FR-15 recalcul automatique des quantités au prorata Convives non spécifié comme pattern de réactivité.** PRD exige la formule + recalcul immédiat. **Localisation : EXPERIENCE.md.IA « Slot — détail / édition » ou Component Patterns.** Peut rester implicite si Architecture le prend, mais à signaler.

- **GAP-B5 — Nombre de Convives de référence (champ obligatoire Recette, exigé U20 + FR-5/FR-6)** : non mentionné explicitement dans le pattern de formulaire d'import / saisie. Mention dans DESIGN « durée + Convives de référence en meta » sur Carte Recette mais pas dans le pattern de saisie. **Localisation : EXPERIENCE.md.Component Patterns « Champ saisie ingrédient » + flow 5.**

## FR orphelins

**1 FR significativement orphelin** *(absent du modèle de navigation)* :
- **FR-19** — Consultation de l'historique des Menus passés.

**2 FR partiellement orphelins** *(mention mais pas opérationnalisation)* :
- **FR-14** — Ajout d'un Slot supplémentaire *(suppression OK, ajout non patterné)*.
- **FR-15** — Recalcul automatique des quantités au prorata Convives *(ajustement Convives mentionné, recalcul non patterné)*.

## OQ encore en suspens

**1 OQ partiellement en suspens** :
- **OQ-3** — Catégorisation des Ingrédients : taxonomie exacte + méthode d'assignation + fallback « Autre ».

**1 OQ partiellement tranchée** :
- **OQ-2** — Fallback lien partagé en cas d'impossibilité du scan QR non précisé.

*(Les OQ-9 à OQ-19 relèvent d'Architecture ou de revue 3 mois — hors-scope de cette réconciliation UX.)*

## Conclusion

Les spines DESIGN.md + EXPERIENCE.md constituent une **base solide** pour le passage en Architecture, mais nécessitent **1 ajout structurel** *(surface Historique pour FR-19)* + **2 compléments comportementaux** *(ajout Slot FR-14, fallback Autre FR-20)* + **1 décision UX** *(taxonomie + assignation catégories Ingrédients OQ-3)* avant d'être considérées complètes. Les 5 gaps de basse sévérité peuvent être traités en passe de finalize sans rouvrir de discussion structurante.
