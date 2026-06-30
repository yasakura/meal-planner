## Document Summary
- **Purpose:** PRD pour MVP d'une web app mobile de planification de repas pour un seul foyer ; document servant ensuite les phases UX (Sally), Architecture (Winston) et Implementation (Amelia) de la méthode BMAD.
- **Audience:** décideurs et constructeurs en aval — Sally pour l'UX, Winston pour l'Architecture, Amelia pour la Dev, plus Lionel comme PM/dev.
- **Reader type:** humans
- **Structure model:** hybride **Strategic/Context (Pyramid)** + **Explanation (Conceptual)** — la nature *journey-led* (UJ-1 à UJ-5 ancrant tout le §4 Features) est préservée et calibre les recommandations : pas de coupes qui aplatissent les scènes.
- **Current length:** ~13 940 mots répartis sur 10 sections (§0 à §9), avec un sous-arbre dense en §2.3 (5 UJ) et §4 (6 features × FR-1 à FR-24).

**Calibrage appliqué.** Le PRD est substantiel et a passé sa relecture qualité (rubrique 6/7 strong, 1 adequate, 0 critique). Les recommandations ci-dessous visent **uniquement** les vraies redondances et les frictions structurelles qui pèseront sur les phases aval. Aucune coupe cosmétique n'est proposée. La nature journey-led — y compris ses flourishes émotionnels qui calibrent la tonalité pour Sally et Winston — est préservée par défaut.

## Recommendations

### 1. CONDENSE — Les `[NOTE FOR PM (UX/Architecture)]` inline du §4 dupliquent les délégations du §8 Open Questions
**Rationale :** La majorité des notes inline du §4 sont déjà tracées dans §8 (F1 Notes ↔ OQ-2 + OQ-12 ; F2 Notes ↔ OQ-4 + OQ-11 ; F3 Notes ↔ OQ-8 + OQ-14 ; F6 Notes ↔ OQ-9 + OQ-10). Le §8 doit rester **la single source of truth** des délégations ; le §4 doit *pointer* vers §8, pas *recopier* le contenu. Remplacer chaque bloc `[NOTE FOR PM (X) : ...long descriptif...]` par un renvoi court `→ OQ-N` *(ou ajouter une OQ manquante quand la note n'a pas son équivalent : c'est le cas de la note F4 sur l'arbitrage des 3 surfaces de consultation, de la note F5 sur split-view drive / règle dimanche, de la note F6 sur le ratio cochage)*. Préserve le pointeur, élimine la duplication.
**Impact :** ~300-400 mots économisés ; surtout, supprime un *risque de désynchro* entre §4 et §8 *(quand une OQ est résolue ou reformulée, on n'oublie plus d'aller mettre à jour la note inline correspondante)*.
**Comprehension note :** Aucun. Les lecteurs aval qui parcourent §4 sont aiguillés vers §8 par un renvoi explicite.

### 2. QUESTION — NFR-X4 « récupérer son Catalogue (JSON export) » entre en contradiction avec la résolution de OQ-15
**Rationale :** NFR-X4 affirme *« le foyer doit pouvoir récupérer son Catalogue sous une forme lisible (JSON export, ou équivalent — mais la capacité doit exister) »*, puis renvoie en NOTE FOR PM vers OQ-15. Or OQ-15 a été **résolue en séance finalize** comme **hors-MVP** *(souveraineté de fait via la stack — Firestore en console pour un dev)*. Une exigence NFR ne devrait pas pointer vers une OQ tranchée dans l'autre sens. Décision auteur : soit on **affaiblit NFR-X4** *(« souveraineté de fait via accès console à la stack ; pas de capacité applicative au MVP »)*, soit on **réouvre OQ-15** et NFR-X4 redevient cohérente. Sinon, contradiction logique qui piégera Winston en phase Architecture.
**Impact :** ~20 mots économisés ou réécrits, mais surtout cohérence rétablie.
**Comprehension note :** Risque concret de mauvaise lecture par Winston si laissé tel quel.

### 3. CONDENSE — §5 Non-Goals chevauche §6.2 Out of Scope sur ~5 items
**Rationale :** Le PRD énonce explicitement la séparation *(« §5 frontières larges ; §6.2 exclusions tactiques par FR »)* — mais 5 items du §5 *(Pas multi-foyer, Pas un assistant nutritionnel, Pas un anti-gaspi, Pas connecté aux drives, Pas une IA)* dupliquent des entrées de §6.2 *(hors-scope définitif et v2+)* sans apporter de valeur cadrante supplémentaire. Conserver en §5 uniquement les **vraies positionnements de produit** *(Pas grand public, Pas business, Pas une plateforme de partage de recettes, Pas desktop/tablette, Pas hors-iOS)* qui ne sont *pas* tactiques. Les 5 items chevauchants peuvent être supprimés du §5 *(déjà en §6.2)* ou cross-référencés en 1 ligne *(« cf. §6.2 pour le détail roadmap : multi-foyer, nutritionnel, anti-gaspi, drives, IA — tous hors-scope par construction »)*.
**Impact :** ~150 mots économisés ; §5 redevient strictement vision-level.
**Comprehension note :** Aucun. Le lecteur qui veut le détail tactique va en §6.2 ; le §5 garde son rôle de cadrage.

### 4. CONDENSE — §1 Vision contient une couche de prose stylistique qui duplique le brief
**Rationale :** Le §1 fait ~450 mots, dont une moitié est constituée de **flourishes émotionnels** *(« Personne ne s'énerve dans ce foyer », « pas plus beau, pas plus malin qu'une app grand public », « L'app vit avec le foyer », « L'app sert le foyer, pas l'inverse »)* qui sont déjà présents dans le Product Brief amont — explicitement signalé en §0 *(« il ne duplique pas la matière du brief »)*. Le PRD se trahit ici sur sa propre règle. Garder : la **vision-mantra** *(1 phrase)*, le **journey opening** *(le Menu pré-rempli, le balayage rapide)*, la **tone-calibration directive pour l'UX aval** *(« pas de dramatisation, pas de gamification anxiogène, pas de notifications culpabilisantes »)* — qui *est* du contenu PRD-utile. Couper : les italiques de remémoration *(« 2h15/mois », « patrimoine culinaire numérique », « livre de cuisine vivant »)* et la condition d'arrêt redite *(elle est en SM-STOP au §7)*.
**Impact :** ~150-200 mots économisés ; §1 devient un vrai *headline de pyramide*.
**Comprehension note :** Trade-off conscient — la tonalité « pas de drame » qui calibre Sally et Winston DOIT rester. Ne couper que ce qui réplique le brief mot pour mot.

### 5. CONDENSE — Les « Description » introductives des features §4.2 à §4.6 portent du contenu déjà couvert ailleurs
**Rationale :** Les paragraphes d'introduction de F2 *(« Friction historique critique — c'est sur cette feature que le proto précédent est mort »)*, F3 *(« Cœur de la valeur perçue d'Aurélie le samedi matin »)*, F4 *(« Tout l'usage hors-session-menu »)*, F5 *(« L'écran qu'Aurélie consulte ~2 heures après »)*, F6 *(« La seule innovation produit vraie du MVP »)* re-évoquent à chaque fois la scène d'UJ déjà décrite intégralement en §2.3. Ces intros pèsent ~50-80 mots chacune. Recommandation : garder **1 phrase d'ancrage** par feature *(« F3 réalise UJ-1 intégralement et conditionne UJ-2/2b/3/4 »)* + le pointeur vers le principe transverse *(ex. NFR-X1 pour F2, source unique en cuisson pour F4)*. Couper les redites de scène. Exception : la **phrase cardinale du brief en F2** *(« Le moment où Aurélie ajoute une recette ne doit jamais être l'endroit où elle abandonne l'app »)* est load-bearing — PRESERVE.
**Impact :** ~150-250 mots économisés cumulés.
**Comprehension note :** Trade-off conscient — l'introduction d'une feature joue un rôle de respiration entre les FR denses. Limiter la coupe à *« qui réalise quoi »* + principe transverse, ne pas tomber en mode catalogue sec.

### 6. CUT — §2.1 sous-section « Méta-Job — assumé » (Lionel apprend BMAD)
**Rationale :** Ce méta-job *(« Apprendre la méthode BMAD sur un projet réel »)* concerne **l'existence du projet**, pas **le produit**. Une analyse JTBD répond à *« quel job le produit fait-il pour son utilisateur ? »* — apprendre BMAD n'est pas un job que le produit Meal Planner accomplit. Le co-moteur du projet est déjà nommé dans le Product Brief *(et reconnu en §1 du PRD)*. Le placer dans une grille JTBD le légitime à tort comme exigence produit. À couper, ou à remonter dans §1 comme contexte d'amorçage *(1 ligne)*.
**Impact :** ~30-40 mots.
**Comprehension note :** Aucun. Pour les downstream agents *(Sally, Winston, Amelia)*, ce méta-job ne génère aucune exigence — il n'a aucune trace en §4 ni en §7.

### 7. CUT — §6.2 sous-section « Sous contrainte d'Architecture » (PWA installable) duplique OQ-9
**Rationale :** Cette sous-section contient un seul item *(« PWA installable — D6 brief, à confier à l'Architecture »)* qui est strictement identique à OQ-9 du §8. Le §6.2 est censé être la liste *tactique* des exclusions ; or PWA n'est pas une exclusion mais une décision d'architecture **à prendre**. Bonne maison : §8 *(et c'est déjà là — OQ-9)*. Couper la sous-section §6.2 *(libère 1 niveau de sous-titre et clarifie que §6.2 = exclusions, §8 = décisions à prendre)*.
**Impact :** ~30-40 mots ; surtout, clarification de la sémantique des sections.
**Comprehension note :** Aucun.

### 8. CONDENSE — UJ-1 « Persona + contexte » duplique §2 (Aurélie, foyer iPhone, etc.)
**Rationale :** Le bloc *« Persona + contexte »* de UJ-1 répète des informations déjà installées au §2 *(Aurélie infirmière, 3 nuits/semaine, foyer iPhone, Catalogue ~20 recettes)*. Les UJ suivants *(UJ-2, UJ-3, UJ-4)* cross-référencent élégamment vers UJ-1 *(« persona détaillée UJ-1 »)*. UJ-1 lui-même pourrait faire de même vers §2 et ne garder dans son entry state que les **éléments situationnels nouveaux** *(« samedi matin, ~10h, café », « fenêtre de planification en cours arrive à échéance »)*.
**Impact :** ~40-50 mots économisés.
**Comprehension note :** Aucun. La scène reste pleinement lisible.

### 9. CONDENSE — §0 paragraphe « Structure du document »
**Rationale :** Le 2ᵉ paragraphe du §0 *(« Vocabulaire ancré au §3 Glossary… Features groupées au §4… Les NOTE FOR PM sont des délégations… »)* est utile à la 1ʳᵉ lecture mais pèse ~100 mots de méta-orientation que les agents aval *(qui consultent le PRD en mode reference après une 1ʳᵉ lecture)* ne reliront pas. Garder le 1ᵉʳ paragraphe *(rôle du document + relation au brief — load-bearing)* ; condenser le 2ᵉ paragraphe en 3-4 lignes *(« Vocabulaire au §3 ; FR globalement numérotés FR-1 à FR-24 ; décisions UX au .decision-log U1-U26 ; arbitrages ouverts au §8 »)*. Ce *(parmi les recommandations 1-9)* est le moins critique — laisser au pouvoir d'arbitrage du PM.
**Impact :** ~40-50 mots.
**Comprehension note :** Aucun pour les downstream agents.

### 10. QUESTION — Ordre §4 Features vs §6 MVP Scope : pyramide stricte voudrait l'inverse
**Rationale :** Le modèle Strategic/Context (Pyramid) prescrit *« conclusion/recommandation en tête »* — donc le tableau récapitulatif §6.1 *(6 features, FR couverts, capacité métier)* devrait précéder le détail des features §4. Le journey-led l'a placé après le détail. Recommandation soft : envisager de **déplacer §6.1 In Scope juste après §3 Glossary** *(comme « TLDR fonctionnel »)*, en gardant §4 en aval pour le détail. §6.2 Out of Scope reste à sa place actuelle, peut-être renommé. **Trade-off** : un lecteur de bout en bout perd l'effet de découverte des features à travers les UJ. Un lecteur en mode reference y gagne. Choix auteur. *(Recommandation classée QUESTION, pas MOVE — la décision dépend de la posture de lecture privilégiée.)*
**Impact :** 0 mots, restructuration.
**Comprehension note :** Le ré-ordonnancement renforcerait la posture pyramide pour les lecteurs en mode reference. Pour les lecteurs séquentiels, peut casser un effet de découverte.

### 11. PRESERVE — §3 Glossary
**Rationale :** Section MECE, dense, sans redondance interne, **vocabulaire load-bearing** pour Sally et Winston *(qui doivent reprendre les termes à l'identique selon §0)*. Les quelques rappels en §4 *(ex. champs obligatoires de Recette en FR-6)* sont des renforcements légitimes, pas des redondances — un FR doit être lisible sans aller-retour permanent vers le Glossary.
**Impact :** 0 mots (renoncement explicite à toute coupe ici).
**Comprehension note :** Coupe ici dégraderait fortement la qualité de référence pour les phases aval.

### 12. PRESERVE — §2.3 Key User Journeys (structure path / climax / resolution / edge case)
**Rationale :** C'est le **cœur journey-led** du PRD. La structure narrative *(entry state → path → climax → resolution → edge case → variante)* est exactement ce dont Sally a besoin pour concevoir les écrans, et ce dont Winston a besoin pour comprendre les contraintes hors-ligne / multi-Comptes. Les « climax » nommés explicitement *(« la 2ᵉ charge mentale est supprimée »)* tracent le lien aux Success Metrics §7. Coupe ici = perte de pouvoir d'orientation pour le aval.
**Impact :** 0 mots.
**Comprehension note :** Cette section est ce qui justifie le format PRD entier ; la préserver est une décision structurelle.

### 13. PRESERVE — Counter-metrics SM-C1 à SM-C4 et SM-STOP
**Rationale :** Contenu distinctif — **les counter-metrics calibrent le jugement aval** *(SM-C1 protège la concertation Aurélie-Lionel, SM-C2 protège contre le gonflement artificiel, SM-C3 protège NFR-X1, SM-C4 et SM-STOP protègent contre l'investissement par culpabilité)*. Aucune coupe ne peut compenser leur fonction de garde-fou.
**Impact :** 0 mots.

### 14. PRESERVE — Flourishes émotionnels qui calibrent la tonalité UX
**Rationale :** Les phrases en italiques telles que *« L'app sert le foyer, pas l'inverse »*, *« pas de drame »*, *« pas de gamification anxiogène »* ne sont **pas** des fioritures littéraires — ce sont des **directives tonales pour Sally** *(qui décidera des notifications, des animations, du wording d'erreurs)* et **pour Amelia** *(qui décidera du tone of voice des copies)*. Couper trop large en §1 priverait l'aval de cette calibration. Limiter la coupe en reco #4 aux *vraies* duplications avec le brief — pas aux directives tonales.
**Impact :** 0 mots, marquage explicite.

## Summary
- **Total recommandations :** 14 (dont 6 CONDENSE/CUT actionnables, 2 QUESTION à arbitrer par le PM, 1 QUESTION de réordonnancement, 4 PRESERVE explicites, 1 contradiction interne à résoudre).
- **Estimated reduction :** ~700-900 mots, soit **~5-6 %** de la longueur actuelle *(13 940 mots)*. La cible n'est pas la réduction de volume mais l'élimination des duplications avec §8 *(reco #1)* et avec le brief *(reco #4)*.
- **Meets length target :** Pas de cible définie en input *(« le PRD doit être complet — pas de cible artificielle »)*. Les coupes proposées sont substantives, pas cosmétiques.
- **Comprehension trade-offs :** Aucune coupe n'altère la nature *journey-led* ni la qualité de référence pour les downstream agents *(Sally, Winston, Amelia)*. Les trade-offs sont explicités sur les recos #4 *(flourishes du §1)* et #5 *(intros de features)* — limiter la coupe pour préserver respectivement la calibration tonale et la respiration narrative.

### Plan d'action priorisé (si toutes recommandations acceptées)
1. **Bloquant logique** : reco #2 (contradiction NFR-X4 vs OQ-15 résolue) — à trancher avant tout *(20 mots, mais cohérence interne)*.
2. **Plus haut gain structurel** : reco #1 (`[NOTE FOR PM]` ↔ §8) — gain de cohérence + ~300-400 mots.
3. **Frontières §5/§6.2** : reco #3 — clarification de la sémantique + ~150 mots.
4. **Prose §1 et intros §4** : recos #4 + #5 — gain ~300-450 mots cumulés, attention aux trade-offs.
5. **Petits ajustements** : recos #6, #7, #8, #9 — cumulés ~150 mots, tous neutres en compréhension.
6. **Décision auteur** : reco #10 (réordonnancement) — à arbitrer selon posture de lecture privilégiée.
