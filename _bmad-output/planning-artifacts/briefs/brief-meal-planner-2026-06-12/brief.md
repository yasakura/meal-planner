---
title: "Product Brief — Meal Planner"
status: ready
created: 2026-06-12
updated: 2026-06-12
project: meal-planner-bmad
mode: coaching
inputs:
  - "_bmad-output/brainstorming/brainstorming-session-2026-05-28-061315.md"
companions:
  - "addendum.md"
  - ".decision-log.md"
---

# Product Brief — Meal Planner

## Résumé exécutif

**Meal Planner** est une application web mobile, à usage strictement personnel, destinée à un foyer de trois personnes — Aurélie *(infirmière, 3 nuits par semaine)*, Lionel *(conjoint, développeur, concepteur de l'app)* et leur fils Rory *(8 ans)*. Elle répond à une friction quotidienne, sans drame mais profondément récurrente : décider du menu des 7-14 prochains jours coûte en moyenne ~2h15 par mois de temps familial arraché, et déclenche une cascade silencieuse — reconstituer mentalement les ingrédients pour les courses en ligne, gérer les items indisponibles, se souvenir des petites courses physiques à faire en semaine. Le coût n'est pas spectaculaire, c'est précisément ce qui le rend durable.

Le produit propose, dès l'ouverture, un menu pré-rempli sur une fenêtre paramétrable (7-14 jours), pioché dans un catalogue de recettes que le foyer alimente lui-même *(saisie manuelle et **import par lien depuis les sites classiques** — point d'attention central, hérité d'une précédente tentative ratée pour cause de friction de saisie)*. Il modélise nativement les cas réels du foyer : *1..N recettes par repas* — qui couvre à la fois le plat séparé de Rory et les soirs-nuits d'Aurélie où il faut trois assiettes différentes — et propose une **liste de courses principale** *(à acheter en ligne, cochable)* doublée d'une **liste secondaire physique** vers laquelle on bascule les items indisponibles sur le drive, pour qu'Aurélie n'ait plus à *se souvenir* de quoi acheter en magasin. Le différenciateur n'est ni technique ni marketing : *« pas plus beau, pas plus malin qu'une app grand public — exactement calibré pour nous, et possible à faire évoluer au fil de notre vie »*.

Le projet a deux moteurs assumés, dans cet ordre : **apprendre la méthode BMAD** sur un projet réel — sans cette dimension d'apprentissage, l'app n'existerait pas — et **construire un outil qui sert vraiment le foyer**. Le signal cardinal de succès est observable à 3 mois : la session menu de 45 minutes ne doit plus exister comme rituel, remplacée par un balayage rapide sous 5 minutes. Une condition d'arrêt est écrite noir sur blanc dans ce brief : si à 3 mois Aurélie ne s'en sert pas vraiment, autopsie honnête et pas de v2 par culpabilité. *L'app sert le foyer, pas l'inverse.*

## Le problème

Aurélie est infirmière. Elle travaille 3 nuits par semaine en moyenne, fait les courses du foyer en ligne (La Belle Vie, parfois Monoprix) tous les 10 à 14 jours, et porte aujourd'hui seule l'essentiel de la planification des repas. Pour pouvoir lancer une commande, il faut d'abord décider ce qu'on va manger — donc, environ trois fois par mois, Lionel et elle s'assoient ensemble pour faire le menu. La session dure **~45 minutes**, parfois étalée en deux temps, et elle est rarement fluide : ce n'est pas qu'il manque d'envies, c'est qu'on n'arrive pas à **mettre sur le papier** des envies floues, à composer avec les nuits d'Aurélie (3 plats à prévoir ces soirs-là : sa gamelle, le repas du fils, le repas de Lionel), et à dégager **~45 minutes d'affilée** dans un foyer où Rory (8 ans) et le chien occupent activement l'espace.

Une fois le menu décidé, le travail migre vers Aurélie : seule devant l'app de courses, elle **reconstitue de tête** les ingrédients de chaque recette — c'est une **deuxième charge mentale**, silencieuse mais qui pèse. Et elle débouche régulièrement sur une **troisième** : des items indisponibles forcent à modifier une recette à la volée, à re-commander le lendemain, ou à faire des **petites courses physiques en semaine** qu'il faut alors se rappeler, sans support.

Le coût n'est pas dramatique mais il est **réel et récurrent** : ~2h15 par mois de temps explicitement arraché au temps de qualité familial, plus le poids diffus des étapes 2 et 3 que personne ne chronomètre. Personne ne s'énerve dans ce foyer ; c'est précisément ce qui rend la friction invisible et durable. Il n'y a pas d'enjeu business à résoudre ce problème — il y a un foyer qui veut récupérer ses dimanches matin et ses sessions canapé, sans payer une rente cognitive perpétuelle au sujet *« qu'est-ce qu'on mange ? »*.

## La solution — colonne vertébrale

Un flux unique, continu, du catalogue à la liste de courses :

**Catalogue de recettes** *(saisie + import par lien)* → **Génération d'un menu** *(midi + soir, sur une fenêtre paramétrable de 7 à 14 jours)* → **Ajustement convives/portions** *(modèle 1..N recettes par repas)* → **Liste de courses agrégée** *(principale en ligne + secondaire physique)*.

À l'ouverture de l'app, le menu de la fenêtre en cours est **déjà proposé** ; l'utilisateur valide ou ajuste. Les ingrédients de toutes les recettes choisies sont automatiquement consolidés en une liste de courses ; chaque item peut être coché *(acheté en ligne)* ou basculé vers une liste secondaire *(à acheter physiquement en semaine)*.

## Form-factor

**Mobile-only**, foyer iPhone. La web app cible exclusivement le smartphone : ergonomie portrait, gestes tactiles, saisie minimale au clavier mobile. **Pas de version desktop ni tablette prévue** — tout arbitrage UX se fait sous cette contrainte. La décision PWA installable (vs simple site responsive) est reportée à la phase Architecture, en tenant compte du support iOS Safari au moment du build.

## Scope

### MVP — strict minimum pour qu'Aurélie l'utilise dès la 1ʳᵉ semaine

1. **Catalogue de recettes** : saisie manuelle *(titre, ingrédients/quantités pour un nombre de portions de référence, étapes/notes optionnelles)* + **import par lien depuis les sites de recettes classiques** *(extraction via données structurées type schema.org)*. Une recette peut être ajustée et annotée — *c'est notre version, pas celle d'internet*.
2. **Génération d'un menu** (midi + soir) sur une **fenêtre paramétrable de 7 à 14 jours** (défaut 14). Pioche/règles basiques au départ — pas d'IA "intelligente".
3. **Modèle "1..N recettes par repas"** — chaque recette d'un même repas porte ses propres convives. *Couvre nativement le plat séparé de Rory, et les soirs-nuits d'Aurélie (3 plats sur un même créneau).*
4. **Gamelle Aurélie** *(soirs-nuits)* : soit une **recette dédiée du catalogue** *(sous-pool « format gamelle », type bo bun, salade de riz…)*, soit un **slot libre** sans nom de recette obligatoire — au choix du planificateur.
5. **Retouche du menu** : régénération à 2 temps *(auto, puis pioche manuelle dans le catalogue)* + tout éditable *(recette, convives, scinder/fusionner)*. Recalcul automatique des quantités.
6. **Liste de courses principale** : agrégée sur toute la fenêtre, regroupée par catégorie, cochable, copiable.
7. **Liste de courses secondaire (physique)** : chaque item de la liste principale peut être basculé vers une liste secondaire *(« à acheter en magasin »)*, elle-même cochable et consultable mobile *(usage en magasin par Aurélie)*.
8. **Historique des menus passés** *(lecture seule, ~2-3 semaines)*.
9. **Comptes & collaboration** : **2 comptes séparés** *(Aurélie + Lionel, chacun ses identifiants)* pointant vers **un même board foyer partagé**.

### Hors-MVP — quick wins envisagés juste après

- Repas récurrents / épingler des repas favoris.
- Élargir les sources d'import au-delà des sites classiques *(plus de domaines supportés)*.

### Plus tard — v2+ (étoiles à viser, pas à coder maintenant)

- **Import depuis Instagram** *(source majeure d'inspiration d'Aurélie)* et **import photo/OCR de livres**.
- **Équilibre nutritionnel** automatique sur la fenêtre.
- **Budget effort/temps par jour** + champ effort par recette *(rendre opérationnelle la planif consciente de l'énergie)*.
- **Export vers le panier du drive en ligne** *(La Belle Vie, Monoprix)* — **l'étoile du nord**. Dépend de la disponibilité d'API publiques côté drives.
- **Génération « intelligente »** *(apprentissage des goûts, recettes plus subtiles)*.
- **Planification de la gamelle d'Aurélie en B2/B3** *(portion supplémentaire du dîner, restes J-1)*.

### Hors-scope assumé *(décisions actives — pas un oubli)*

- **Anti-gaspillage / inventaire du frigo** : écarté définitivement. Ne correspond pas aux habitudes du foyer *(pas de gaspillage)* et imposerait de saisir le contenu du frigo — incompatible avec l'exigence transverse de **minimiser la saisie manuelle**.

### Limite connue du MVP *(à assumer dans la communication interne du foyer)*

La **cascade « item indispo sur le site de courses »** n'est pas résolue côté drive — il n'existe pas d'API publique fiable. Aurélie continuera de gérer manuellement le remplacement de recette ou le report de commande, comme aujourd'hui. **Le mécanisme de liste secondaire physique traite en revanche la friction des courses oubliées en semaine**, qui est la conséquence la plus pénible de cette cascade.

## Pourquoi construire plutôt qu'utiliser ce qui existe

Aurélie utilise déjà **Jow** ponctuellement pour piocher des recettes, mais sans en faire son outil de planification. Lionel avait, il y a quelques mois, tenté un premier proto maison ; il est mort-né — **pas assez ergonomique, et trop de friction pour saisir les recettes**. Cette expérience est la principale leçon qu'on porte dans cette nouvelle tentative : **le moment où Aurélie ajoute une recette ne doit jamais être l'endroit où elle abandonne l'app**. C'est pour cela que l'import par lien (sites de recettes classiques via données structurées) est au cœur du MVP, et pas un *nice-to-have*.

Le différenciateur n'est donc ni technique, ni marketing : il est **dans la précision de la cible**. Une app grand public — Jow ou autre — ne modélisera jamais un foyer où l'on doit planifier *3 plats sur le même soir* quand un parent travaille de nuit, gérer une **gamelle infirmière** côté catalogue, basculer un item indisponible vers une **liste de courses physiques secondaire**, ni tolérer un horizon paramétrable de 7 à 14 jours pour coller à un rythme de courses tous les 10 jours. Ces spécificités ne sont rentables pour personne d'autre que les trois personnes du foyer.

## Pour qui

Un seul foyer : **Aurélie, Lionel, et leur fils Rory (8 ans)**. Il n'y a ni cible marché, ni utilisateur secondaire, ni intention de partager l'app. Cette contrainte radicale est une force : tout arbitrage produit peut être tranché par observation directe d'un usage réel et permanent.

### Aurélie — utilisatrice principale

Infirmière, porteuse de la charge mentale planification + courses. D'origine vietnamienne, puise beaucoup de recettes sur Instagram. **Pour elle, l'app réussit le jour où** elle peut ouvrir son téléphone un samedi matin, voir un menu déjà prêt pour les 10-14 jours, l'ajuster en quelques minutes plutôt qu'en quarante-cinq, et passer directement à une liste de courses qu'elle n'a plus besoin de reconstituer.

### Lionel — co-utilisateur

Conjoint, développeur (et concepteur de l'app). Co-décide du menu, cuisine pour lui et Rory les soirs où Aurélie travaille. **Pour lui, l'app réussit le jour où** les sessions menu de 45 minutes disparaissent — remplacées par une relecture rapide à deux — et où il ouvre l'app le soir pour savoir ce qu'il prépare, sans avoir à demander.

### Rory (8 ans) — utilisateur indirect, mais contrainte structurante

Pas utilisateur de l'app. En revanche, sa **phase pâtes** dimensionne le modèle de données : un repas du foyer comprend fréquemment **deux recettes** (le plat des parents + un plat enfant). Compté comme un adulte pour les portions par simplification MVP.

## Critères de succès

Aucune métrique d'analytics. Les critères sont **observables au quotidien**, et tranchables en conversation directe entre Aurélie et Lionel. Ils s'organisent en trois horizons.

### À 1 mois après mise en production — *« est-ce qu'on s'en sert ? »*

- **Aurélie a lancé au moins 2 commandes** en s'appuyant sur la liste générée par l'app (pas reconstituée de tête).
- Le catalogue contient **au moins 15-20 recettes** réellement utilisées par le foyer — l'inventaire "de tête" actuel (~15 recettes favorites) est numérisé, plus quelques nouveautés.
- **Aucun blocage rédhibitoire** à l'ajout d'une recette — ni Aurélie, ni Lionel n'a renoncé à saisir une recette à cause de la friction (la leçon du proto précédent).

### À 3 mois — *« est-ce que ça nous facilite vraiment la vie ? »*

- **La session menu de 45 minutes est supprimée comme rituel** : décider du menu se fait en **moins de 5 minutes**, en balayage rapide et ajustement marginal — plus en composition. C'est *le* signal cardinal. (Ce n'est pas une réduction de durée, c'est un changement de nature : on ne *s'assoit plus pour faire le menu*.)
- **Aurélie ne reconstitue plus les ingrédients de tête** lorsqu'elle commande.
- **La liste de courses secondaire** est utilisée au moins une fois et a évité un *« faut se souvenir de quoi acheter »*.
- **L'app survit aux nuits d'Aurélie** : les soirs où elle travaille, Lionel ouvre l'app et trouve ce qu'il doit préparer pour Rory et lui, sans avoir à demander.

### À 6 mois — *« est-ce que ça tient ? »*

- L'app est **toujours utilisée** (pas oubliée derrière une icône). Le seuil de mort des apps perso est ~3 mois ; passer 6 mois est le vrai signe d'intégration au quotidien.
- Le catalogue continue de **s'enrichir naturellement** — preuve que la saisie/import est suffisamment fluide pour ne pas être un frein.
- Au moins **une fonctionnalité v2** *(quick win post-MVP, étoile du nord, etc.)* a été désirée explicitement par Aurélie ou Lionel — signe que le MVP a créé un appel, pas couvert tout l'espace.

### Condition d'arrêt — *« à quel signal on arrête les frais ? »*

Si au bout de **3 mois**, Aurélie continue de faire les courses **principalement** sans l'app (de tête + Jow) parce qu'elle la trouve plus contraignante que pratique, alors le produit a raté sa promesse principale — pas la méthode BMAD, le produit. Dans ce cas : autopsie honnête, on consigne ce qu'on a appris (méthode + tech), on n'investit pas en v2 par culpabilité. *L'app sert le foyer, pas l'inverse.*

## Vision

À 2-3 ans, si le MVP s'est installé dans le quotidien et que les conditions de succès sont tenues, le produit cesse d'être une "app de planification" pour devenir le **livre de cuisine vivant du foyer** — un patrimoine culinaire numérique qui accumule au fil des années les recettes vietnamiennes d'Aurélie, les plats que Rory finit par adorer en sortant de sa phase pâtes, les classiques de la famille importés depuis Instagram ou photographiés dans un livre. *Le succès, dans cette projection, c'est qu'on n'imagine plus se passer de l'app.*

Les directions naturelles d'évolution suivent ce que le quotidien fait remonter, dans cet ordre approximatif : ouvrir l'import au-delà des sites classiques *(Instagram en premier, puis photo/OCR pour les livres)*, intégrer une notion d'**effort/temps** par recette pour que la génération respecte le rythme de la semaine, ajouter une couche d'**équilibre nutritionnel** discret, et — l'**étoile du nord** — boucler le flux en exportant la liste de courses directement dans le panier du drive en ligne *(La Belle Vie, Monoprix)*. Cette dernière dépend de l'ouverture d'API publiques côté drives, hors de notre contrôle ; on la garde en cible inspirante, pas en jalon planifié.

L'app vit avec le foyer : elle s'adapte aux changements de rythme d'Aurélie, à Rory qui grandit — il manifeste déjà ponctuellement l'envie de cuisiner avec ses parents, l'app pourra l'accompagner dans ce mouvement — et reste suffisamment souveraine pour que rien, ni un service externe qui ferme, ni un changement de drive en ligne, ne mette en péril le patrimoine accumulé.
