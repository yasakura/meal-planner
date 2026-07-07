# Spine Pair Review — Meal Planner

- **DESIGN.md** : `_bmad-output/planning-artifacts/ux-designs/ux-meal-planner-2026-06-18/DESIGN.md`
- **EXPERIENCE.md** : `_bmad-output/planning-artifacts/ux-designs/ux-meal-planner-2026-06-18/EXPERIENCE.md`
- **Reviewer** : rubrique BMAD UX (`bmad-ux/references/validate.md`)
- **Calibrage** : projet perso foyer 3 personnes, MVP iPhone Safari portrait. Exigence "substance honnête" > "design system enterprise". Mode sombre reporté post-MVP (D-UX5) et taxonomie Ingrédients simple sont des choix assumés, pas des trous.

## Overall verdict

La paire de spines est **prête à servir Architecture (Winston) et Implementation (Amelia)**. DESIGN.md tient l'identité « livre de cuisine vivant / Bear épure » avec des tokens YAML cohérents et une discipline éditoriale assumée. EXPERIENCE.md livre une IA claire, 6 Key Flows qui mappent exactement aux UJ-1..UJ-5(+2b,+5c) du PRD, et un floor accessibilité explicite. Quelques nettoyages chirurgicaux — une référence FR cassée, un `[ASSUMPTION]` UX non tranché, deux composants orphelins entre les deux fichiers — suffiraient à passer la barre de **strong** sur toutes les dimensions.

## 1. Spine completeness — strong

**Vérifié.** DESIGN.md a les 8 sections canoniques dans l'ordre verrouillé : Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's/Don'ts. EXPERIENCE.md a les 8 sections par défaut : Foundation, IA, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Inspiration & Anti-patterns, Key Flows. Section « Catégorisation des Ingrédients » sous Foundation est une invention défendable (résout OQ-3 PRD inline).

### Findings
*(aucun)*

## 2. Token coverage — strong

**Vérifié.** Token YAML couvre 22 couleurs (light + dark prévus pour v2, conforme D-UX5), 5 niveaux de typo (display/title/body/meta/mono), 4 rayons (sm/md/lg/full), 8 niveaux de spacing (0-7 = 0/4/8/12/16/24/32/48px), 11 composants nommés. Chaque token YAML est utilisé dans le corps DESIGN.md. Chaque référence prose (`surface-raised`, `hairline`, `accent-primary`, `ink-disabled`, etc.) résout dans le YAML.

### Findings
- **low** Les tokens `state-success` / `state-warning` / `state-error` sont définis dans le YAML mais le body référence leurs équivalents sémantiques (« sauge », « ocre miel », « terracotta ») via les accents primaires — pas de contradiction, simple redondance qui pourra créer une ambiguïté pour le dev (« j'utilise `state-success` ou `accent-secondary` pour un état coché ? »). *Fix :* préciser en §Colors que `state-*` = alias sémantiques sur les accents, et choisir une convention pour les composants stateful.

## 3. Cross-référence DESIGN ↔ EXPERIENCE — adequate

**Vérifié.** EXPERIENCE.md référence explicitement `DESIGN.md.Brand & Style`, `DESIGN.md.typography`, `DESIGN.md.Components`, `DESIGN.md.Do's and Don'ts`. Vocabulaire des tokens couleur cohérent (surface-raised, hairline, accent-primary, sauge, ocre). Glossaire (Recette, Slot, Convive, Menu validé, etc.) identique au PRD §3. Components nommés identiquement entre DESIGN.md.Components, DESIGN.md.YAML.components, et EXPERIENCE.md.Component Patterns sauf 2 cas signalés ci-dessous.

### Findings
- **high** L'intro EXPERIENCE.md promet une syntaxe `{path.to.token}` (« référencée via `{path.to.token}` ») qui n'apparaît **jamais** dans le corps — les références utilisent juste le nom du token (« accent-primary »). *Fix :* soit retirer la promesse en intro (et documenter la convention « nom-seul = token DESIGN.md »), soit appliquer la syntaxe `{colors.accent-primary}` sur les références load-bearing pour aider le grep aval.
- **medium** Composant **« Champ Convives de référence »** (stepper +/−) défini en EXPERIENCE.md.Component Patterns sans pendant visuel dans DESIGN.md.Components. *Fix :* ajouter une ligne `stepper-numeric` dans DESIGN.md.Components (ou expliciter « UI primitive iOS — stepper natif »).
- **medium** Composant **« Ligne historique Menu »** défini en EXPERIENCE.md.Component Patterns sans pendant visuel dans DESIGN.md.Components. *Fix :* préciser si c'est un re-use de `menu-repas-row` en mode lecture (probable), ou ajouter une ligne dédiée.

## 4. Decision-readiness — adequate

**Vérifié.** Un dev iOS/web peut implémenter ~95% des écrans sans inventer : tokens chiffrés, dimensions précises (QR 240×240, miniature 48×48, padding 24/12px, tap targets ≥ 44pt), copy textuelle fournie pour states et confirmations, microcopy de transition pour VoiceOver explicite.

### Findings
- **high** Flow 2 beat 3 porte un `[ASSUMPTION]` non résolu : *« tabs secondaires inférées par le Compte connecté ; à valider Sally »*. Sally **est** l'UX. Soit la décision est tranchée ici (Flow 2 montre déjà 3 tabs « Lionel | Rory | Gamelle Aurélie » comme parti pris implicite), soit elle remonte en open question explicite. *Fix :* trancher la mécanique des tabs secondaires de l'onglet Aujourd'hui dans EXPERIENCE.md.Component Patterns et lever le `[ASSUMPTION]`. Documente la décision dans `.decision-log.md`.
- **medium** Flow 5 beat 3 porte un `[ASSUMPTION]` sur l'auto-fill iOS UIPasteboard. Ce n'est plus un sujet UX mais Architecture/Implementation (Safari/PWA + Clipboard API). *Fix :* déplacer cet `[ASSUMPTION]` du Flow en OQ Architecture (ou en note explicite pour Winston) plutôt que de le laisser flotter dans le path utilisateur.
- **medium** Flow 5 beat 7 mentionne « ordre chronologique inverse [ASSUMPTION] » pour le Catalogue. PRD FR-10 dit « UX-décidé ». À trancher dans EXPERIENCE.md (probable : chronologique inverse, mais à confirmer). *Fix :* poser la règle d'ordre Catalogue dans Component Patterns (Ligne Recette compacte) et lever l'[ASSUMPTION].
- **medium** Condition de disabled du bouton « Valider le menu » spécifiée dans Component Patterns (« tous les Slots en état correct — pas de Slot orphelin ») n'apparaît pas dans `.decision-log.md`. C'est une décision UX qui complète FR-16. *Fix :* journaliser explicitement.

## 5. Cohérence avec PRD — adequate

**Vérifié.** Les **6 UJ (UJ-1, UJ-2, UJ-2b, UJ-3, UJ-4, UJ-5 a/b/c)** sont tous couverts par des Key Flows nommés. Les **24 FR** ont chacun une opérationnalisation traçable (IA secondaire, Component Pattern, State Pattern ou Key Flow beat). Les **5 NFRs cross-cutting** sont opérationnalisés : NFR-X1 (zéro saisie) tenu via swipes/taps partout, NFR-X2 (< 200ms / < 1s / < 5s) ancré dans Cellule Slot + Loading state + Flow 2b, NFR-X3 (cohérence éventuelle) opérationnalisé dans State Patterns "Sync conflict", NFR-X5 (1 dev) ancré dans Foundation + Brand & Style + Typography. NFR-X4 (souveraineté) délégué à Architecture — légitime.

### Findings
- **high** State Patterns "Import Recette échec" cite **FR-19** comme référence du bouton "Saisie manuelle". FR-19 = consultation de l'historique des Menus, sans aucun rapport. La référence correcte est **FR-6** (saisie manuelle d'une Recette) ou **FR-5** (cas échec du flux import). *Fix :* remplacer `(FR-19)` par `(FR-5 cas échec → FR-6)` dans la ligne "Import Recette échec" de la table State Patterns.
- **medium** FR-24 (vidage manuel Liste secondaire) est mentionné en filigrane (Bouton primaire « Vider la Liste secondaire avec confirmation », modale en Carte navigation) mais ne reçoit pas de Component Pattern ni de State Pattern dédié décrivant le modal de confirmation. *Fix :* ajouter le copy attendu (cohérent avec PRD FR-24 : *« Vider la Liste secondaire ? Cette action ne peut pas être annulée. »*) en State Patterns ou Component Patterns.
- **medium** OQ-7 PRD (format Liste secondaire — groupée par catégorie ou liste simple ?) n'est pas tranchée explicitement dans EXPERIENCE.md. Component Patterns décrit l'item mais pas le regroupement. *Fix :* trancher dans EXPERIENCE.md.IA ou Component Patterns (probable : liste simple non groupée, à l'inverse de la principale, vu la taille typique en magasin).

## 6. Voice/Tone discipline — strong

**Vérifié.** DESIGN.md.Brand & Style ancre la calibration (« personne ne s'énerve dans ce foyer », §1 Vision PRD citée). EXPERIENCE.md.Voice and Tone livre une table Do/Don't précise et 8 exemples concrets de microcopy. Tutoiement systématique, désignation par prénom, phrases courtes/complètes, pas d'emoji, pas d'exclamations, états = constats jamais jugements. Tous les State Patterns (FR-9, FR-3, FR-24, Import échec, Champ obligatoire manquant) tiennent le ton calibré.

### Findings
*(aucun)*

## 7. Accessibility floor — strong

**Vérifié.** Les 6 piliers attendus sont tous couverts dans EXPERIENCE.md.Accessibility Floor : VoiceOver labels (en français, avec exemple Slot explicite), annonces de transition cardinales (« Validé. », « Basculé en secondaire. »), Dynamic Type honoré + re-flow en colonne unique en XL, Reduce Motion (suppression fades + slides), tap targets ≥ 44pt explicitement scindé de l'épaisseur visuelle des hairlines, pas de couleur seule pour signifier un état (typographie + ink + label combinés), focus traversal en ordre header → contenu → footer.

### Findings
- **low** L'animation « trace meta ocre 250ms » du swipe-bascule (Component Patterns + Flow 3 beat 4) n'est pas explicitement conditionnée par Reduce Motion dans sa ligne Component Patterns (la section Accessibility Floor le dit en général, mais le rappel au point d'usage aide). *Fix :* préciser au Component Pattern « Item Liste principale » que la trace 250ms est supprimée sous Reduce Motion.

## Mechanical notes

- **Frontmatter complet** sur les deux fichiers (`name`, `status`, `created`, `updated`, `project`, `sources`, `companions`). DESIGN.md a en plus `references`, `colors`, `typography`, `rounded`, `spacing`, `components` — riche et résolvable.
- **Mermaid syntax** : la « Carte de navigation » d'EXPERIENCE.md est en ASCII art, pas Mermaid. C'est un choix lisible, mais on perd l'auto-rendering. Non bloquant.
- **Cross-références FR** : 1 cassée signalée (FR-19 → devrait être FR-5/FR-6). Toutes les autres références (FR-2, FR-4, FR-7, FR-8, FR-9, FR-11, FR-12, FR-13, FR-14, FR-15, FR-17, FR-19, FR-20, FR-21, FR-23) résolvent au PRD.
- **U* (decisions PRD)** correctement citées partout (U1, U2, U3, U5, U6, U7, U8, U9, U10, U13, U16, U17, U18, U20, U21, U22, U24, U26).
- **NFR cross-cutting** correctement référencés (NFR-X1, NFR-X2, NFR-X3, NFR-X5).
- **Glossaire** PRD §3 utilisé verbatim partout (Recette, Slot, Repas, Catalogue, Convive, Menu, Fenêtre, Liste principale, Liste secondaire, Board partagé, Compte). ✓

## Résumé sévérité

| Sévérité | Count |
|---|---|
| Critical | 0 |
| High | 3 |
| Medium | 6 |
| Low | 2 |
