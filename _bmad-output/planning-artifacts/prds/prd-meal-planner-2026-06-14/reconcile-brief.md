---
title: "Réconciliation Brief → PRD — Meal Planner"
status: review
created: 2026-06-30
project: meal-planner-bmad
inputs:
  - "_bmad-output/planning-artifacts/briefs/brief-meal-planner-2026-06-12/brief.md"
  - "_bmad-output/planning-artifacts/prds/prd-meal-planner-2026-06-14/prd.md"
---

# Réconciliation Brief → PRD

## 0. Objet

Relire le **brief** *(document source d'origine)* et vérifier que le **PRD** finalisé ne laisse rien d'important silencieusement tomber — particulièrement la matière **qualitative** *(tonalité, ressenti, ambition émotionnelle)* et les **phrases cardinales** que le format FR peut consommer en silence. Le périmètre exclut explicitement la persona/scènes détaillées *(addendum)*, les décisions D1-D6 *(tranchées en U1-U26)* et le hors-scope structurel *(§5/§6.2 PRD)*.

## 1. Verdict global

**Largement couvert.** Les chiffres cardinaux *(2h15, 45 min, < 5 min, 3 mois, 15-20 recettes, 7-14 jours, fenêtre par défaut 14, 3 charges mentales en cascade)* sont **fidèlement** transposés. La condition d'arrêt et la phrase *« l'app sert le foyer, pas l'inverse »* sont reprises **textuellement** au §1 Vision et §7 SM-STOP. Les jobs émotionnels et sociaux du brief *(rente cognitive perpétuelle, dimanches matin, rééquilibrage du couple, méta-job BMAD)* sont consolidés au §2.1 du PRD. **Restent quelques gaps qualitatifs** principalement sur la **tonalité différenciante** et l'**ambition d'évolution dans le temps** — pas de blocage rédhibitoire mais ces nuances méritent d'être consciemment réinjectées avant la phase UX/Architecture.

## 2. Gaps identifiés *(par sévérité décroissante)*

### G1 — Phrase cardinale « pas plus beau, pas plus malin qu'une app grand public — exactement calibré pour nous, et possible à faire évoluer au fil de notre vie » *(sévérité : moyenne)*

**Brief :** cette phrase apparaît au §Résumé exécutif comme **manifeste différenciateur** du produit. Elle porte trois éléments cumulés : *(a)* renoncement explicite à la compétition esthétique/intelligence, *(b)* précision de cible, *(c)* **évolutivité au fil de la vie du foyer**.

**PRD :** la moitié *(a)* + *(b)* est reformulée au §5 Non-Goals — *« elle accepte d'être moins polie, moins jolie, moins astucieuse, en échange d'une précision de cible »* — bonne reformulation mais qui perd la force assertive du brief. **Le bloc *(c)* « possible à faire évoluer au fil de notre vie » est diffusé entre la Vision §1 *(« patrimoine culinaire numérique »)* et NFR-X5 *(soutenabilité 1 dev)*, mais l'idée d'**adaptation aux évolutions de la vie du foyer** *(changements de rythme d'Aurélie, Rory qui grandit)* n'est pas portée explicitement.

**Recommandation :** envisager de citer **textuellement** la phrase du brief dans la Vision du PRD — c'est un repère de calibration UX très utile pour Sally *(éviter la dérive cosmétique, voir aussi SM-C3)* et Winston *(éviter les abstractions prématurées, voir aussi NFR-X5)*.

### G2 — Phrase cardinale « le moment où Aurélie ajoute une recette ne doit jamais être l'endroit où elle abandonne l'app » *(sévérité : moyenne)*

**Brief :** §« Pourquoi construire plutôt qu'utiliser ce qui existe ». **C'est la leçon centrale du proto précédent**, formulée comme un principe d'action très direct.

**PRD :** l'esprit est repris à plusieurs endroits *(F2 description, NFR-X1, OQ-4 « budget de soin disproportionné », SM-3 « aucun blocage rédhibitoire »)*, mais la **formulation directe** n'apparaît jamais. La force d'un principe d'action formulé à la 1ʳᵉ personne du foyer est diluée dans des termes plus neutres *(« friction historique critique », « point de friction historique le plus important »)*.

**Recommandation :** envisager de citer la phrase textuellement dans F2 §description ou en exergue de OQ-4 *(délégation Sally)* — c'est exactement le type de citation qui survit au passage en story et en code review *(« Sally a-t-elle conçu cette friction comme si Aurélie pouvait abandonner ? »)*.

### G3 — Nuance émotionnelle « personne ne s'énerve dans ce foyer ; c'est précisément ce qui rend la friction invisible et durable » *(sévérité : moyenne)*

**Brief :** §Le problème. Cette nuance est **structurante** : elle explique pourquoi le problème mérite d'être résolu malgré son apparence anodine, et pourquoi le foyer n'a **jamais** spontanément cherché à le résoudre par lui-même. Elle calibre aussi l'**ambition** du produit *(pas un sauvetage, une élégance silencieuse)*.

**PRD :** §1 Vision reprend bien le pendant matériel — *« Le coût de la friction supprimée n'est pas spectaculaire […] c'est précisément ce qui le rend durable »* — mais le **pendant émotionnel** *(« personne ne s'énerve »)* est absent. Or, c'est exactement cette nuance qui doit guider la **tonalité UX** *(pas de dramatisation, pas de gamification, pas de notifications anxiogènes)*.

**Recommandation :** ajouter une demi-phrase dans la Vision §1 ou dans §2.1 *(jobs émotionnels)* — la nuance protège l'UX d'une dérive « problème-solution dramatique » étrangère à la réalité du foyer.

### G4 — Ambition d'évolution « l'app vit avec le foyer » *(sévérité : basse-moyenne)*

**Brief :** dernier paragraphe de la §Vision — *« L'app vit avec le foyer : elle s'adapte aux changements de rythme d'Aurélie, à Rory qui grandit — il manifeste déjà ponctuellement l'envie de cuisiner avec ses parents, l'app pourra l'accompagner dans ce mouvement »*.

**PRD :** la §1 Vision parle bien du **patrimoine culinaire numérique** à 2-3 ans, et de la **phase pâtes de Rory** comme étape transitoire — mais **l'idée que l'app accompagne les changements de la vie du foyer** *(rythme d'Aurélie, Rory en cuisine)* est silencieuse. C'est une **promesse de longévité** importante pour SM-7 *(au moins une feature v2 désirée à 6 mois)* et SM-8 *(toujours utilisée)*.

**Recommandation :** une demi-ligne dans la Vision §1 — *« l'app vit avec le foyer, suit ses évolutions »* — suffit. Pas besoin d'expliciter Rory-en-cuisine comme story de v2, juste préserver l'ambition.

### G5 — Détail scénique « Rory (8 ans) et le chien occupent activement l'espace » *(sévérité : basse)*

**Brief :** §Le problème — image très efficace qui ancre la friction des « 45 minutes d'affilée impossibles à dégager ».

**PRD :** §1 Vision reprend *« dans une cuisine où l'espace mental est occupé par un enfant de 8 ans et un chien »* ✓ — **présent**. Faux gap. *(Lecture initiale de ma part avait raté cette occurrence, je rectifie.)*

### G6 — Robustesse face aux services externes « rien […] ne mette en péril le patrimoine accumulé » *(sévérité : basse)*

**Brief :** dernier paragraphe de la §Vision — point de **souveraineté formulé en risque** *(un service externe qui ferme, un changement de drive en ligne)*.

**PRD :** NFR-X4 *(souveraineté)* couvre l'esprit *(« pas de tracking tiers », « pas d'export automatique », « récupération du Catalogue »)*. Le motif **« service externe qui ferme »** comme risque concret n'est pas nommé — AS-1 et OQ-15 *(export JSON)* sont la trace pragmatique. **Acceptable** mais on perd la coloration *« l'app appartient au foyer, et lui survivra aux dépendances »*.

**Recommandation :** mineure — éventuellement ajouter une phrase dans NFR-X4 sur la résilience aux dépendances externes *(parsing schema.org, drive…)*. À pondérer avec le souci de ne pas surcharger.

### G7 — « Mort-né » du proto précédent *(sévérité : très basse)*

**Brief :** §« Pourquoi construire plutôt qu'utiliser ce qui existe » — formulation forte.

**PRD :** F2 description dit *« la feature sur laquelle le proto précédent est mort »*, SM-C3 dit *« le proto précédent est mort de cette dérive »* — équivalent sémantique, le terme « mort-né » est plus poétique mais l'esprit est intact. **Non-gap.**

## 3. Inputs implicites du brief non-mentionnés au PRD

Repassés au crible — la plupart sont en réalité tracés :

- **« Aurélie utilise déjà Jow ponctuellement »** : mentionné dans SM-STOP *(« de tête + Jow »)*. Pas mentionné en §2 ou §5 comme contexte de positionnement. **Mineur** *(connu par les 2 décideurs Lionel/Aurélie, sans valeur opérationnelle pour les phases aval)*.
- **« Aurélie d'origine vietnamienne »** : couvert par l'addendum + §1 Vision PRD *(« les recettes vietnamiennes d'Aurélie »)*. **OK**.
- **« La cascade item-indispo n'est pas résolue à la source »** : limite assumée du brief, reprise dans §5 Non-Goals *(« Pas connecté aux drives au MVP »)* et §6.2 *(« hors-scope définitif »)*. **OK**.
- **« 3 fois par mois la session menu »** : volumétrie mentionnée au brief, pas reprise au PRD. **Mineur** *(orienterait éventuellement un calcul de soutenabilité mais sans impact FR)*.

## 4. Commitments chiffrés / seuils — table de réconciliation

| Brief | PRD | État |
|---|---|---|
| Session-rituel 45 min | §1 Vision, §7 SM-1 | ✓ |
| Cible 3 mois < 5 min, *changement de nature* | §1 + §7 SM-1 + SM-C1 | ✓ |
| Fenêtre 7-14j, défaut 14 | Glossary + FR-11 | ✓ |
| 2h15/mois temps arraché | §1 Vision | ✓ |
| 15-20 recettes à 1 mois | SM-3 | ✓ |
| Catalogue ~15 recettes « de tête » | SM-3 | ✓ |
| 3 charges mentales en cascade | §1 + UJ-3 + UJ-4 climaxes | ✓ |
| Soirs-nuits = 3 plats parallèles | UJ-1 + Glossary Slot + FR-11 | ✓ |
| Condition d'arrêt à 3 mois | SM-STOP | ✓ (textuel) |
| Historique « ~2-3 semaines » | FR-19 = **pas de limite** | **Évolution explicite** *(décision séance — Lionel : « iii »)*, tracée — pas un gap |
| Soft-delete 24h | FR-23 / U16 | **Innovation séance** *(absent du brief)* — pas un gap |
| Foyer iPhone, mobile-only | §1 + §5 Non-Goals | ✓ |
| Vue rapide « ce soir » < 5s | FR-18 + NFR-X2 | ✓ |
| 2 Comptes pour 1 Board | FR-2 + Glossary | ✓ |

## 5. Synthèse — actions suggérées *(non-bloquantes)*

Aucun gap **haut**. Les 4 gaps **moyens** *(G1, G2, G3, G4)* sont **qualitatifs** et concernent la **tonalité émotionnelle** + 2 **citations cardinales** que le format FR a consommées en silence. **Suggestions concrètes**, à arbitrer par Lionel-en-tant-que-PM :

1. **G1 + G2 — Citer textuellement** les 2 phrases cardinales du brief dans la Vision §1 ou en exergue de F2 :
   - *« pas plus beau, pas plus malin qu'une app grand public — exactement calibré pour nous, et possible à faire évoluer au fil de notre vie »*
   - *« le moment où Aurélie ajoute une recette ne doit jamais être l'endroit où elle abandonne l'app »*

2. **G3 — Réinjecter la nuance émotionnelle** « personne ne s'énerve » dans §1 ou §2.1, pour calibrer la tonalité UX *(éviter dramatisation/gamification)*.

3. **G4 — Préserver l'ambition d'évolutivité** *(« l'app vit avec le foyer »)* dans la Vision §1 — demi-phrase suffit.

4. **G6 — Optionnel** : ajouter une demi-phrase à NFR-X4 sur la résilience aux dépendances externes *(pas critique)*.

Ces ajouts représentent **≤ 5 lignes** au total, n'affectent aucun FR ni aucune décision UX/Architecture, mais réancrent la **précision qualitative** du brief dans le document que UX/Architecture/Dev vont effectivement lire.

---

*Fin de la revue. Tous les autres éléments du brief — décisions D1-D6, persona, scènes, hors-scope structurel — sont déjà tracés en U1-U28, §2/§3/§4/§5/§6/§7/§8 du PRD.*
