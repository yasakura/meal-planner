---
name: Meal Planner
description: Web app mobile à usage strictement personnel pour la planification des repas d'un foyer. Calme, posé, éditorial sur les Recettes ; épure fonctionnelle sur la planification et les listes. Pas de gamification, pas de notifications culpabilisantes, pas de drame.
status: final
created: 2026-06-18
updated: 2026-07-01
project: meal-planner-bmad
sources:
  - "_bmad-output/planning-artifacts/prds/prd-meal-planner-2026-06-14/prd.md"
  - "_bmad-output/planning-artifacts/briefs/brief-meal-planner-2026-06-12/brief.md"
companions:
  - "EXPERIENCE.md"
  - ".decision-log.md"
references:
  - "NYT Cooking (mobile) — langage visuel des Recettes"
  - "Bear (notes mobile) — épure fonctionnelle, interactions tactiles"
colors:
  surface-base: '#FAF6EE'
  surface-raised: '#FFFFFF'
  surface-sunken: '#F3EDDF'
  ink-primary: '#1F1B16'
  ink-secondary: '#6F6557'
  ink-disabled: '#B8AFA0'
  accent-primary: '#B83F2C'
  accent-secondary: '#5C7E5A'
  accent-warm: '#C8843C'
  border-hairline: '#ECE4D7'
  state-success: '#5C7E5A'
  state-warning: '#C8843C'
  state-error: '#B83F2C'
  surface-base-dark: '#1A1814'
  surface-raised-dark: '#26221C'
  surface-sunken-dark: '#13110E'
  ink-primary-dark: '#F0EAD9'
  ink-secondary-dark: '#A39A88'
  ink-disabled-dark: '#5E5848'
  accent-primary-dark: '#D9624E'
  accent-secondary-dark: '#7FA079'
  accent-warm-dark: '#D9A267'
  border-hairline-dark: '#2E2A22'
typography:
  display:
    family: 'New York'
    fallback: 'Georgia, "Times New Roman", serif'
    note: 'iOS system serif — pour titres de Recettes et écrans cardinaux ("Aujourd''hui", "Menu validé"). Pas de web font chargé.'
  title:
    family: 'New York'
    fallback: 'Georgia, serif'
    note: 'iOS Title 1 / 2 — titres de sections et de cartes Recette.'
  body:
    family: 'SF Pro Text'
    fallback: 'system-ui, -apple-system, sans-serif'
    note: 'iOS Body — corps de tous les écrans fonctionnels (Menu draft, Listes, Setup).'
  meta:
    family: 'SF Pro Text'
    fallback: 'system-ui, sans-serif'
    note: 'iOS Footnote / Caption — métadonnées (Convives, quantités, dates, états).'
  mono:
    family: 'SF Mono'
    fallback: 'ui-monospace, monospace'
    note: 'Quantités numériques dans la Liste principale (alignement vertical des chiffres).'
rounded:
  sm: 6px
  md: 12px
  lg: 16px
  full: 9999px
spacing:
  '0': 0px
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 24px
  '6': 32px
  '7': 48px
components:
  recette-card: 'Carte Recette — photo 16:9 top, titre serif New York Title 1, ingrédients en body, notes en italique meta.'
  recette-row: 'Ligne Recette compacte (Catalogue list) — titre serif Title 2, durée meta, photo miniature 48×48 lg radius.'
  menu-repas-row: 'Ligne Repas du Menu — créneau + jour en meta, Slots empilés en body, hairline divider entre Repas.'
  slot-cell: 'Cellule Slot dans un Repas — Recette/libre + Convives initials (3-4 max). Tap pour drill-down.'
  liste-principale-item: 'Ligne Liste principale — ingrédient body, quantité mono right-aligned, catégorie meta secondaire.'
  liste-secondaire-item: 'Ligne Liste secondaire — ingrédient body, quantité mono right-aligned, checkbox-état coché. Coché en italique + ink-disabled.'
  bottom-tab-bar: 'Tab bar bas — 4 tabs (Aujourd''hui, Menu, Listes, Catalogue). Icônes SF Symbols + label meta.'
  primary-button: 'Bouton principal — accent-primary fill, body bold, rounded/md. Usage limité aux gestes cardinaux (Valider le menu, Vider la liste).'
  ghost-button: 'Bouton ghost — bordure hairline, ink-primary text. Usage standard (régénère, choisir, modifier).'
  qr-display: 'Affichage QR Setup — grand QR centré (240×240), titre Title 1, instruction body.'
  ingredient-input: 'Champ saisie ingrédient — body, autocomplete catalogue, suggestion d''unité, surface-raised, rounded/sm.'
---

## Brand & Style

Meal Planner est conçu **contre** la grammaire visuelle dominante des apps grand public de planification de repas — celles qui surenchérissent en photographie léchée, en couleurs vives, en gamification *(streaks, badges, nudges)*, en injections de découverte algorithmique *(« vous pourriez aimer… »)*. La promesse est inverse : un **foyer maîtrise son patrimoine culinaire**, le consulte calmement, le fait évoluer à son rythme.

Deux registres visuels coexistent et se renforcent — ce n'est pas une contradiction, c'est l'architecture du sens :

- **Sur les Recettes** *(Catalogue, mode consultation, mode cuisson)* : registre **éditorial chaud, livre de cuisine**, inspiré du langage NYT Cooking. Titres serif New York forts, photographie quand elle existe en proportion généreuse, ingrédients en composition aérée. C'est là que se construit, au fil des mois, le sentiment de **patrimoine accumulé**.
- **Sur tous les autres écrans** *(Aujourd'hui, Menu draft/validé, Listes principale/secondaire, Setup foyer)* : registre **épure fonctionnelle**, inspiré du langage Bear. Sans-serif lisible, densité maîtrisée, hairlines au plus bas, interactions tactiles éprouvées *(swipes, taps)*. C'est là que la friction-zéro de NFR-X1 s'incarne — *aucun frottement entre Aurélie ou Lionel et la tâche du moment*.

Le **ton** est chaud, posé, court. Pas d'exclamations, pas d'encouragements, pas d'emoji. Pas de couleurs d'erreur agressives *(« personne ne s'énerve dans ce foyer »* — calibration explicite PRD §1 Vision*)*. Les messages d'état sont des constats, jamais des alertes.

**Mode sombre** *([ASSUMPTION] hors-MVP)* : les tokens sombres sont définis pour permettre l'activation post-MVP sans réécriture, mais l'app livre uniquement en mode clair au MVP. Justification : NFR-X5 *(soutenabilité 1 dev)* — doubler les tests pour un MVP foyer iPhone n'apporte pas une valeur proportionnelle.

## Colors

La palette est restreinte par discipline — un livre de cuisine vivant n'a pas besoin de plus de 3 accents chromatiques.

- **Crème chaude (`#FAF6EE`)** est la surface de base — l'équivalent du « papier crème » d'un cahier de famille. Légèrement plus chaude qu'un blanc cassé standard, pour évacuer l'aspect clinique d'une web app utilitaire.
- **Blanc pur (`#FFFFFF`)** est la surface élevée *(cartes Recette, modales)*. Contraste subtil avec la base.
- **Sable (`#F3EDDF`)** est la surface enfoncée *(input fields, surfaces secondaires)*. Donne une profondeur sans recourir à l'ombre.
- **Encre chaude (`#1F1B16`)** est l'encre primaire — texte de corps, titres. Volontairement *non* `#000000` : un noir légèrement tirant vers le brun chaud est plus reposant à lire.
- **Taupe (`#6F6557`)** est l'encre secondaire — métadonnées, légendes, texte d'état non-cardinal.
- **Terracotta (`#B83F2C`)** est l'**accent primaire** — utilisé exclusivement pour les **gestes cardinaux** *(bouton « Valider le menu », confirmations destructives, badge erreur exceptionnel)*. Jamais en décoration, jamais en accent gratuit.
- **Sauge (`#5C7E5A`)** est l'**accent secondaire** — états positifs et complétion *(item coché, validation réussie, confirmation calme)*. Doux, posé, non-claxonneur.
- **Ocre miel (`#C8843C`)** est l'**accent chaleureux** — utilisé sur les Recettes *(highlights de catégorie, surlignage de « format gamelle » conceptuel, fil rouge éditorial)*. Pas un état système, un **fil rouge identitaire**.
- **Hairline (`#ECE4D7`)** est la ligne de séparation au plus bas contraste légible. Tout ce qui est plus marqué tombe dans l'ornementation gratuite.

**Éviter** : les rouges saturés `#FF0000`-like *(pas de panique)*, les gradients *(la surface est papier)*, les fills colorés derrière du texte d'état *(les badges en couleur signalent l'urgence — Meal Planner n'en a pas)*, les nuances multi-saturées *(une palette, trois accents — pas plus)*.

## Typography

Le système typographique repose **entièrement sur les polices iOS natives** — choix soutenable *(NFR-X5)*, choix esthétique *(New York est une des plus belles polices serif éditoriales disponibles, conçue par Apple pour l'apparence « livre »)*, choix de performance *(zéro web font à charger, démarrage app plus rapide)*.

- **Display / Title** : **New York** *(iOS system serif)*. Utilisé pour les titres de Recettes, les titres d'écrans cardinaux *(« Aujourd'hui », « Menu validé », « Catalogue »)*, et les titres de sections de la Liste principale. Fallback : Georgia, Times New Roman. La calibration éditoriale forte évoque le livre de cuisine ; c'est l'ancre visuelle de l'ambition 2-3 ans du brief *(PRD §1 Vision)*.
- **Body** : **SF Pro Text** *(iOS system sans-serif)*. Utilisé pour le corps de tous les écrans fonctionnels, les ingrédients de Recettes, les items de Liste, les libellés. Lisibilité mobile maximale.
- **Meta** : **SF Pro Text** taille Footnote / Caption. Utilisé pour métadonnées *(quantités, dates, états, Convives)*.
- **Mono** : **SF Mono** *(iOS system monospace)*. **Réservé** aux quantités numériques de la Liste principale *(alignement vertical des chiffres : « 500g », « 1 kg », « 3 », « 250 ml » — les utilisateurs scannent verticalement)*.

**Dynamic Type** honoré à chaque niveau. Les tailles tournent autour d'un point d'ancrage *(Body = iOS Body / 17pt par défaut)* avec hiérarchie :

- **Display** : iOS **Large Title** *(34pt regular)* pour les Recettes héro ; iOS Title 1 *(28pt regular)* pour les autres titres d'écrans cardinaux.
- **Title** : iOS Title 2 *(22pt regular, sans-serif SF Pro Text)* — sections, cartes Recette dans le Catalogue.
- **Body** : iOS Body *(17pt regular)*.
- **Meta** : iOS Footnote *(13pt regular)*.

**Pas de all-caps, pas de display-sizes au-delà du Title 1, pas de variantes italiques hors des 3 usages assumés** — *(1)* notes manuscrites sur les Recettes, *(2)* libellé « Slot libre » dans une Cellule Slot, *(3)* item coché en soft-delete dans la Liste secondaire *(voir Components)*.

## Layout & Spacing

Échelle : **4 / 8 / 12 / 16 / 24 / 32 / 48 px**. Les plus grands gaps tombent entre surfaces majeures *(entre une Recette et la suivante, entre un Repas et le suivant dans le Menu draft)*. Les plus petits gaps tombent entre éléments tactilement liés *(quantité d'un ingrédient et son nom)*.

**Rythme vertical à règle dure** :

- **Cartes Recette respirent** : padding interne 24px, gap 16px entre éléments internes. La densité tue la métaphore livre.
- **Items de Liste denses** : padding vertical 12px, hairline divider, gap horizontal 8px. La densité sert la lecture rapide pendant la commande drive ou en magasin.
- **Slots du Menu draft denses** : padding 12px, hairline entre Slots du même Repas. La densité sert le « 45 min → 5 min » de SM-1.

**Marges mobile** : 16pt *(convention iOS)*. **Une seule colonne, toujours.** Les modales empilent un niveau max, jamais deux.

## Elevation & Depth

Meal Planner **évite l'élévation** comme outil hiérarchique. La distinction `surface-base` ↔ `surface-raised` ↔ `surface-sunken` repose sur la **tonalité chaude** *(crème → blanc → sable)*, jamais sur l'ombre portée.

**La seule séparation visuelle par-dessus le contenu** est un overlay opaque `ink-primary` à 50% opacity sur la modale plein écran *(modal d'invitation QR, modal de vidage de Liste secondaire — confirmations destructives)*. **Jamais d'ombre douce.** La hiérarchie vient du layout et de la typographie, pas du shadow.

## Shapes

- **`rounded/sm` (6px)** : champs de saisie, items de Liste, lignes Repas, lignes Catalogue.
- **`rounded/md` (12px)** : cartes Recette, cartes Repas en consultation, modales.
- **`rounded/lg` (16px)** : QR Setup *(grande surface dédiée)*, photo héro de Recette.
- **`rounded/full` (9999px)** : **rarissime** — uniquement pour le pill « coché 24h » de la Liste secondaire *(soft-delete visible, FR-23)*.

**Pas de pills boutons** *(pas de iOS-button-pill aesthetic)*. L'agenda visuel est **papier-coins-doux**, pas écran-tactile-gloss.

Les images suivent les coins des conteneurs exactement *(masquage propre)*.

## Components

Spécifications **visuelles** des composants. Les spécifications **comportementales** vivent dans `EXPERIENCE.md.Component Patterns`.

- **Carte Recette** *(Catalogue détail, Recette héro en consultation)* — `surface-raised`. Photo top 16:9 *(rayon lg en haut, droit en bas — collée sur le bord supérieur de la carte)*. Sous la photo : Title 1 serif New York. En-dessous : durée + Convives de référence en meta. Section ingrédients : sous-titre Title 2 + liste body avec quantité mono right-aligned. Section étapes : numérotées body. Section notes : italique meta dans surface-sunken bloc dédié. URL source : meta ink-secondary, tap-to-open.
- **Ligne Recette compacte** *(Catalogue list)* — `surface-base`. Photo miniature 48×48 rounded-lg à gauche, titre Title 2 serif au centre, durée meta à droite, chevron ink-secondary à l'extrême droite. Hairline divider entre lignes.
- **Ligne Repas** *(Menu draft + validé)* — `surface-raised`. En-tête : jour de la semaine + créneau en Title 2 sans-serif + date en meta. Slots empilés verticalement avec hairline entre eux. Gestes : tap = drill-down ; swipe gauche sur un Slot = supprimer.
- **Cellule Slot** *(dans un Repas)* — inline dans la Repas row. Contenu : titre Recette serif Title 2 *(ou « Slot libre » en italique meta si vide)*, Convives à droite *(initials dans pastilles 24×24 surface-sunken, max 4 affichées, +N si dépassement)*. Slot gamelle : badge ocre meta « gamelle » à côté du titre. Slot libre : surface-sunken et italique pour signaler la disponibilité d'improvisation.
- **Item Liste principale** — `surface-base`, padding vertical 12px. Format : nom ingrédient body à gauche, quantité mono right-aligned. Catégorie meta en sous-ligne ink-secondary *(si pertinent, sinon omis)*. **Pas de checkbox** *(U1 PRD)*. Geste utile : swipe gauche = basculer secondaire. Hairline divider entre items.
- **Item Liste secondaire** — comme l'Item Liste principale, plus un **toggle d'état** à droite *(tap zone discrète, pas une checkbox claxonneuse — un petit cercle sauge si coché, un cercle hairline si non-coché)*. Quand coché : nom et quantité passent en italique ink-disabled. Pendant les 24h de soft-delete : pill ocre meta « coché 24h » en sous-ligne.
- **Tab bar bas** — `surface-raised`, hairline top divider. 4 tabs *(Aujourd'hui, Menu, Listes, Catalogue)* avec icônes SF Symbols *(`sun.max`, `calendar`, `list.bullet`, `book`)* et label meta. Tab actif : icône + label en accent-primary. Tab inactif : ink-secondary.
- **Bouton primaire** — accent-primary fill, body bold, rounded/md, padding vertical 14px. Usage limité aux **gestes cardinaux** *(« Valider le menu », « Vider la Liste secondaire » avec confirmation, « Importer », « Sauvegarder »)*. Largeur : pleine largeur de la modale ou de la card où il est posé.
- **Bouton ghost** — bordure hairline, ink-primary text, rounded/sm, padding vertical 10px. Usage standard. Libellés à l'infinitif capitalisé *(« Régénérer », « Choisir une Recette », « Modifier »)*.
- **Affichage QR Setup** *(FR-2)* — modal plein écran, surface-raised. QR centré 240×240 *(rounded/lg)*. Au-dessus : Title 1 « Inviter Aurélie » *(ou nom du 2ᵉ Compte)*. En-dessous : body « Ouvre Meal Planner sur son iPhone et scanne ce code. » Code expire en 5 min — countdown meta sous le QR.
- **Champ saisie ingrédient** *(FR-6 — friction-zéro critique)* — surface-sunken, rounded/sm. Autocomplete : suggestions du Catalogue *(« tomates », « oignons », « lait »)* affichées en pop-up sous le champ dès 2 caractères tapés. Unité : dropdown à droite *(g, kg, ml, l, pièce — modifiable)*. Quantité : champ numérique avec stepper +/− pour modifs rapides.
- **Pill contextuelle** — pastel dérivé d'`accent-warm` *(fond `#C8843C` à ~15% opacity)*, label meta ink-primary, `rounded/full`. **Un seul composant, 2 variantes déclarées** :
    - Variante **« Ultra-simple »** — marqueur porté par un Slot ou une Carte Recette pour signaler U8 *(« boîte + airfryer »)*.
    - Variante **« Info contextuelle »** — marqueur d'orientation avec point ocre discret *(pas d'icône warning ⚠ ni de rouge)* : *« Catalogue de 11 Recettes », « Aurélie travaille — 3 Slots », « Monoprix · soft-delete 24h »*.
    - **Règle transverse** : jamais un avertissement, jamais un état d'erreur — c'est un marqueur d'orientation.
- **Header flottant translucide** — surface blanche à 60% opacity + `backdrop-filter: blur(20px)`, hairline bottom. Utilisé exclusivement sur **Recette détail par-dessus la photo héro** pour garder les actions *(bouton retour `‹`, bouton `Modifier`)* lisibles sans écraser l'image. Pas d'ombre. Convention iOS native *(pattern App Store / Photos)*.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Accents chromatiques limités à 3 *(terracotta, sauge, ocre)*, usés avec parcimonie | Mosaïque de couleurs par état, par catégorie d'ingrédient, par humeur |
| Texte d'état court et sobre *(« Coché. », « Validé. », « Liste vide. »)* | Iconographie redondante *(✓, ⚠, ●)*, exclamations *(« Bravo ! »)*, emoji |
| Hairlines au plus bas contraste légible | Cartes ombrées, fills colorés derrière du texte |
| Photographies de Recettes à proportion généreuse *(16:9)*, recadrées propres | Photos décoratives sur les écrans fonctionnels *(Menu draft, Listes)* |
| Polices iOS natives *(New York, SF Pro Text, SF Mono)* | Web fonts custom qui chargent en différé |
| Densité fonctionnelle sur Menu draft + Listes | Compresser à l'extrême — densité oui, illisibilité non |
| Mode clair seul au MVP | Activer le mode sombre au MVP |
| Tap targets ≥ 44pt iOS | Affichages tactiles serrés < 44pt qui imposent la précision |
| Notes Recette en italique meta dans bloc dédié | Mélanger les notes au flux des étapes — la note est une voix distincte |
