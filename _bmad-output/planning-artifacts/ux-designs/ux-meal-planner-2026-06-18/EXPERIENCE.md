---
name: Meal Planner
status: final
created: 2026-06-18
updated: 2026-07-01
project: meal-planner-bmad
sources:
  - "_bmad-output/planning-artifacts/prds/prd-meal-planner-2026-06-14/prd.md"
  - "_bmad-output/planning-artifacts/briefs/brief-meal-planner-2026-06-12/brief.md"
companions:
  - "DESIGN.md"
  - ".decision-log.md"
---

# EXPERIENCE — Meal Planner

> Spine **comportementale** — pair de `DESIGN.md` *(spine visuelle)*. Tokens référencés par **nom seul** *(convention D-UX7 — voir `.decision-log.md`)*. Les 2 spines gagnent sur n'importe quel mock ou import en cas de conflit.

## Foundation

**Surface unique mobile** — iPhone Safari, **portrait exclusif**. Aucun support tablette ni desktop *(D5 brief, §5 Non-Goals PRD)*. Pas de système UI tiers nommé *(pas de MUI / shadcn / Tailwind UI)* — l'app **hérite des conventions iOS natives** *(navigation, gestes système, dynamic type, SF Symbols)* via une couche CSS légère sur HTML standard.

**PWA installable** *(OQ-9 PRD)* : recommandée par cette spine — la conjonction *(F6 hors-ligne + Service Worker + IndexedDB pour la Liste secondaire)* la rend pertinente. Architecture confirmera *(Winston)*. Si PWA, écran de premier lancement *« Ajouter à l'écran d'accueil »* à proposer.

**Mode clair seul** au MVP *(D-UX5)*. Tokens sombre définis dans `DESIGN.md` pour activation post-MVP sans réécriture.

`DESIGN.md` est la référence d'identité visuelle ; cette spine est l'expérience. La règle de conflit s'applique aux 2 spines.

### Catégorisation des Ingrédients *(OQ-3 PRD)*

- **Taxonomie initiale** *(modifiable post-MVP)* : `Légumes` · `Viandes-Poissons` · `Produits laitiers` · `Épicerie sèche` · `Surgelés` · `Boulangerie` · `Boissons` · **`Autre`** *(fallback obligatoire — FR-20)*.
- **Méthode d'assignation** : **dictionnaire interne** peuplé progressivement par 3 canaux :
    1. Import `schema.org/Recipe` quand l'attribut catégorie est fourni.
    2. Saisie manuelle utilisateur *(suggestion de catégorie à la création d'un nouvel Ingrédient, pré-remplie par heuristique sur la racine du nom — « toma » → Légumes)*.
    3. **Apprentissage par usage** — **tap sur un item classé « Autre »** dans la Liste principale ouvre une sheet iOS `Ranger dans une catégorie…` *(geste découvrable, respecte la primitive « long-press = sélection texte natif seule »)*. La décision est mémorisée dans le dictionnaire.
- **Garantie** : tout Ingrédient non assignable tombe dans **« Autre »** affichée en fin de Liste principale *(jamais bloquant — FR-20)*.

## Information Architecture

### Tabs principaux *(bottom tab bar)*

| Surface | Atteinte depuis | Objet | Réalise |
|---|---|---|---|
| **Aujourd'hui** | App ouverte (cold) | Vue rapide du Slot du créneau courant *(midi avant ~14h, soir après ~17h — seuils UX)* | FR-18, UJ-2, UJ-2b |
| **Menu** | Tab bar | Menu validé en consultation *(vue d'ensemble + drill-down Repas → Slot)* + entrée vers Menu draft | FR-17, FR-19, lance FR-11 |
| **Listes** | Tab bar | Liste principale ET Liste secondaire *(toggle haut)* | FR-20, FR-21, FR-22, FR-23, FR-24 |
| **Catalogue** | Tab bar | Toutes les Recettes connues du foyer + bouton ajouter | FR-10, lance FR-5, FR-6, FR-7, FR-9 |

**Pas de tab Setup** — accès via icône `gear` en header de l'onglet **Aujourd'hui**. Usage rare *(setup initial + édition occasionnelle)*.

### Surfaces secondaires *(modales ou full-screen pushed)*

| Surface | Atteinte depuis | Objet | Réalise |
|---|---|---|---|
| **Recette — détail** | Catalogue row tap / Slot tap *(Aujourd'hui ou Menu)* | Consultation Recette complète, mode cuisson | FR-17, UJ-2, UJ-5c |
| **Recette — éditer** | Recette détail → bouton modifier | Modification d'une Recette existante | FR-7, FR-8 |
| **Importer une Recette** | Catalogue → `+` → « depuis un lien » | Coller URL, prévisualisation pré-remplie | FR-5 |
| **Saisir une Recette** | Catalogue → `+` → « saisie manuelle » OU fallback import échoué | Formulaire Recette vide | FR-6 |
| **Menu draft (édition)** | Menu → « Générer un nouveau Menu » | Édition active du Menu en cours, régénération, validation | FR-11 → FR-16 |
| **Slot — détail / édition** | Menu draft → tap sur Slot | Détail Slot, choix Recette manuelle, ajustement Convives | FR-13, FR-15 |
| **Setup foyer** | Aujourd'hui → `gear` | Convives, pattern nuits Aurélie, invitation 2ᵉ Compte, **section Compte** *(infos + bouton Se déconnecter — FR-1)* | FR-1, FR-3, FR-4, FR-2 |
| **Invitation QR** | Setup foyer → « Inviter un 2ᵉ Compte » | Affichage du QR, état de connexion, **fallback `Partager un lien`** si scan impossible | FR-2 |
| **Historique des Menus** | Menu → bouton `Historique` *(header)* | Liste chronologique inverse des Menus validés passés. Lecture seule, drill-down sur un Menu pour consultation détail. | FR-19 |

### Carte de navigation

```
[Aujourd'hui] ──┬── tap Slot ────────► [Recette — détail]
                └── tap gear ────────► [Setup foyer] ────► [Invitation QR]

[Menu] ─────────┬── tap Repas ───────► (drill-down Slots inline)
                ├── tap Slot ────────► [Recette — détail]
                ├── « Historique » ──► [Historique des Menus] ── tap ──► [Menu validé — détail consultation]
                └── « Générer » ─────► [Menu draft] ────┬── tap Slot ──► [Slot — détail]
                                                       └── « Valider » ──► retour à [Menu]

[Listes] ───────┬── toggle Principale / Secondaire
                ├── swipe item ─────► (bascule)
                └── « Vider » *(secondaire)* ──► (modal confirmation)

[Catalogue] ────┬── tap Recette ────► [Recette — détail] ─── tap « Modifier » ──► [Recette — éditer]
                └── tap « + » ──────┬── « depuis un lien » ──► [Importer]
                                    └── « saisie manuelle » ──► [Saisir]
```

Les modales s'empilent **un niveau max**, jamais deux. *(Pas de modal-dans-une-modal — règle de discipline iOS.)*

## Voice and Tone

Microcopy. La voix de marque et la posture esthétique vivent dans `DESIGN.md.Brand & Style`.

| Do | Don't |
|---|---|
| *« Validé. »* | *« Bravo ! Ton menu est validé ! 🎉 »* |
| *« Coché. »* | *« ✓ Achat enregistré avec succès »* |
| *« Liste vide. »* | *« Aucune course en attente — bon travail ! »* |
| *« Cette Recette n'apparaîtra plus dans la pioche. »* | *« Recette supprimée définitivement »* |
| *« Aucune connexion — tes coches seront synchronisées au retour réseau. »* | *« Erreur réseau ! Réessayer ? »* |
| *« Ouvre Meal Planner sur son iPhone et scanne ce code. »* | *« Demande à ton conjoint de scanner ce QR pour rejoindre le foyer »* |
| Phrases courtes, complètes. Point final. | Streaks, encouragements, points d'exclamation, emoji décoratifs. |
| Désigner les Convives par leur prénom *(« Aurélie travaille mardi soir »)* | Désigner par rôle *(« le conjoint », « l'utilisateur secondaire »)* |
| Tutoiement systématique *(« Tu peux supprimer ce Slot. »)* | Vouvoiement *(« Vous pouvez supprimer ce Slot. »)* — l'app est à l'intérieur du foyer |

**Règle d'ambiance** : aucun message ne doit signifier *« tu as fait bien »* ou *« tu as fait mal »*. Les états sont des **constats**, pas des **jugements**. *(Calibration §1 Vision PRD — « personne ne s'énerve dans ce foyer ».)*

## Component Patterns

Comportemental. Les spécifications visuelles vivent dans `DESIGN.md.Components`.

| Composant | Usage | Règles comportementales |
|---|---|---|
| **Carte Recette** | Recette — détail | Mode lecture par défaut. **Header flottant translucide** *(bouton retour + bouton Modifier)* superposé à la photo héro *(iOS-native pattern, DESIGN.md)*. Tap « Modifier » bascule en édition inline. Autosave au champ flou *(débounce 600ms)*. Indicateur de sauvegarde discret *(« Modifié. » meta)* — jamais une coche verte clignotante. |
| **Ligne Recette compacte** | Catalogue list | Tap → Recette — détail. **Swipe gauche** → action « Supprimer » *(confirmation modale demandée — FR-9)*. Long-press réservé sélection texte iOS native. |
| **Ligne Repas** | Menu validé + Menu draft | Tap → drill-down qui révèle les Slots inline *(pas une nouvelle surface — accordéon)*. En Menu draft : **swipe gauche sur un Slot** → supprimer le Slot *(pas de confirmation — réversible jusqu'à validation)*. **Bouton ghost `+ Ajouter un Slot`** au pied de chaque Repas *(Menu draft seulement, FR-14)* → modal de choix `Slot libre` ou `Choisir une Recette du Catalogue`. |
| **Cellule Slot** | Inline dans Repas | Tap → détail Slot *(modale)*. En Menu draft, le Slot expose **2 boutons inline** : `Régénérer` *(ghost)* + `Choisir une Recette` *(ghost, ouvre Catalogue en sélection)*. Après une tentative ratée de régénération, l'app **ne suggère pas** — c'est le « flux UX naturel » de FR-12 *(U2)*. **Modification des Convives du Slot** → recalcul instantané *(< 200ms, NFR-X2)* des quantités affichées dans le Slot et dans la Liste principale si déjà générée *(FR-15)*. |
| **Item Liste principale** | Liste principale tab | **Pas de tap utile** *(U1 — pas de cochage)*. **Swipe gauche** → basculer vers Liste secondaire. Animation : l'item glisse hors de la liste avec une trace meta ocre *(250ms, « Basculé en secondaire »)* puis disparaît. |
| **Item Liste secondaire** | Liste secondaire tab | **Tap sur l'indicateur d'état** *(cercle hairline → cercle sauge)* → coche / décoche. **Swipe gauche** → renvoyer vers principale. Pendant les 24h post-coche : pill ocre meta « coché 24h » visible ; passé 24h : disparu *(soft-delete consommé)*. |
| **Bouton « Valider le menu »** | Menu draft footer | Action cardinale unique. Disabled tant que tous les Slots sont en état correct *(pas de Slot orphelin — au moins une Recette ou un état Slot libre explicite)*. Au tap : modal de confirmation rapide *(« Valider et générer la liste de courses ? » → « Annuler » / « Valider »)*. Génère immédiatement la Liste principale et bascule sur le tab Menu validé. |
| **Champ saisie ingrédient** | Saisir une Recette / Éditer | Autocomplete : suggestions du Catalogue dès 2 caractères *(liste flottante de 3 max, surface-raised)*. Tap sur suggestion = remplit le champ + jump au champ quantité. Unité : dropdown rapide à droite *(g, kg, ml, l, pièce)*. Bouton **« + Ingrédient »** en bas de la liste. **Suggestion de catégorie** au moment de la 1ʳᵉ création d'un Ingrédient inconnu — pré-remplie par heuristique *(dictionnaire interne — voir Foundation)*, modifiable au tap. |
| **Champ Convives de référence** | Saisir une Recette / Éditer / Importer | Stepper +/− à droite du libellé *(défaut 4 — FR-6 + U20)*. À l'**import par lien**, mappé depuis `recipeYield` du `schema.org/Recipe` si fourni, sinon défaut 4. **Obligatoire** pour la sauvegarde *(bouton primary disabled si vide)*. |
| **QR Setup affichage** | Modale invitation 2ᵉ Compte | QR généré côté backend, **rotation toutes les 5 min** *(sécurité — code à usage unique expirant)*. Countdown meta sous le QR *(« expire dans 4:23 »)*. Détection de connexion réussie → modal de bienvenue automatique *(« Aurélie a rejoint le foyer. »)*. **Fallback `Partager un lien d'invitation`** *(bouton ghost sous le QR)* → invoque la Share Sheet iOS avec un lien à usage unique, même expiration 5 min *(utile si scan impossible — luminosité, accessibilité)*. |
| **Ligne historique Menu** | Historique des Menus | Tap → drill-down sur le Menu validé en mode lecture seule *(pas d'édition possible — U9)*. Pas de bouton « réutiliser ce Menu » au MVP *(complexité gestion des Recettes supprimées entre-temps — reporté post-MVP)*. |
| **Tab bar bas** | Permanent sur 4 tabs principaux | Tab actif : icône + label en accent-primary. Tap sur le tab actif déjà ouvert : scroll-to-top *(convention iOS)*. Pas de badge sur les tabs *(pas de notification anxiogène)*. |
| **Tabs secondaires Aujourd'hui** *(décidé)* | Tab Aujourd'hui — Repas courant avec > 1 Slot | Bande horizontale au top du Repas courant, segments par Slot. **Sélection initiale = Slot du Compte connecté** *(Lionel ouvre → tab `Lionel` actif ; Aurélie ouvre → tab `Gamelle Aurélie` actif si soir-nuit)*. Tap pour basculer vers un autre Slot. Si Repas mono-Slot : la bande de tabs ne s'affiche pas — le Slot est directement en pleine surface. *(Pré-sélection assumée déterministe par compte connecté ; tap utilisateur surcharge librement.)* |

## State Patterns

| État | Surface | Traitement |
|---|---|---|
| **Cold open — premier lancement** | App opens | Si pas de Compte : écran d'accueil → création Compte → Setup foyer. |
| **Cold open — pas de Menu validé** | Aujourd'hui | *« Pas encore de Menu — Génère-en un depuis l'onglet Menu. »* + bouton primary qui mène au tab Menu. |
| **Cold open — Menu validé en cours** | Aujourd'hui | Slot du créneau courant en évidence. Si plusieurs Slots dans le Repas *(soir-nuit)*, tabs *(Toi / Rory / Gamelle)* au top — UX-décidé. |
| **Empty Catalogue** | Catalogue | *« Catalogue vide. Importe ta première Recette ou saisis-la à la main. »* + bouton primary `+`. |
| **Empty Liste principale** | Listes / Principale | *« Liste vide. Elle se générera quand tu valideras un nouveau Menu. »* |
| **Empty Liste secondaire** | Listes / Secondaire | *« Liste vide. »* — pas de message d'incitation, c'est un état neutre. |
| **Loading — agrégation Liste principale** | Pendant FR-16 | Spinner discret meta + texte *« Agrégation des ingrédients… »*. < 1s typique *(NFR-X2)*. |
| **Offline — Liste secondaire en magasin** | Listes / Secondaire | **Pas de bannière**. Les coches s'accumulent localement. Au retour réseau : sync silencieuse *(U18)*. |
| **Sync conflict — coche concurrente** | Listes / Secondaire | Last-write-wins *(NFR-X3)*. Pas d'alerte utilisateur — l'autre conjoint verra l'état final à sa prochaine ouverture. |
| **Ingrédient sans catégorie** | Liste principale | Fallback catégorie « Autre » en fin de liste *(FR-20)*. Réassignation manuelle par tap → sheet `Ranger dans…` *(mécanique détaillée dans Foundation § Catégorisation)*. |
| **Champ obligatoire manquant** | Saisie Recette, Setup foyer | Bouton primary *(« Sauvegarder », « Valider »)* en état **disabled** tant que titre + ≥ 1 Ingrédient avec quantité + Convives de référence *(FR-6, U20)* ne sont pas remplis. **Pas d'alerte rouge** — état disabled neutre, contour hairline, ink-disabled. *(Calibration tonale : pas de dramatisation.)* |
| **Import Recette échec** | Importer | *« Ce site n'est pas supporté pour l'instant. »* + bouton primary `Saisie manuelle` *(FR-5 cas échec → FR-6)*. |
| **Catalogue < 14 Recettes au moment de la génération** | Menu draft | **Pill contextuelle ocre** *(DESIGN.md — point ocre discret, pas d'icône warning)* : *« Ton Catalogue contient X Recettes — quelques répétitions sur la quinzaine. »* + lien `Enrichir`. Cohérent avec la calibration tonale — c'est un état informationnel, pas une alerte. |
| **Slot / Recette ultra-simple** *(U8)* | Aujourd'hui, Menu draft, Menu validé | **Pill « Ultra-simple »** *(DESIGN.md)* affichée à côté du titre de la Recette pour orientation rapide *(« ah, c'est un plat prêt + airfryer »)*. Marqueur d'orientation — pas un état système. |
| **Suppression Recette utilisée dans Menu validé** | Modal confirmation FR-9 | *« Cette Recette est dans le Menu validé en cours. Elle y restera référencée mais ne reviendra plus dans les pioches futures. Confirmer ? »* |
| **Suppression Convive référencé** | Modal confirmation FR-3 | *« Aurélie est référencée dans X Slots du Menu validé et de l'historique. Ces Slots conserveront sa trace. Confirmer ? »* |

## Interaction Primitives

- **Tap** = action principale *(drill-down, sélection)*.
- **Swipe gauche** = action contextuelle *(supprimer, basculer)* — convention iOS native respectée.
- **Long-press** = **réservé** à la sélection de texte iOS native. **Pas d'action métier** sur long-press *(c'est un anti-pattern d'apprentissage — l'utilisateur déclenche par accident)*.
- **Pinch-to-zoom** = uniquement sur les **photos de Recettes** en consultation *(pas sur les listes, pas sur les Menus)*.
- **Pull-to-refresh** = uniquement sur le **Catalogue** *(post-sync de Recettes ajoutées depuis l'autre Compte)*. Pas sur les Listes *(données pilotées par état applicatif, pas par un fetch utilisateur)*.
- **Stepper +/−** sur les quantités numériques *(saisie ingrédient, nombre de Convives)* — évite la friction clavier.

**Bannis** : carrousels horizontaux *(scroll vertical seul — main droite tient le téléphone)*, hero animations en cold open *(le délai d'ouverture compte)*, badge counts sur les tabs *(anxiogène)*, streaks / suivi de régularité *(violerait §1 Vision)*, push notifications de re-engagement *(« Tu n'as pas validé de menu depuis 5 jours »)*, animations en cascade au scroll *(distrayant et coûteux à maintenir — NFR-X5)*.

## Accessibility Floor

Comportemental. Le contraste visuel vit dans `DESIGN.md`.

- **VoiceOver labels** *(en français)* sur chaque élément interactif, role + state explicites. Exemple Slot : *« Slot, Pâtes carbonara, 2 Convives — Aurélie et Lionel — Bouton Régénérer »*.
- **Annonce de transition** sur les actions cardinales : *« Validé. »* au moment du « Valider le menu », *« Basculé en secondaire. »* au swipe d'un item.
- **Dynamic Type** honoré via les tokens `DESIGN.md.typography`. L'UI reste lisible au plus grand setting iOS — pas de truncation, pas de contrôles écrasés. La densité du Menu draft accepte un *re-flow* en colonne unique avec Dynamic Type XL.
- **Reduce Motion** *(setting iOS)* : suppression des fades sur indicateurs d'état, des slides sur swipe-bascule *(les items disparaissent instantanément, l'indicateur d'état passe directement à *« Basculé. »*)*.
- **Tap targets ≥ 44pt** *(iOS HIG)* sur tous les contrôles. Les hairlines visuels peuvent être fins ; les **zones tactiles** ne le sont pas.
- **Pas de couleur seule** pour signifier un état. L'item coché sauge a aussi : changement de typo *(italique)*, changement d'ink *(disabled)*, et label VoiceOver explicite *(« Coché. »)*.
- **Focus traversal** suit l'ordre de lecture sur chaque surface — header → contenu → footer.

## Inspiration & Anti-patterns

**Lifted from NYT Cooking**

- *Photographie de plat à proportion généreuse (16:9 héro)* sur la Carte Recette en consultation. C'est le langage visuel du livre de cuisine — ancre l'ambition 2-3 ans du brief.
- *Layout magazine éditorial* sur l'écran Recette : titre serif New York fort, ingrédients en composition aérée, étapes numérotées en respiration vertical.
- *Hierarchy typographique tranchée serif / sans* : titres serif + corps sans-serif lisible. Pas de mélange polices sur le corps.

**Lifted from Bear**

- *Swipe gauche = action contextuelle* sur les rows *(item de liste, ligne Recette)*. Convention iOS native respectée, gestes éprouvés.
- *Densité maîtrisée des listes* : hairlines au plus bas contraste, padding vertical compact, scan-rapide en magasin / en commande drive.
- *Italique pour les notes manuscrites* — voix éditoriale distincte du corps de Recette.
- *Composer sans toolbar* sur la saisie de Recette : le formatage est une décision système, pas par-saisie.

**Lifted from iOS native**

- *SF Symbols* pour les icônes de la tab bar et des actions *(`sun.max`, `calendar`, `list.bullet`, `book`, `plus.circle`)*.
- *New York* serif pour titres et *SF Pro Text* sans pour corps — soutenable *(NFR-X5)*, beau, dynamiquement typé.
- *Modal de confirmation iOS standard* sur actions destructives *(supprimer Recette, vider Liste secondaire)*.

**Rejected — Streaks / gamification (style Jow / Whisk / Duolingo)**

Streaks weaponize le calendrier. Meal Planner ne récompense pas la régularité — la valeur c'est la **disparition de la session-rituel**, pas la **performance** de l'avoir tenue. Aucun compteur de menus validés, aucun *« vous validez depuis 4 semaines de suite »*, aucun badge.

**Rejected — Suggestions algorithmiques de Recettes dans le Catalogue / sur le Menu draft**

*« Vous pourriez aimer… »* viole le principe **Catalogue maîtrisé par le foyer** *(B-G1 PRD, §3 Glossary Catalogue)*. La découverte vient d'Aurélie sur Instagram et de Lionel sur les blogs ; l'app ne propose pas.

**Rejected — Push notifications de re-engagement**

*« Pensez à planifier ! »*, *« Aurélie a partagé une Recette ! »*, *« Voici votre menu pour cette semaine. »* — toutes anxiogènes ou intrusives. Au MVP : **zéro notification push**. Une éventuelle notification système liée à la commande hebdo *(« Pense aux courses demain »)* sera reconsidérée à 3 mois, après confirmation explicite du besoin par Aurélie.

**Rejected — Couleurs par catégorie de plat / type d'Ingrédient**

*(« Légumes en vert, viandes en rouge »)* viole « 1 palette, 3 accents » *(DESIGN.md.Do's and Don'ts)*. La catégorisation se lit dans la **structure** *(grouping)* et la **typographie** *(meta secondaire)*, pas dans le rendu chromatique.

**Rejected — Drag & drop de Slots entre Repas**

Manipulation séduisante sur le papier, ratée à l'usage mobile *(zone tactile imprécise, déplacement chirurgical)*. Préférer **Slot supprimable + ré-ajoutable manuellement** *(FR-14)*. Compromis simplicité vs flexibilité tranché vers simplicité.

## Key Flows

Chaque flow est l'incarnation comportementale d'un UJ du PRD. Le *climax beat* nomme le moment où la valeur est délivrée.

### Flow 1 — Aurélie planifie le menu (samedi matin, ~10h, en couple à la cuisine) — *réalise UJ-1*

1. Aurélie ouvre l'app sur son iPhone. Cold open → tab **Aujourd'hui**, mais la session menu commence là : elle tape **Menu**.
2. Le tab **Menu** affiche le Menu validé en cours, arrivé à expiration. Bouton primary footer : **« Générer un nouveau Menu »**.
3. Tap → modal **Menu draft** plein écran. Sélecteur de Fenêtre *(7-14j, défaut 14)*. Tap → l'app pré-remplit en ~1s.
4. Le Menu draft s'affiche : liste verticale scrollable de Repas *(2 par jour × 14 jours = ~28 Repas)*. Les Repas des soirs où Aurélie travaille contiennent **3 Slots** *(gamelle libre + Rory + Lionel)* — pré-remplis selon le pattern récurrent *(FR-4)*.
5. Aurélie et Lionel parcourent en duo. Sur un Slot qui déplaît, tap `Régénérer` → nouvelle Recette piochée. Si elle ne convient pas, tap `Choisir une Recette` → ouvre une vue *(Catalogue en sélection contextuelle)*, Aurélie sélectionne, retour au Slot.
6. Sur les Slots gamelle d'Aurélie, elle ajuste si besoin *(supprimer si congé ce soir-là — swipe gauche)*.
7. Tap **« Valider le menu »** *(bouton primary, footer)*. Modal de confirmation. Tap « Valider ». Animation discrète : *« Validé. »* meta, transition vers le tab Menu validé.
8. **Climax** : la **Liste principale est instantanément disponible** sur le tab Listes *(badge `Listes` accent-primary 250ms pour signaler le nouveau contenu, puis revient en neutre — pas de badge persistant)*. Aurélie sait que la 2ᵉ charge mentale *(« reconstituer les ingrédients »)* est supprimée.
9. **Resolution** : ils ferment l'app. Le Menu validé est consultable depuis n'importe quel Compte. La Liste principale attend qu'Aurélie ouvre l'app drive ~2h plus tard.

**Edge case** : la 1ʳᵉ pioche `Régénère` re-propose la même Recette qu'on vient de rejeter *(Catalogue petit)*. → Pas de message d'erreur — l'utilisateur tap `Choisir…` et passe direct au choix manuel *(FR-12, U2)*.

**Variante observable** : la session peut se faire **en solo** *(U7)*. Même flow, même climax, mais Aurélie ou Lionel seul. Le conjoint verra le Menu validé à sa prochaine ouverture.

### Flow 2 — Lionel ouvre l'app un soir-nuit pour cuisiner pour Rory et lui (mardi ~19h15) — *réalise UJ-2*

1. Lionel sort sa main de la cuisinière, ouvre l'iPhone. App déjà authentifiée *(session persistante FR-1)*.
2. Cold open → tab **Aujourd'hui**. **Le Slot du créneau courant est en évidence** dès l'ouverture *(seuil « soir » après ~17h)*.
3. Le Repas du soir contient 3 Slots. Au top de l'écran, **tabs secondaires** : `Lionel` *(actif par défaut — pré-sélection déterministe par Compte connecté, voir Component Patterns)*, `Rory`, `Gamelle Aurélie`.
4. Lionel voit *« Ratatouille en boîte + falafels airfryer »* — Recette ultra-simple *(U8)*. Pas besoin de drill-down. **Ferme l'app**, va dans les placards.
5. **Cas alternatif** : Recette structurée *(étapes à suivre)*. Tap sur le titre du Slot → **Recette détail** ouvre en plein écran. Lionel pose le téléphone sur le plan de travail, suit les étapes.
6. **Climax** : repas servi. Lionel n'a pas eu à **demander à Aurélie** *(qui est au travail)* ce qu'il devait cuisiner — l'app a tenu son rôle.
7. **Resolution** : Lionel ferme l'app *(ou la laisse en veille jusqu'à fin de cuisson)*. Aurélie n'a aucune interaction côté foyer.

**Edge case** : ingrédient manquant en plein flux. Lionel **improvise hors-app** *(U9)* — pas de bouton « modifier la Recette du soir », c'est volontaire. Si un item est à racheter, il bascule manuellement vers la **Liste secondaire** *(Flow 4)*.

### Flow 2b — Aurélie consulte sa gamelle plus tôt — *réalise UJ-2b*

1. Aurélie, mardi ~14h, ouvre l'app sur son iPhone. Cold open → tab **Aujourd'hui** — **le Slot gamelle de ce soir est en évidence** dans la barre de tabs secondaires `Lionel | Rory | Gamelle Aurélie`. Tap sur `Gamelle Aurélie`.
2. Le Slot affiche soit une Recette *(elle clique pour drill-down)*, soit *« Slot libre — improvise »*.
3. Aurélie prépare sa gamelle. **Aucune saisie**, juste lecture.
4. **Climax** : Aurélie sait quoi préparer en moins de 5 secondes après ouverture *(NFR-X2)*. Pas demandé à Lionel, pas reconstitué de tête.
5. **Resolution** : ferme l'app, emporte la gamelle.

### Flow 3 — Aurélie passe sa commande drive (samedi ~12h30) — *réalise UJ-3*

1. Aurélie ouvre l'app drive *(La Belle Vie)* en arrière-plan. Puis Meal Planner : tab **Listes** → **Liste principale** *(active par défaut après une validation récente)*.
2. La liste est **regroupée par catégorie** *(catégories décidées UX — légumes / viandes / etc.)*. Items en `body`, quantité en `mono` alignée à droite. Pas de checkbox.
3. Aurélie alterne entre les 2 apps : lit un item *(« 500g de tomates »)*, ajoute au panier drive, passe au suivant.
4. Sur un item indisponible sur le drive : **swipe gauche** sur l'item dans Meal Planner → l'item disparaît de la principale avec une trace meta ocre *(250ms, « Basculé en secondaire »)*. Il apparaît immédiatement dans la **Liste secondaire**.
5. **Cas alternatif** : Aurélie trouve l'item en alternative sur le drive après l'avoir basculé. Tap sur l'onglet **Liste secondaire** → swipe gauche sur l'item → renvoyé en principale *(FR-21)*.
6. **Climax** : panier validé sur le drive. La Liste principale reste affichée *(U4)* avec moins d'items qu'au départ *(les basculés ont disparu)*. Un **badge meta** discret *(« 4 items sur secondaire »)* en haut de l'onglet principal rassure sur la trace conservée.
7. **Resolution** : Aurélie ferme l'app. La Liste secondaire attend la prochaine sortie magasin.

**Edge case** : Aurélie a basculé un item, passe la commande, revient dans Meal Planner. Voit moins d'items que prévu. → Le badge meta « X sur secondaire » est exactement là pour ce moment — confirme qu'aucune information n'est perdue.

### Flow 4 — Aurélie en magasin avec la Liste secondaire (mardi ~17h30, Monoprix sous-sol, sans réseau) — *réalise UJ-4*

1. Aurélie ouvre Meal Planner. Tab **Listes** → onglet **Liste secondaire**. **Aucune bannière offline** — l'app affiche la liste normalement, aucune indication d'état réseau *(consultable hors-ligne — U18)*.
2. Elle attrape un yaourt nature qui était dans la secondaire. **Tap sur l'indicateur d'état** *(cercle hairline → cercle sauge)* → l'item passe en italique ink-disabled, pill ocre *« coché 24h »* meta en sous-ligne.
3. Continue ses courses, coche au fur et à mesure. Les coches sont persistées localement.
4. **Tous les items ne sont pas trouvés**. Les non-cochés restent en l'état. Aurélie sort.
5. Au parking, retour réseau → sync silencieuse. Les coches s'enregistrent côté board partagé.
6. **Climax** : Aurélie repart au boulot **sans rien avoir mémorisé**. La 3ᵉ charge mentale du brief disparaît.
7. **Resolution** : le lendemain, Lionel ouvre l'app, voit que la Liste secondaire a moins d'items *(les cochés vont disparaître dans les heures qui viennent — soft-delete FR-23)*. Il sait quoi prendre à la boulangerie au retour.

**Edge case — coche par erreur** : Aurélie regarde le ticket de caisse en sortant, réalise qu'elle a coché un item qu'elle n'a pas acheté. → Elle a 24h pour décocher *(tap sur l'indicateur sauge → retour hairline, pill ocre disparaît, item revient en état normal)*.

### Flow 5 — Aurélie importe une Recette depuis Instagram (mardi soir, dans le canapé) — *réalise UJ-5a, fallback UJ-5b*

1. Aurélie est sur Instagram, voit une recette de bo bun qui lui plaît. Le post pointe vers un blog. Elle **copie l'URL** *(geste iOS standard)* et ouvre Meal Planner.
2. Tab **Catalogue** → bouton **`+`** en haut droit → **« Depuis un lien »** *(picker rapide)*.
3. Le champ URL est pré-rempli depuis le presse-papier *([ASSUMPTION] : iOS UIPasteboard auto-fill — courant et délicat, à valider Sally)*. Tap « Importer ».
4. Spinner discret meta *(« Extraction… »)* < 1s.
5. **Cas succès** : un **formulaire pré-rempli** s'affiche en plein écran *(titre, ingrédients/quantités, étapes, photo, Convives de référence par défaut)*. Aurélie ajuste si elle veut *(par exemple : « les enfants préfèrent avec moins de coriandre »)*. Tap « Sauvegarder ».
6. **Climax** : la Recette rejoint le **Catalogue** *(moins d'1 minute écoulée, ~2-3 taps depuis le copy-paste)*. **La leçon du proto précédent est tenue** — l'enrichissement du Catalogue n'est pas l'endroit où Aurélie abandonne *(NFR-X1 exception assumée + ergonomie soignée)*.
7. **Resolution** : retour au tab Catalogue, la nouvelle Recette est en tête *(ordre chronologique inverse [ASSUMPTION])*. Sera éligible au prochain Menu draft.

**Edge case — site non supporté** : message court *« Ce site n'est pas supporté pour l'instant. »* + bouton primary `Saisie manuelle` qui mène au formulaire vide *(UJ-5b)*. Aurélie peut copier-coller le texte de la recette à la main.

**Variante édition (UJ-5c)** : 2 mois plus tard, Aurélie veut ajouter une note *« moins de sucre »* à une Recette existante. Tab Catalogue → tap Recette → bouton « Modifier » → champ notes *(textarea simple — U22)* → autosave. **Pas d'historique** *(FR-7)*.
