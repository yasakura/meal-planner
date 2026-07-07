---
title: Polish EXPERIENCE.md — review structure + prose
target: EXPERIENCE.md
reviewer: éditeur polish BMAD (structure puis prose)
reader_type: humans
audience: Sally UX, Winston Architecture, Amelia Dev, Lionel PM-dev
date: 2026-07-01
---

# Polish — EXPERIENCE.md

Deux passes séquentielles : **structure d'abord** (cuts / merges / moves), **prose ensuite** (fixes de comm). Chaque finding est localisé et propose une correction actionnable.

---

## Document Summary

- **Purpose:** EXPERIENCE.md, spine comportementale UX pour app mobile Meal Planner (IA, comportements, flows nommés). Servira Sally (UX), Winston (Architecture), Amelia (Dev).
- **Audience:** Sally UX, Winston Architecture, Amelia Dev, Lionel PM-dev.
- **Reader type:** humans.
- **Structure model:** hybride — Reference/Database (IA, Component Patterns, State Patterns) + Explanation (Foundation, Voice) + Tutorial/Guide journey-led (Key Flows).
- **Current length:** ~5100 mots, 9 sections canoniques.
- **Sections canoniques préservées :** Foundation, IA, Voice/Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Inspiration & Anti-patterns, Key Flows. ✓

---

## Verdict global

Document dense, bien structuré, calibration tonale cohérente. **Un conflit de contenu bloquant** entre Interaction Primitives (long-press interdit pour actions métier) et deux autres endroits qui utilisent long-press pour ré-assigner une catégorie. Reste : quelques redondances vraies à consolider, une catégorie mal placée, deux fragments prose à retoucher. Rien qui touche les Key Flows ni la spine.

---

## PASSE 1 — STRUCTURE

### 1. QUESTION / CONFLIT — Long-press pour ré-assignation catégorie
**Localisation :**
- Foundation §Catégorisation des Ingrédients, ligne 32, point *(c)* : *« l'apprentissage par usage (long-press sur un item de Liste principale → menu contextuel Ranger dans une catégorie…) »*
- State Patterns, ligne 136 (Ingrédient sans catégorie) : *« Long-press sur l'item → menu contextuel Ranger dans une catégorie… »*
- Interaction Primitives, ligne 149 : *« Long-press = réservé à la sélection de texte iOS native. Pas d'action métier sur long-press »*

**Rationale :** Contradiction directe. Un lecteur (Amelia notamment) ne peut pas trancher entre les deux règles. Il faut soit changer la primitive (autoriser long-press ici seulement), soit changer le geste de la catégorisation (tap sur pill « Autre », swipe droit dédié, action dans un menu du header, etc.).
**Action proposée :** Trancher (décision UX/PM). Recommandation par défaut : remplacer les 2 mentions de long-press par un **tap sur l'ingrédient en catégorie « Autre » → sheet iOS `Ranger dans…`**, ce qui préserve la primitive et donne un geste découvrable.
**Impact :** ~15 mots + cohérence système restaurée.
**Sévérité :** BLOCKING (contradiction de spec).

### 2. CONDENSE — Préambule Foundation (ligne 17)
**Rationale :** ~170 mots pour défendre la convention de nommage des tokens. Utile mais la défense (« volontairement plus légère », « soutenabilité 1 dev — NFR-X5 ») déborde sur la spine. La convention et la règle de conflit suffisent — le rationale D-UX7 vit déjà dans `.decision-log.md`.
**Action proposée :** Réduire à 3 lignes : convention (nom seul), unicité garantie par frontmatter DESIGN.md, règle de conflit — puis renvoyer vers `.decision-log.md` pour le pourquoi.
**Impact :** ~80 mots gagnés.
**Sévérité :** MEDIUM.

### 3. MERGE — Catégorisation Ingrédients : Foundation ↔ State Patterns
**Localisation :**
- Foundation §Catégorisation, lignes 30-33
- State Patterns « Ingrédient sans catégorie », ligne 136

**Rationale :** La méthode d'assignation (dictionnaire interne, apprentissage par usage) est décrite dans Foundation ET reformulée dans State Patterns. Le pattern d'apprentissage n'est pas un « état » — c'est un mécanisme du modèle. Le vrai state est : « ingrédient non catégorisé → tombe dans Autre ».
**Action proposée :** Garder la description complète dans Foundation. Dans State Patterns, réduire la ligne « Ingrédient sans catégorie » à : *« Apparaît dans catégorie **Autre** en fin de liste (fallback FR-20). Ré-assignation : voir Foundation §Catégorisation. »*
**Impact :** ~40 mots gagnés + une source de vérité.
**Sévérité :** MEDIUM.

### 4. MOVE — « Contexte scène opérationnelle » (ligne 141)
**Localisation :** State Patterns, dernière ligne du tableau *(sub-meta informationnelle)*.
**Rationale :** Ce n'est pas un état système (pas déclenché par une condition applicative) — c'est un **composant d'orientation** (« sub-meta contextuelle »). Sa présence est décidée par le designer scène par scène, pas par un état de la donnée.
**Action proposée :** Déplacer vers Component Patterns comme nouvelle ligne **« Sub-meta contextuelle »** (usage : Aujourd'hui, Listes ; règle : facultative, constative, sous le titre).
**Impact :** 0 mot ; clarification taxonomique.
**Sévérité :** MEDIUM.

### 5. CUT — Annotations `*(décidé)*` et rationales-décision inline
**Localisations :**
- Component Patterns, ligne 121 : *« Tabs secondaires Aujourd'hui *(décidé)* »* — le marqueur `(décidé)` n'appartient pas à la spec livrée.
- Component Patterns, ligne 119 : *« Pas de bouton « réutiliser ce Menu » au MVP (complexité gestion des Recettes supprimées entre-temps — reporté post-MVP) »* — rationale décision.
- Inspiration & Anti-patterns, ligne 199 : *« Une éventuelle notification système liée à la commande hebdo… sera reconsidérée à 3 mois, après confirmation explicite du besoin par Aurélie. »* — engagement de roadmap.

**Rationale :** Ces méta-notes décrivent des décisions ou des roadmaps. Leur place est dans `.decision-log.md`, pas dans la spine comportementale que consultera Amelia à l'implémentation.
**Action proposée :** Cut inline, transférer vers `.decision-log.md` si pas déjà tracé.
**Impact :** ~40 mots gagnés + spec plus propre.
**Sévérité :** LOW.

### 6. QUESTION — Redondance légère « suggestion catégorie » (Component Patterns)
**Localisation :** Component Patterns « Champ saisie ingrédient », ligne 116 : *« Suggestion de catégorie au moment de la 1ʳᵉ création d'un Ingrédient inconnu — pré-remplie par heuristique (dictionnaire interne — voir Foundation) »*
**Rationale :** Bonne pratique — la note renvoie déjà vers Foundation. Aucune vraie duplication. À conserver tel quel.
**Action proposée :** PRESERVE. Ce n'est pas de la redondance : c'est une contextualisation du composant.
**Impact :** 0.
**Sévérité :** — (mention pour éviter un cut abusif).

### 7. PRESERVE — Signposting « [X] vit dans DESIGN.md »
**Localisation :** Voice/Tone (ligne 87), Component Patterns (ligne 105), Accessibility Floor (ligne 158).
**Rationale :** Répété 3 fois, mais chaque occurrence signale au lecteur *où finit la spine comportementale et où commence la spine visuelle*. C'est du signposting fonctionnel, pas de la duplication. Un lecteur qui saute directement à Accessibility Floor a besoin du rappel.
**Action proposée :** PRESERVE.
**Impact :** — (justification défensive).

### 8. PRESERVE — Key Flows journey-led
**Localisation :** Flows 1 → 5.
**Rationale :** Contrainte utilisateur explicite (« ne les compresse pas au point de perdre les protagonistes/scènes/climax »). Les climax beats sont nommés, les protagonistes sont là, les edge cases n'alourdissent pas.
**Action proposée :** PRESERVE.
**Impact :** —.

### Résumé structure
- **Total recommandations :** 8 (1 BLOCKING, 3 MEDIUM, 1 LOW, 2 PRESERVE, 1 QUESTION).
- **Réduction estimée :** ~160 mots (~3% du document).
- **Meets length target :** N/A (pas de cible).
- **Comprehension trade-offs :** aucun cut ne touche un aide-lecture, un exemple, ou un flow.

---

## PASSE 2 — PROSE

Ces fixes s'appliquent **après** les fixes structure ci-dessus. Ne pas polir ce qui va être coupé.

| Original Text | Revised Text | Changes |
|---|---|---|
| Ligne 244 : *« soit une Recette (elle **clique** pour drill-down) »* | *« soit une Recette (elle **tape** pour drill-down) »* | Terminologie mobile cohérente avec le reste du doc (Interaction Primitives, ligne 147 : « Tap = action principale »). « Clique » est un verbe desktop. |
| Ligne 23 : *« Si PWA, écran de premier lancement « Ajouter à l'écran d'accueil » à proposer. »* | *« Si PWA, proposer un écran de premier lancement « Ajouter à l'écran d'accueil ». »* | Fragment de phrase (verbe en fin, sans sujet). Inverser lève l'ambiguïté de portée. |
| Ligne 27 : *« La règle de conflit s'applique aux 2 spines. »* | *« La règle de conflit entre spec et implémentation s'applique aux 2 spines. »* OU faire pointer explicitement vers la règle nommée. | Antécédent flou : « La règle de conflit » présuppose que le lecteur sait de quelle règle il s'agit. |
| Ligne 32 : *« peuplé progressivement par (a)…, (b)…, (c)… »* — énumération dense de 4 lignes | Passer en liste à puces `- (a) imports schema.org/Recipe (…) / - (b) saisie manuelle (…) / - (c) apprentissage par usage (…)`. | La phrase courante fait 4 lignes en une seule respiration ; la liste rend chaque source d'assignation scannable. Aucune perte de sens. |
| Ligne 83 : *« Modales empilent **un niveau max**, jamais deux. »* | *« Les modales s'empilent sur **un niveau max**, jamais deux. »* | Ajout de l'article défini + du réfléchi ; le fragment sans déterminant lit télégraphique dans un doc autrement complet. |
| Ligne 112 : *« Au-delà de 1 tentative ratée de régénération, l'app **ne suggère pas** »* | *« Après une tentative ratée de régénération, l'app **ne suggère pas** »* | « Au-delà de 1 » est stilté en français ; « Après une » exprime le même seuil naturellement. |
| Ligne 113 : *« trace meta ocre 250ms »* (idem ligne 254) | *« trace meta ocre (250ms) »* | La durée soudée au nom du composant lit comme un identifiant. Parenthèse pour marquer la spécification numérique. Cohérence : appliquer aux 2 occurrences. |
| Ligne 218 : *« les soirs où Aurélie travaille **montrent** 3 Slots »* | *« les soirs où Aurélie travaille **contiennent** 3 Slots »* | « Montrent » personnifie le soir. « Contiennent » est neutre et exact. |
| Ligne 253 : *« Items en body + quantité mono right-aligned. »* | Conserver (jargon dev assumé, audience cible OK) mais retoucher la ponctuation : *« Items en `body`, quantité en `mono` alignée à droite. »* | Le fragment mélange langue et pseudo-code sans séparateurs. Backticks explicitent les noms de tokens, virgule remplace le `+`. |
| Ligne 264 : *« l'app affiche la liste comme si elle était en ligne »* | *« l'app affiche la liste normalement — aucune indication d'état réseau »* | « Comme si elle était en ligne » sous-entend une simulation. Le comportement réel est : pas d'affichage d'état. Reformulation lève l'ambiguïté. |
| Ligne 268 : *« Coches persistées localement. »* | *« Les coches sont persistées localement. »* | Fragment nominal isolé, pas dans un tableau. Réintroduction du sujet + auxiliaire pour cohérence avec la prose environnante. |
| Ligne 285 : *« champ notes (textarea simple — U22) → autosave »* | *« champ notes (textarea simple — U22), autosave au champ flou »* | Alignement avec la convention établie ailleurs dans le doc (Carte Recette ligne 109 : « Autosave au champ flou (débounce 600ms) »). Rend la règle d'autosave uniforme entre Carte Recette et notes. |

**Non-corrigés (conformes au calibrage utilisateur) :**
- Termes anglais assumés : `swipe`, `tap`, `split-view`, `autocomplete`, `VoiceOver`, `Dynamic Type`, `backdrop-filter`, `PWA`, `MVP`, `MECE`, `role`, `state`, `body`, `mono`. ✓
- Références aux tokens DESIGN.md par nom seul (`accent-primary`, `surface-base`, `ink-secondary`, `ink-disabled`, `surface-raised`). ✓ (D-UX7)
- Vouvoiement dans les *exemples de mauvaise microcopy* de Voice/Tone et dans les *anti-patterns rejetés* (« Vous pourriez aimer… ») : intentionnel — mime la copie à éviter. ✓

---

## Ordre d'application recommandé

1. **BLOCKING (finding #1)** : trancher long-press vs. autre geste avec Sally et Lionel avant tout autre fix — impact cascade sur 3 sections.
2. **Structure MEDIUM (findings #2, #3, #4)** : cuts, merge Catégorisation, move Sub-meta contextuelle.
3. **Structure LOW (finding #5)** : nettoyer les annotations décision.
4. **Prose (12 fixes tableau)** : appliquer après stabilisation structure — inutile de polir des phrases qui seront réécrites par les fixes structurels.

Une fois les 4 étapes appliquées : re-lecture rapide (Sally) pour vérifier qu'aucun renvoi croisé (`voir Foundation`, `voir Component Patterns`) n'est cassé.
