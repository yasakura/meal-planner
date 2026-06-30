# PRD Quality Review — Meal Planner (2026-06-14)

## Overall verdict

PRD globalement **solide** pour les stakes annoncés (hobby/foyer-perso) et les 3 phases aval BMAD qu'il alimente. Vision spécifique au foyer (pas swappable), thèse claire (3 charges mentales en cascade), UJs avec protagonistes nommés et beats concrets, NFRs avec seuils chiffrés, Non-Goals robustes, Open Questions ownerées. Les risques résiduels sont **mécaniques** (ID drift U1-U28 vs U1-U26) et **un trou modèle** (référence Convives pour les quantités, FR-15/FR-20) qui bloquera l'engineer si non comblé avant Implementation. Prêt à nourrir UX (Sally) puis Architecture (Winston) moyennant trois fixes ciblés.

## Decision-readiness — strong

Le PRD acte les décisions au lieu de les enrober. Le `.decision-log.md` est référencé inline (U1-U26) et chaque arbitrage UX du brief a été transformé en exigence concrète ou en Open Question owneré. Les trade-offs sont nommés avec ce qui est cédé : pas d'anti-récence inter-Fenêtre au MVP (FR-11, « cohérent avec pioche basique »), pas de live-sync (NFR-X3), 2 Comptes max (FR-2). Les `[NOTE FOR PM]` (UX) (Architecture) tombent sur de vraies tensions (saisie F2 / vue rapide « ce soir » / catégorisation Liste principale / sync conflit F6 / concurrence Menu draft), pas sur des checkpoints de confort. Les Open Questions §8 sont réellement ouvertes (la plupart sont des délégations explicites à UX ou Architecture, ce qui est la lecture honnête de leurs zones de responsabilité). Quelques décisions auraient pu être tranchées au PRD plutôt que reportées (yield d'une Recette, voir Done-ness) mais c'est local.

### Findings
*(aucune finding critique/haute ici — les manques se reportent sur Done-ness)*

## Substance over theater — strong

Aucune persona theater : 3 protagonistes réels (Aurélie, Lionel, Rory), pas de fiches synthétiques, contexte (gardes d'Aurélie, phase pâtes de Rory, foyer iPhone) tiré du brief et **utilisé** dans les UJs et les FRs (FR-4 pattern récurrent ↔ Aurélie ; UJ-2 + U8 ↔ Lionel solo avec Rory). La Vision §1 est non-swappable : retire les noms et elle ne tient plus. L'innovation est nommée pour ce qu'elle est (F6 Liste secondaire « seule innovation produit vraie du MVP »), sans claim plus large. NFR-X1 (« Zéro saisie = scénario réussi ») est posé en garde-fou méthodologique avec sa justification historique (mort du proto précédent) — pas un slogan. Les NFRs ont des seuils (<200ms, <1s, <5s, soft-delete 24h, hors-ligne FR-22) plutôt que des adjectifs.

### Findings
*(rien à signaler — c'est la dimension la plus propre du PRD)*

## Strategic coherence — strong

Thèse explicite et opérationnalisée : *« supprimer la session-rituel + 2 charges mentales en cascade »* (§1). Les 6 Features s'alignent : F1 (setup) → F2 (Catalogue, le moteur) → F3 (Menu, le moment 45 min → 5 min) → F4 (consultation, sur-mesure des soirs-nuits) → F5 (Liste principale, supprime la 2ᵉ charge) → F6 (Liste secondaire, supprime la 3ᵉ charge). Les Success Metrics valident la thèse plutôt qu'une activité : SM-1 (durée session), SM-2 (Aurélie ne reconstitue plus), SM-5 (l'app survit aux nuits), SM-STOP (condition d'arrêt assumée). Counter-metrics présents et bien ciblés (SM-C1 protège la concertation, SM-C3 protège NFR-X1 contre la tentation cosmétique). MVP scope cohérent avec la forme du produit (consumer-experience, journey-led).

Une remarque mineure : F1 porte 4 FRs (Auth + invitation + Convives + pattern) qui sont chacune atomiques mais l'ensemble est dense pour un onboarding hobby. Acceptable — le pattern récurrent (FR-4) est *cardinal* pour le pré-remplissage du Menu et mérite son rang.

### Findings
*(aucune finding à enregistrer)*

## Done-ness clarity — adequate

C'est la dimension la plus à risque pour Implementation. La majorité des 24 FRs ont des « Conséquences (testables) » concrètes (FR-11 contrainte de non-répétition, FR-16 immutabilité du Menu validé, FR-23 soft-delete 24h, FR-15 recalcul automatique au prorata). Les NFRs cross-cutting (NFR-X2 surtout) bornent la perf. Les délégations UX/Architecture sont explicites et tracées en OQ — ce n'est pas du flou, c'est du report ownerisé.

**Mais** deux trous nuiront à Amelia (Implementation) :

1. **Trou modèle FR-15/FR-20 — quantité de référence Convives.** FR-15 dit *« calculées à partir des quantités de référence stockées sur la Recette **(typiquement données pour 4 personnes, ratio appliqué)** »* — la mention « pour 4 personnes » est en parenthèse, pas normative. La Recette (§3 Glossary + FR-6) n'a **pas** de champ « yield » / « nombre de Convives de référence » obligatoire ; FR-6 liste comme obligatoires « titre + ingrédients (avec quantités) » sans yield. Pour une Recette importée via `schema.org/Recipe`, `recipeYield` existe ; pour une Recette en saisie manuelle, le yield est inconnu → le ratio Convives/yield est indéfini. **L'engineer ne peut pas implémenter FR-15 sans trancher ce point.**

2. **Catégorisation Liste principale (FR-20) sans default taxonomy.** Le PRD délègue entièrement la mécanique (taxonomie + méthode d'assignation) à OQ-3 (Sally). Acceptable en attendant la phase UX. Mais aucun garde-fou de « fallback catégorie 'Autre' » n'est posé ; sans default explicite, le risque côté implementation est de boucler en attente de la décision UX.

Autres notes :
- FR-18 « < 5 secondes » est concret et borné. ✓
- FR-22 « consultable hors-ligne » est testable mais FR-23 « la fenêtre de 24h court à partir du timestamp du geste local » impose une logique horloge-locale explicite — bien posé.
- FR-10 « ordre par défaut UX-décidé » : tolérable parce que le default ne change pas la sémantique métier.

### Findings
- **high** Trou modèle « yield Recette » (§4 FR-6 + FR-15 + FR-20) — La Recette n'a pas de champ « nombre de Convives de référence » obligatoire ; FR-15 mentionne « typiquement 4 personnes » entre parenthèses sans valeur normative. Sans yield, le ratio Convives/yield est indéfini, FR-15 et FR-20 ne sont pas implémentables. *Fix :* ajouter un champ obligatoire `convives_de_reference` (entier, défaut 4) sur Recette dans le Glossary §3 et dans FR-6, et reformuler FR-15 pour décrire le calcul exact `quantité_effective = quantité_référence × (|Convives_du_Slot| / convives_de_reference)`. Pour l'import schema.org, mapper sur `recipeYield`.
- **high** FR-20 catégorisation sans fallback explicite (§4.5 FR-20) — Mécanique entièrement déléguée à OQ-3 (Sally), mais aucune catégorie « Autre / Non classé » garantie si l'algorithme/dictionnaire UX échoue. L'engineer ne saura pas quoi afficher pour un Ingrédient inconnu. *Fix :* ajouter à FR-20 une conséquence testable : *« Tout Ingrédient non assignable à une catégorie connue tombe dans une catégorie 'Autre' affichée en fin de liste. »*
- **medium** AS-1 unique mais non confirmée (§9) — Le PRD reconnaît une seule hypothèse non confirmée (URL source stockée sur Recette, U23). À trancher avant Implementation. *Fix :* poser la question à Lionel en revue de PRD avant la phase UX, basculer en décision et purger AS-1.
- **medium** FR-13 référence UJ-1 beat 3 (§4.3) — FR-13 dit *« Réalise UJ-1 beat 2 (2ᵉ temps de U2) et UJ-1 beat 3 »*. UJ-1 beat 3 concerne les ajustements de Slots gamelle (suppression / Recette gamelle / Slot libre), pas le choix manuel d'une Recette. Le mapping plus exact serait UJ-1 beat 2 (2ᵉ temps) uniquement. *Fix :* retirer « et UJ-1 beat 3 » de FR-13, ou reformuler en « cas slot gamelle (UJ-1 beat 3) ».

## Scope honesty — strong

§5 Non-Goals couvre les frontières larges (pas grand public, pas multi-foyer, pas IA, pas nutritionnel, pas anti-gaspi, pas desktop) avec justification. §6.2 sépare proprement *(a) quick wins post-MVP*, *(b) v2+ Vision brief*, *(c) hors-scope définitif*, *(d) sous contrainte d'Architecture* — c'est une excellente lisibilité pour les phases aval. Le decision log est référencé pour les arbitrages tranchés. Les `[NOTE FOR PM]` tombent sur de vraies tensions reportées (export Catalogue NFR-X4, fenêtre 14j vs 10j OQ-18, environnements dev/prod OQ-19). La condition d'arrêt SM-STOP est conservée intégralement du brief — preuve d'honnêteté sur les stakes.

Densité d'open items (19 OQ + 1 AS + ~10 NOTE FOR PM ≈ 30) : élevée en absolu, mais **proportionnée à la nature du PRD** (consumer journey-led qui pousse sciemment toutes les questions UX à Sally et toutes les questions stack à Winston). Pas un blocker.

### Findings
*(aucune finding — scope explicitement et honnêtement borné)*

## Downstream usability — adequate

Glossary §3 substantiel et structuré par groupes (Comptes/Board, Catalogue, Planification, Listes). Vocabulaire réutilisé identiquement dans les FRs (Slot / Slot libre / Slot gamelle / Repas / Menu draft / Menu validé / Liste principale / Liste secondaire / Convives / Fenêtre). Les UJs ont un protagoniste nommé chacun (Aurélie pour UJ-1/3/4, Lionel pour UJ-2, Aurélie+Lionel pour UJ-5, Aurélie pour UJ-2b). Les FR sont contigus 1 → 24 sans gap, les UJ sont 1, 2, 2b, 3, 4, 5 (le « 2b » est explicité comme scène miroir, acceptable). Les SM sont organisés en Primaires/Secondaires/Counter/Stop avec cross-référence aux FRs.

**Mais** trois irritants vont peser sur l'extraction-source automatisée :

1. **ID drift U1-U28 vs U1-U26.** §0 dit *« U1-U28 »*, §9 dit *« U1-U28 »*, §4 (intro) dit *« U1-U26 »*. Le decision log s'arrête à U26 (les Us sont introduits dans l'ordre U1, U2, U3, U6, U7, U8, U9, U10, U11, U4, U5 (sic — introduits plus tard dans les micro-décisions F1), U12, U13, …, U26). UX/Architecture vont chercher U27 et U28 qui n'existent pas.

2. **Notation « U21/A »** (§3 Glossary, Slot gamelle) — Sans documentation in-line, le lecteur ne sait pas que « /A » signifie « option A de U21 ». À expliciter.

3. **Recette « yield » absent du Glossary** (cf. Done-ness finding) — UX et Architecture vont devoir le restituer chacun de leur côté.

### Findings
- **high** ID drift U1-U28 vs U1-U26 (§0 ¶2, §9 dernière ligne) — §0 et §9 annoncent « U1-U28 » alors que §4 intro et le decision log s'arrêtent à U26. Va casser la confiance des phases aval qui chercheront U27/U28. *Fix :* remplacer « U1-U28 » par « U1-U26 » dans §0 et §9 (ou inversement, ajouter U27/U28 dans le log s'ils étaient prévus — vérifier l'intention rédactionnelle).
- **medium** Notation « U21/A » non documentée (§3 Glossary, entrée « Slot gamelle ») — Le lecteur découvre « U21/A » sans clé de lecture. *Fix :* expliciter « U21, option A confirmée le 2026-06-17 » ou ajouter une note de notation en tête de §3.
- **medium** Recette : champ « yield / convives de référence » absent du Glossary §3 — Voir le finding *high* en Done-ness ; même fix.

## Shape fit — strong

PRD bien dimensionné pour un consumer mobile-only, journey-led, hobby/perso :

- **5 UJs principaux + 1 scène miroir (UJ-2b)** avec protagonistes nommés et beats explicites (entry state / path / climax / resolution / edge case). C'est la forme correcte pour un consumer product. Aucun UJ flottant.
- **NFRs avec seuils chiffrés** mais pas overkill (pas de SLA, pas de RTO/RPO, pas de quotas utilisateurs).
- **Pas de section investor / business case** — cohérent avec stakes hobby. La section §1 Vision termine sur la condition d'arrêt assumée plutôt que sur un OKR.
- **Délégations honnêtes** vers les phases aval (Sally / Winston) plutôt que sur-spécification PM.
- **Mobile-only + iOS-only** assumé et tracé (§5 + Non-Goals + NFR-X2 portrait smartphone).
- **Ton du brief préservé** (« Personne ne s'énerve dans ce foyer », « L'app sert le foyer, pas l'inverse ») qui calibre l'UX en aval contre la dramatisation/gamification.

Aucune over-formalisation (pas de section conformité/sécurité gonflée, pas de matrice RACI). Aucune sous-formalisation (le Glossary tient).

### Findings
*(aucune finding — la forme est bien choisie et tenue)*

## Mechanical notes

- **Glossary drift mineur.** « foyer » utilisé en prose ET dans des noms composés (« Setup foyer ») mais §3 prévient explicitement que ce n'est pas un terme du modèle (U24) — acceptable. Casing globalement consistant pour « Liste principale / Liste secondaire » (capitalisé). « Liste de courses agrégée » utilisé une fois en §1 Vision pour « Liste principale » — synonyme non-Glossary, mineur (c'est une formulation marketing-vision, pas une exigence FR).
- **ID continuity.** FR-1 → FR-24 contigus, uniques, sans gap. SM-1 → SM-8 + SM-C1 → SM-C4 + SM-STOP cohérents. OQ-1 → OQ-19 contigus. UJ-1, 2, 2b, 3, 4, 5 — le « 2b » est justifié. **U-IDs en drift** (§0 / §9 vs §4 vs decision log) — voir finding *high* Downstream usability.
- **Assumptions Index roundtrip.** Une seule entrée AS-1, indexée en §9 et référencée inline dans le commentaire de U23 du decision log. Roundtrip OK. *(Mais U23 reste désigné comme « `[ASSUMPTION à valider en finalize]` » dans le log — AS-1 est la traduction propre côté PRD.)*
- **UJ protagonist naming.** Chaque UJ ouvre par « Persona + contexte » avec protagoniste nommé et contexte inline. UJ-5 a deux protagonistes (Aurélie pour 5a, Lionel pour 5b, Aurélie/Lionel pour 5c) — acceptable parce que les sous-flux sont clairement séparés.
- **Required sections.** Toutes présentes pour les stakes : §0 Document Purpose, §1 Vision, §2 Target User (Jobs / Non-Users / Key UJs), §3 Glossary, §4 Features (FRs + NFRs feature + cross-cutting), §5 Non-Goals, §6 MVP Scope (In/Out/Architecture), §7 Success Metrics (Primary/Secondary/Counter/Stop), §8 Open Questions, §9 Assumptions Index. ✓
- **Cross-références hors-PRD.** Le PRD référence proprement le brief (D1, D2bis, D3, D5, D6) et indique en `U21` qu'une « révision officielle de D2bis » doit être tracée côté brief lors du prochain finalize. Bonne discipline.
- **U25 vs U26 sur la définition Slot.** Le §3 Glossary cite `(U25)` pour la formule « Slot = (Recette | vide) × Convives ». U25 acte le terme « Slot » lui-même, et U26 acte la sémantique « présence implicite par appartenance à un Slot ». La citation `(U25)` aurait pu être `(U25, U26)` mais c'est mineur.
