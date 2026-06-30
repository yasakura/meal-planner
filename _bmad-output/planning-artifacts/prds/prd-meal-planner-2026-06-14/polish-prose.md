---
title: "Polish prose — PRD Meal Planner"
status: draft
created: 2026-06-30
reviewer: Editorial Review - Prose (bmad-editorial-review-prose)
target: prd.md (version post-structure, 2026-06-14)
purpose: "PRD MVP web app mobile foyer 3 personnes, document servant phases UX/Architecture/Implementation BMAD"
target_audience: "Sally UX / Winston Architecture / Amelia Dev / Lionel PM-dev"
reader_type: humans
language: fr
---

# Polish prose — PRD Meal Planner

## Verdict global

PRD globalement très propre, voix nettement maîtrisée *(prose dense, ton calibré, vocabulaire stable)*. Les anglicismes du domaine (« Slot », « Board », « tap », « swipe », « PWA », « MVP ») sont assumés et n'ont pas été touchés. Quatre erreurs **blocking** *(typo orthographique « coçable », accord « un cible / la garde-fou », phrase syntaxiquement cassée §6.2 v2+)* + une poignée de lourdeurs et d'inconsistances *(genre de « FR », guillemets droits résiduels, anglicismes maladroits ponctuels)* à corriger avant gel.

## Note de calibrage

- **Italiques** : préservés massivement *(citations brief, calibration tonale UX intentionnelle)*. Aucune suppression d'italique proposée.
- **Hedging** : non-attaqué quand il marque une assumption authentique *(« probablement », « pressenti » → délégations Architecture explicites)*. Attaqué uniquement quand purement parasitaire — aucun cas identifié dans ce passage.
- **Anglicismes du domaine** : conservés *(Slot, Board, swipe, tap, PWA, MVP, draft, soft-delete, drill-down, timestamp, dashboard, feature, ticket, nudges)*. Seuls les anglicismes superflus *(« challenger », « random »)* sont proposés à la révision.
- **Structure** : non-attaquée *(passe précédente)*.

---

## Fixes par sévérité

### BLOCKING *(erreurs grammaticales ou orthographiques objectives)*

| # | Localisation | Original | Révisé | Pourquoi |
|---|---|---|---|---|
| B1 | §4.6, FR-22, conséquences testables ligne 545 | « pas de contrainte imposée par le PRD au-delà du « lisible et **coçable** d'une main en magasin » » | « lisible et **cochable** d'une main en magasin » | Typo orthographique. Le verbe est *cocher* → adjectif *cochable* *(« ç » impossible devant « a » dans cette dérivation)*. |
| B2 | §6.2, v2+ Vision du brief ligne 674 | « Planification de la gamelle d'Aurélie en B2/B3 *(brief)* — portion supplémentaire du dîner du jour, restes J-1. **Reporté à l'usage révèle un besoin que B1+B4 ne couvrent pas.** » | « **Reporté jusqu'à ce que l'usage révèle un besoin que B1+B4 ne couvrent pas.** » | Phrase syntaxiquement défective : il manque la subordonnée temporelle entre « Reporté à » et « l'usage révèle ». Cassure de lecture. |
| B3 | §7, SM-C2, ligne 710 | « Le seuil 15-20 est **un cible naturelle** de **digitalisation de l'existant**, pas un objectif à courir. » | « Le seuil 15-20 est **une cible naturelle** de digitalisation de l'existant, pas un objectif à courir. » | Accord de genre : *cible* est féminin → *une cible naturelle*. |
| B4 | §7, SM-C3, ligne 711 | « Le proto précédent est mort de cette dérive. **NFR-X1 est la garde-fou.** » | « **NFR-X1 est le garde-fou.** » | Accord de genre : *garde-fou* est masculin invariable. |

---

### HIGH *(lourdeurs ou inconsistances qui dégradent la compréhension)*

| # | Localisation | Original | Révisé | Pourquoi |
|---|---|---|---|---|
| H1 | §4 entier — inconsistance | Inconsistance du genre attribué à **FR** : `Les FR sont **numérotés** globalement` (§4 intro, ligne 237, masc.) / `Toutes les FR de F2 sont lues` (§4.2, ligne 305, fém.) / `Cette FR est l'unique exception à NFR-X1` (§4.2 FR-6 NFRs, ligne 333, fém.) | Harmoniser au **masculin** *(cohérent avec l'intro §4 et avec « un Functional Requirement »)* : « **Tous les FR de F2 sont lus** », « **Ce FR est l'unique exception** ». | Inconsistance de genre sur un terme structurant employé ~50 fois dans le doc. Un seul choix à figer. |
| H2 | §4.1, FR-1, ligne 247 ; FR-2, ligne 261 ; §4.1 intro, ligne 241 | « Réalise **toutes les entry states** UJ-* » *(247)* / « Réalise **les entry states** UJ-* » *(261)* / « Réalise **les entry states de** UJ-… » *(241)* | Harmoniser. Deux options : *(a)* garder l'anglicisme assumé mais figer le **masculin** *(« réalise tous les entry states UJ-* »)* ; *(b)* traduire *(« réalise les états d'entrée UJ-* »)*. Préférence : (a) pour ne pas casser le vocabulaire des UJ. | Même mot, trois accords différents en 3 lignes. |
| H3 | §4.3, FR-13, ligne 411 | « **Geste depuis le Slot ouvre** une **vue de sélection** *(la vue listante de FR-10, ouverte en contexte « choisir pour ce Slot »)*. » | « **Un geste depuis le Slot ouvre** une vue de sélection… » | Article défini/indéfini manquant — sujet sans déterminant, lecture cassée. |
| H4 | §4.4, FR-18, conséquences testables ligne 480 | « L'**affichage tient à un coup d'œil** sur smartphone portrait, **sans scroll requis pour identifier** *(titre + Convives + état Recette/libre)*. » | « …sans scroll requis **pour l'identifier**… » *(ou : « pour identifier le Slot »)* | Verbe transitif *identifier* sans COD, lecture suspendue. |
| H5 | §4.3, FR-16, feature-specific NFRs ligne 449 | « La génération initiale *(FR-11)* peut accepter une latence un peu plus longue *(< 1s)* mais **doit rester instantanée perçue**. » | « …**doit rester perçue comme instantanée**. » | Construction inversée non-idiomatique. La forme standard est *perçue comme X*, pas *X perçue*. |
| H6 | §4.6, description ligne 535 | « La **seule innovation produit vraie du MVP** *(rien d'équivalent chez Jow ou autres apps grand public)*… » | « La **seule vraie innovation produit du MVP** *(rien d'équivalent chez Jow…)*… » | Ordre des adjectifs : *vraie* en position d'évaluation porte mieux devant le nom composé *innovation produit*. |

---

### MEDIUM *(anglicismes maladroits, ambiguïtés, lourdeurs mineures)*

| # | Localisation | Original | Révisé | Pourquoi |
|---|---|---|---|---|
| M1 | §4.7, NFR-X1 — Application ligne 588 | « Toute proposition UX qui requiert une saisie clavier dans ces flux est un signal **à challenger**. » | « …est un signal **à remettre en question** » *(ou : « à interroger »)*. | Anglicisme maladroit *(challenge ≠ contester en français)* — non assumé par le domaine, contrairement aux Slot/Board. |
| M2 | §4.7, NFR-X5, ligne 614 | « L'app est conçue, codée et maintenue par **un seul développeur** *(Lionel)*, sur son temps personnel, **en parallèle d'apprendre la méthode BMAD**. » | « …**en parallèle de son apprentissage de la méthode BMAD**. » | *En parallèle d'apprendre* est une construction lourde *(préposition + infinitif)*. La nominalisation rétablit le rythme. |
| M3 | §4.4, FR-19, conséquences testables ligne 487 | « Coût stockage négligeable pour un foyer ; si ça devient un sujet plus tard, **on tranchera une politique de purge** à ce moment-là. » | « …on **fixera une politique de purge** à ce moment-là. » *(ou : « on définira »)* | *Trancher* + *politique* est un calque maladroit. On *tranche une décision*, on *fixe une politique*. |
| M4 | §4.2, FR-10, ligne 365 | « Réalise **tout UJ qui implique** un accès aux Recettes. » | « Réalise **tous les UJ qui impliquent** un accès aux Recettes. » | *Tout UJ* singulier indéfini sonne juridique/anglicisant. Le pluriel est plus naturel et plus clair *(plusieurs UJ sont visés)*. |
| M5 | §3 Glossary — Liste secondaire ligne 234 | « **Persiste indéfiniment** tant que **tous les items ne sont pas cochés** *(U17)* » | « **Persiste indéfiniment** tant qu'**il reste des items non cochés** *(U17)* » | Négation universelle *(tous … ne sont pas)* est ambiguë en français — peut se lire « aucun n'est coché » au lieu de « il reste au moins un non coché ». La reformulation positive lève l'ambiguïté. |
| M6 | §2.3, UJ-4, beat 3 ligne 156 | « **Tous les items ne sont pas trouvés** *(épuisé, mauvais magasin, pas le temps)*. » | « **Certains items ne sont pas trouvés** *(épuisé, mauvais magasin, pas le temps)*. » | Même structure ambiguë que M5. *Certains* est le sens visé. |
| M7 | §4.6, notes ligne 578 | « *[NOTE FOR PM (UX)]* Le ratio temps de cochage / temps total en magasin doit rester minime : si l'app demande plus de 1 seconde pour acter un coche, Aurélie l'abandonnera. **Sally à confier.** » | « **À confier à Sally.** » | Phrase elliptique inversée — la forme standard *à X à Y* en français est *à Y à X* *(complément d'attribution avant)*. |
| M8 | §4.3, FR-12, ligne 404 | « La régénération **peut être réitérée** … — mais le **flux UX naturel** *(U2)* **invite après 1 ou 2 tentatives ratées à passer au choix manuel** *(FR-13)*. » | « …mais le flux UX naturel *(U2)* **invite à passer au choix manuel** *(FR-13)* **après 1 ou 2 tentatives ratées**. » | Le complément circonstanciel coincé entre verbe et infinitif coupe la lecture. Déplacement en fin de phrase. |

---

### LOW *(typos cosmétiques, espaces, choix mineurs — regroupés)*

| # | Localisation | Fix |
|---|---|---|
| L1 | Guillemets droits `"…"` résiduels au lieu des chevrons français `« … »` : §2.3 UJ-3 beat 2 ligne 135 *("marquer comme acheté")*, §2.3 UJ-3 edge case ligne 144 *("X items sur la secondaire")*, §4.1 FR-4 ligne 285 *("soir")*. | Harmoniser en `« … »` avec espaces insécables — cohérent avec le reste du doc qui utilise systématiquement les chevrons français. |
| L2 | §7, SM-C1 ligne 709 : « réduire le temps de SM-1 **en-dessous** de 5 minutes » | « **en dessous** » — sans trait d'union *(orthographe normée)*. |
| L3 | §4.6, FR-24 ligne 568 : « **non-réversible** » | « **non réversible** » *(sans trait d'union)* ou **irréversible** *(forme préférable)*. |
| L4 | §4.3, FR-11 ligne 392 : « tirage **random** dans le Catalogue » | « tirage **aléatoire** » — *random* est sans plus-value technique ici et casse la prose française. |
| L5 | §3 Glossary — Convive ligne 211 : « implicite par l'**appartenance à au moins un Slot** de ce Repas » | « implicite par l'**appartenance à un Slot au moins** » — alléger la collision *« à au »*. |

---

## Hors-périmètre — non touché

- **Italiques massifs** : voix calibrée *(citations brief, ton « pas plus beau, pas plus malin »)*. Préservés.
- **Anglicismes du domaine** : Slot, Board partagé, Catalogue, Fenêtre, draft, tap, swipe, long-press, drill-down, soft-delete, timestamp, dashboard, tab, PWA, MVP, FR, NFR, UJ, OQ, SM, last-write-wins, CRDT, feature, ticket, nudges, schema.org, JSON-LD — **tous conservés**, ils font partie du vocabulaire technique stabilisé du projet.
- **Termes du Glossary** : aucune reformulation suggérée — ils sont scellés et utilisés à l'identique par les phases aval *(consigne explicite §3 intro)*.
- **Citations brief en italique** *(« pas plus beau, pas plus malin », « le moment où Aurélie ajoute une recette… », « l'app sert le foyer, pas l'inverse », etc.)* — préservées telles quelles.
- **Hedging volontaire** *(« probablement Firebase Auth », « stack technique tranchée par Architecture »)* — marque une délégation explicite, **pas un flou** : préservé.

---

## Notes pour Lionel

- Les fixes **B1-B4** sont objectifs et non discutables — à appliquer.
- **H1** *(genre de FR)* mérite un arbitrage rapide *(masc. ou fém. ?)* ; ma recommandation est le masculin pour rester aligné sur l'intro §4 et sur la majorité des occurrences. À harmoniser via un find/replace ciblé.
- Les **M1 à M8** sont du polish de confort : aucun ne casse la compréhension, mais ils enlèvent du grain dans la lecture *(en particulier M5/M6 qui suppriment une ambiguïté logique réelle)*.
- Les **L1 à L5** sont cosmétiques — l'inconsistance guillemets droits / chevrons est la plus visible à l'œil.

Aucune note structurelle, aucune contestation de fond. Le PRD est prêt à passer le filtre prose une fois ces ~15 fixes appliqués.
