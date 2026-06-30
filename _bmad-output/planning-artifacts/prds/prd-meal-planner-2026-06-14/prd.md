---
title: "PRD — Meal Planner"
status: final
created: 2026-06-14
updated: 2026-06-18
project: meal-planner-bmad
mode: coaching
inputs:
  - "_bmad-output/planning-artifacts/briefs/brief-meal-planner-2026-06-12/brief.md"
  - "_bmad-output/planning-artifacts/briefs/brief-meal-planner-2026-06-12/addendum.md"
  - "_bmad-output/planning-artifacts/briefs/brief-meal-planner-2026-06-12/.decision-log.md"
companions:
  - ".decision-log.md"
---

# PRD — Meal Planner

## 0. Document Purpose

Ce PRD spécifie le **MVP de Meal Planner**, web app mobile à usage strictement personnel pour le foyer Lionel + Aurélie + Rory. Il est consommé en aval par les phases **UX** *(Sally)*, **Architecture** *(Winston)* et **Implementation** *(Amelia)* de la méthode BMAD. Il s'appuie sur le **Product Brief** amont *(`_bmad-output/planning-artifacts/briefs/brief-meal-planner-2026-06-12/`)* — il ne duplique pas la matière du brief *(scènes, persona détaillée, justifications historiques, décisions D1-D6)*, il la **transforme** en exigences fonctionnelles précises. Pour le détail du contexte humain, lire le brief et son addendum.

**Structure.** §3 Glossary ancre le vocabulaire *(utilisé tels quels en aval)*. §4 groupe les Features avec FR-1 à FR-24 numérotés globalement, plus NFRs cross-cutting au §4.7. Décisions de séance dans `.decision-log.md` *(U1-U26)*, référencées en ligne par leur ID. Arbitrages encore ouverts en §8.

## 1. Vision

**Meal Planner est une web app mobile à usage strictement personnel** *(un foyer, trois personnes — Aurélie, Lionel, Rory)*, qui supprime la **session-rituel** de 45 minutes consacrée à *« décider ce qu'on va manger »* et les deux charges mentales en cascade qui la suivaient *(reconstituer les ingrédients pour les courses en ligne, se souvenir des courses physiques résiduelles en semaine)*. Le produit n'a pas d'ambition marché : son différenciateur n'est ni technique ni marketing, c'est la **précision de la cible** — un seul foyer connu, observable, dont les contraintes spécifiques *(les nuits de garde régulières d'Aurélie, la phase pâtes de Rory, l'appétence iPhone du foyer)* peuvent être modélisées sans compromis. La vision-mantra du brief résume l'esprit : *« pas plus beau, pas plus malin qu'une app grand public — exactement calibré pour nous, et possible à faire évoluer au fil de notre vie »*.

À l'ouverture de l'app, un **Menu pré-rempli** des 10-14 prochains jours s'affiche déjà. La session de planification — historiquement 45 minutes à deux, parfois étalée en deux temps, dans une cuisine où l'espace mental est occupé par un enfant de 8 ans et un chien — devient un **balayage rapide à valider ou ajuster** ; la cible à 3 mois est **moins de 5 minutes**. La validation du Menu déclenche immédiatement la génération d'une **Liste de courses agrégée**, regroupée par catégorie, doublée d'une **Liste secondaire** vers laquelle on bascule les items indisponibles sur le drive — accessible **hors-ligne en magasin**, partagée entre les deux Comptes du foyer. Les soirs de garde d'Aurélie, l'app sait déjà que trois plats parallèles sont à prévoir ; les soirs en famille, un seul plat ; quand Rory veut autre chose, on ajoute un Slot en un geste.

Le coût de la friction supprimée *(détail chiffré au brief)* n'est pas spectaculaire — c'est précisément ce qui le rend durable. ***Personne ne s'énerve dans ce foyer*** *; c'est précisément ce qui rend la friction invisible — et ce qui calibre les choix UX en aval : pas de dramatisation, pas de gamification anxiogène, pas de notifications culpabilisantes.* À 2-3 ans — si le MVP a tenu sa promesse à 3 mois et à 6 mois — Meal Planner cesse d'être une *« app de planification »* pour devenir le **livre de cuisine vivant du foyer** *(les recettes vietnamiennes d'Aurélie, les classiques de famille, les plats que Rory finira par adorer en sortant de sa phase pâtes — Rory qui manifeste déjà ponctuellement l'envie de cuisiner)*. ***L'app vit avec le foyer*** : elle s'adapte aux changements de rythme d'Aurélie, à Rory qui grandit. Et si le MVP ne tient pas, une condition d'arrêt explicite est inscrite dans le brief : pas de v2 par culpabilité, autopsie honnête, on apprend, on s'arrête. *L'app sert le foyer, pas l'inverse.*

## 2. Target User

**Un seul foyer cible** : Aurélie, Lionel, et leur fils Rory (8 ans). Pas de cible marché. Cette contrainte radicale, énoncée au brief, est une **force** : tout arbitrage produit peut être tranché par observation directe d'un usage réel et permanent. Le détail des protagonistes et de leur contexte est consigné dans le brief *(§ « Pour qui »)* et dans l'addendum *(« Détails persona »)* — ce PRD ne les duplique pas.

### 2.1 Jobs To Be Done

Le foyer cherche à être délivré de la session-rituel *« qu'est-ce qu'on mange ? »* et de ses charges secondaires *(reconstituer les ingrédients, se souvenir des courses physiques résiduelles)*. Sous cette intention générale, les jobs concrets, mêlant fonctionnel, émotionnel, social et contextuel :

**Fonctionnels**

- *« Décider quoi manger les 10-14 prochains jours, sans avoir à composer de zéro »* — Aurélie + Lionel, session menu *(UJ-1)*.
- *« Connaître la liste de courses sans la reconstituer mentalement à chaque commande »* — Aurélie, devant le drive *(UJ-3)*.
- *« Se rappeler des courses physiques qui restent à faire en semaine, sans support mental »* — Aurélie + Lionel, mobilité *(UJ-4)*.
- *« Savoir ce que je cuisine ce soir, en moins de 5 secondes, sans demander »* — Lionel, soir-nuit *(UJ-2)*.
- *« Vérifier la gamelle planifiée pour ce soir avant de la préparer »* — Aurélie, après-midi de jour de nuit *(UJ-2b)*.
- *« Capitaliser nos recettes — celles d'Aurélie depuis Instagram, celles de famille — sans friction de saisie »* — UJ-5.

**Émotionnels**

- *« Récupérer les dimanches matin et les sessions canapé »* — couple — ne plus payer une rente cognitive perpétuelle sur le sujet « repas ».
- *« Sentir que cet outil sert vraiment notre foyer »* — Lionel, en tant que concepteur — et pas un alibi d'apprentissage déconnecté.

**Sociaux**

- *« Que la charge de planification cesse de reposer principalement sur Aurélie »* — rééquilibrage du couple.
- *« Que mon conjoint sache aussi ce qui se passe ce soir sans avoir à me poser la question »* — visibilité partagée du Menu validé *(UJ-2b)*.

**Contextuels**

- *« Composer avec mes nuits de travail régulières, sans avoir à les redire à l'app »* — Aurélie, via le pattern récurrent *(FR-4)*.
- *« Adapter à la volée la commande quand un item est indisponible sur le drive »* — Aurélie, sans cascade mentale *(UJ-3 + UJ-4)*.
- *« Cuisiner vite, plat simple, quand je suis seul avec Rory »* — Lionel, modèle recette ultra-simple toléré *(U8)*.

*(Le projet porte par ailleurs un méta-moteur d'apprentissage de la méthode BMAD côté Lionel, énoncé au brief. Ce n'est pas un Job du produit, mais il colore les choix d'implémentation aval — voir brief.)*

### 2.2 Non-Users (v1)

Ce PRD couvre **un seul foyer**. Sont **explicitement hors-cible** au MVP :

- **Tout autre foyer.** Pas de multi-tenant *(U24)* — un seul Board partagé instancié. Si un proche demande à utiliser l'app, le système ne saura pas le servir nativement.
- **Foyers de >5 Convives.** Le modèle FR-3 / FR-15 tolère 1..N Convives par construction, mais la pioche auto, l'agrégation et le format Slot sont calibrés pour un foyer 2-4 personnes. Au-delà, l'ergonomie n'a pas été pensée.
- **Régimes spécifiques** *(végétarien strict, sans-gluten, diététique sportive, etc.)*. Le Catalogue est neutre — pas de tags diététiques, pas de contraintes nutritionnelles imposées. L'utilisateur reste libre de ses recettes, mais l'app ne l'aide pas à composer un régime particulier.
- **Cuisinier solo** *(personne seule)*. L'app est dimensionnée par la dynamique de couple + enfant ; la session menu en solo *(U7)* est supportée mais le besoin de planification anticipée à 7-14 jours n'a pas la même valeur sans la contrainte « courses pour plusieurs ».
- **Usage professionnel** *(traiteur, restauration, foyer collectif)*. Hors-scope total — modèle de données et d'usage incompatibles.

### 2.3 Key User Journeys

*Numérotés globalement UJ-1 à UJ-N. Les FR du §4 référencent les UJ par leur ID (« réalise UJ-3 »). Les décisions UX (U1, U2, …) référencées dans les UJ sont consignées dans `.decision-log.md`.*

#### UJ-1. Aurélie planifie le menu, un samedi matin

**Persona + contexte.** Aurélie *(persona §2)* — infirmière, 3 nuits/semaine régulières, porteuse principale de la planification du foyer. Foyer iPhone, 2 Comptes Meal Planner sur le même Board partagé. Catalogue ~20 Recettes *(scenario mois 3+)*.

**Entry state.** Samedi matin, ~10h. Aurélie et Lionel à la cuisine, café du petit-déjeuner. Précédente commande livrée la semaine d'avant. La **fenêtre de planification** en cours arrive à échéance. Aurélie dit *« tiens, il faut qu'on planifie qu'est-ce qu'on va manger cette semaine »*. Elle est déjà authentifiée (session iOS persistante).

**Path.**

1. Aurélie ouvre l'app sur son iPhone. **Le menu pré-rempli des 10-14 prochains jours est immédiatement à l'écran** *(midi + soir)*. Les soirs où Aurélie travaille — pré-remplis sur la base de son **planning récurrent paramétré au setup foyer** *(U3)* — apparaissent déjà comme *« gamelle Aurélie + repas Rory + repas Lionel »*.
2. Lionel et elle parcourent ensemble, recette par recette. Sur chaque case qui leur déplaît : un tap **« régénère »** → l'app pioche une autre recette du catalogue. Si la 2ᵉ pioche ne convient pas, Aurélie ouvre le catalogue et **choisit manuellement** la recette de remplacement *(régénération à 2 temps — U2)*.
3. Sur les soirs-nuits, Aurélie ajuste si besoin : **supprimer la gamelle** quand elle est en congé/échange de garde ce soir-là, choisir la **recette gamelle** dans le sous-pool *« format gamelle »*, ou laisser un **slot libre** *(improvisation J)*.
4. Une fois satisfaits, Aurélie tape **« Valider le menu »** *(geste actif unique)* → l'app **génère immédiatement la liste de courses agrégée**, regroupée par catégorie *(légumes / viandes / épicerie / etc.)*. **Le menu validé est conservé** et reste consultable à tout moment *(U6)*.

**Climax.** La **liste de courses est à l'écran, regroupée par catégorie, prête**, et le **menu validé est désormais accessible** depuis n'importe quel écran de l'app, à n'importe quel moment de la quinzaine. C'est *le* moment de bascule : Aurélie sait qu'elle n'aura **pas à reconstituer mentalement** les ingrédients, et que **Lionel pourra venir consulter** le menu / la liste plus tard *(typiquement le soir avant de cuisiner)*.

**Resolution.** Ils retournent au petit-déjeuner. **~2 heures plus tard**, Aurélie ouvre l'app du drive *(La Belle Vie)* sur son iPhone, et la liste principale de Meal Planner à côté. Pendant qu'elle remplit le panier en ligne, **elle bascule vers la liste secondaire** uniquement les items qui ne sont **pas disponibles** sur le drive *(U1 — pas de cochage des items mis au panier, double usage avec le drive)*. La liste principale reste affichée telle quelle après la commande, jusqu'à la prochaine session menu qui la remplacera *(U4)*. La liste secondaire, elle, **persiste** indépendamment et pourra être utilisée plusieurs fois dans la quinzaine, par Aurélie ou Lionel *(U5)*.

**Variante observable — session solo.** Cette scène se déroule **parfois en solo** *(Aurélie ou Lionel seul·e)* — même path, même climax. La validation du menu rend le résultat **immédiatement visible** sur le compte du conjoint à la prochaine ouverture de l'app. **Aucun mécanisme de co-décision en temps réel n'est attendu au MVP** *(U7)*.

**Edge case.** La 1ʳᵉ pioche auto re-propose **la même recette** qu'on vient de rejeter *(catalogue petit, jeu de pioche limité — surtout les 1ᵉʳˢ mois)*. → L'utilisateur passe directement au choix manuel dans le catalogue, sans frustration *(le 1-clic suffisait, le 2-clic est intuitif)*.

#### UJ-2. Lionel ouvre l'app un soir-nuit pour cuisiner pour Rory et lui

**Persona + contexte.** Lionel, conjoint d'Aurélie, dev *(et concepteur de l'app)*. Cuisine pour lui et Rory *(8 ans, phase pâtes)* les soirs où Aurélie travaille — environ **3 fois par semaine**, sur les soirs récurrents paramétrés au foyer *(U3)*. Pas chef à la base — sur ces créneaux, il **optimise pour le temps de préparation court**.

**Entry state.** Mardi soir, ~19h15. Aurélie est partie vers 18h45 *(sa gamelle a été préparée plus tôt — autre flux)*. Lionel est seul avec Rory à la cuisine. Le **menu de la quinzaine est validé depuis quelques jours**. L'app n'a pas été ouverte depuis la session menu de samedi, mais la session iOS persiste *(authentifié en arrière-plan)*.

**Path.**

1. Lionel ouvre l'app pour **identifier le repas du soir**. *[NOTE FOR PM (UX) : la mécanique exacte — vue « aujourd'hui » avec sélecteur midi/soir, liste verticale scrollable, vue calendrier… — est explicitement reportée à la phase UX. Contrainte forte : Lionel doit pouvoir identifier la recette du repas courant en **moins de 5 secondes**.]*
2. Il **identifie les recettes du soir**. Ce soir, c'est *« ratatouille en conserve + falafels airfryer pour moi / pâtes pour Rory »* — le repas est composé de **2 recettes parallèles** *(modèle 1..N — D1 du brief)*, dont au moins une au format **ultra-simple** *(U8 — boîte + airfryer, pas d'étapes structurées)*.
3. **Décision de profondeur de lecture** :
    - Si la recette est **ultra-simple**, Lionel **ferme l'app**, va dans les placards, prépare, sert.
    - Si la recette est **plus structurée** *(une vraie recette du catalogue, étapes à suivre)*, il **garde l'app ouverte** sur le plan de travail le temps de la cuisine, en référence pendant l'exécution.
4. Si quelque chose cloche **en plein flux** *(ingrédient manquant, Rory boude les pâtes, etc.)*, Lionel **improvise hors-app** — il ne touche pas au menu validé *(U9 — modifier en cours décalerait les autres repas et la liste de courses)*.

**Climax.** Le repas est servi. L'app a tenu **deux rôles distincts** dans une seule session — **réception** d'une information *(« qu'est-ce que je cuisine ce soir ? »)*, puis éventuellement **référence** pendant l'exécution. **Aucune saisie n'a été nécessaire** : zéro saisie = scénario réussi.

**Resolution.** Lionel ferme l'app *(ou la laisse en veille sur le plan de travail jusqu'à la fin de la cuisson, selon le cas)*. **Aurélie n'a aucune interaction avec l'app pendant ces soirs-nuits** — elle travaille, elle a sa gamelle. L'app vit en **mono-compte actif** côté foyer *(U10 — pas de live-sync attendue, cohérence éventuelle suffit)*.

**Edge case.** Lionel se rend compte qu'il **manque un ingrédient** au moment de cuisiner *(les courses ne l'ont pas couvert, ou il a été utilisé pour un autre repas)*. → Il **improvise hors-app** *(remplace, se passe, ou — rare — commande une livraison express)*. Le menu validé reste intouché *(U9)*. Conséquence indirecte : si l'item manquant doit être racheté, il bascule dans la **liste secondaire physique** *(workflow UJ-4, hors de ce flux soir-nuit)*.

#### UJ-2b. Aurélie consulte le menu plus tôt pour préparer sa gamelle *(scène miroir, format light)*

**Aurélie, le matin (ou en début d'après-midi) du jour où elle travaille de nuit, ouvre l'app pour vérifier quelle gamelle est planifiée ce soir-là, la prépare en cuisine, l'emporte au travail.** Consultation rapide du menu validé *(le drill-down sur un repas précis — U11)*, **aucune saisie, aucune édition**. Cette scène valide le fait que le menu validé est **matière de référence partagée** entre les deux comptes du foyer, et pas seulement pour le moment de la cuisine du soir.

#### UJ-3. Aurélie passe sa commande en ligne avec la liste principale

**Persona + contexte.** Aurélie *(persona détaillée UJ-1)*, familière du drive **La Belle Vie** *(principal)* et Monoprix *(secondaire)* depuis plusieurs années. Sur son iPhone, gère le va-et-vient entre 2 apps *(le drive + Meal Planner)*.

**Entry state.** Samedi, ~12h30. La session menu de 10h *(UJ-1)* est terminée et validée. La **liste principale** est prête : items **agrégés par ingrédient**, **regroupés par catégorie** *(U12 — catégorisation exacte UX-décidée)*.

**Path.**

1. Aurélie ouvre la liste principale dans Meal Planner. Elle lance La Belle Vie en parallèle *(bascule entre 2 apps, geste iOS standard)*.
2. **Va-et-vient continu** : elle lit un item dans Meal Planner, le cherche dans le drive, l'ajoute au panier. Aucune action de « marquer comme acheté » dans Meal Planner *(U1 — pas de cochage des items mis au panier, double usage avec le drive)*.
3. Si l'item est **indisponible** sur le drive, elle le **bascule vers la liste secondaire** dans Meal Planner *(geste UX-décidé — U13)*. L'item quitte visuellement la liste principale et apparaît sur la secondaire.
4. Si elle se ravise *(« en fait, je l'ai trouvé sous une autre marque sur le drive »)*, elle peut **renvoyer l'item de la secondaire à la principale** — bascule réciproque *(U13)*.
5. Quand le panier drive est rempli, Aurélie passe la commande **sur le drive** *(action hors-app Meal Planner)*. Elle ferme Meal Planner sans aucun geste de clôture — la liste principale **reste affichée** *(U4)*.

**Climax.** Le panier est validé et payé sur le drive. **La 2ᵉ charge mentale de la chaîne du brief — « reconstituer de tête les ingrédients » — est supprimée**. Aurélie a juste eu à **traduire item-par-item** ce qui était déjà consolidé. Et la liste secondaire contient maintenant **exactement ce qu'elle aurait dû se souvenir de tête** dans l'ancien monde *(les items indispos à racheter en physique)* — l'app le retient pour elle. Cette résolution **prépare directement UJ-4** *(le moment où elle s'en sert en magasin)*.

**Resolution.** La commande sera livrée plus tard dans la journée *(workflow drive, hors-app)*. La liste secondaire reste accessible, à Aurélie comme à Lionel *(U5)*. Pas de quantités précises côté drive — Aurélie continue d'arrondir mentalement comme aujourd'hui *(U14 — reporté en v2+)*.

**Edge case.** Aurélie a **basculé un item** vers la secondaire, **passe la commande**, puis **revient dans Meal Planner**. Elle voit la liste principale **avec moins d'items** *(ceux basculés ont disparu)*. → Comportement attendu, pas une perte d'information : les items basculés sont **toujours là, sur la liste secondaire**. *[NOTE FOR PM (UX) : assurer une **visibilité claire** de l'état « X items sur la secondaire » depuis la liste principale, pour éviter le sentiment de perte.]*

#### UJ-4. Aurélie en magasin avec la liste secondaire physique

**Persona + contexte.** Aurélie *(persona détaillée UJ-1)*, en mobilité — Monoprix du coin / Naturalia / fromagerie, sur le chemin entre la maison et le travail. Environnement parfois sans réseau *(sous-sol Monoprix, parking souterrain)*. iPhone dans la main, sac et chariot dans l'autre.

**Entry state.** Mardi, ~17h30. Aurélie a un peu de temps avant d'aller travailler. La **liste secondaire** contient une dizaine d'items basculés depuis la liste principale lors de la commande drive du samedi *(UJ-3)*. Elle ouvre Meal Planner sur l'onglet « liste secondaire ».

**Path.**

1. À l'entrée du magasin, Aurélie ouvre la liste secondaire. **Consultable hors-ligne** *(U18 — cache local PWA / Service Worker, stack tech tranchée par Architecture)*. Format de présentation **UX-décidé** *(U15)*.
2. Elle parcourt les rayons. Quand elle attrape un item, elle le **coche** dans la liste. L'item passe en **état coché** *(visible, marqué fait)* — **soft-delete : il disparaît automatiquement 24h plus tard** *(U16 — tampon contre les coches par erreur)*.
3. Certains items ne sont pas trouvés *(épuisé, mauvais magasin, pas le temps)*. Les non-cochés **restent sur la liste** pour une visite ultérieure — par Aurélie elle-même, ou par Lionel *(U5, U17)*.
4. Aurélie sort du magasin. Au retour réseau *(parking, retour voiture)*, les coches se **synchronisent** automatiquement vers le compte partagé *(U18)*.

**Climax.** Aurélie repart au boulot, panier physique en main, **sans avoir eu à mémoriser quoi que ce soit**. **La 3ᵉ charge mentale du brief — « se souvenir des petites courses physiques à faire en semaine » — est supprimée.** L'app a tenu son rôle exactement où la friction faisait mal : *en mobilité, hors-domicile, parfois hors-réseau*.

**Resolution.** Le lendemain matin, Lionel ouvre l'app, voit que la liste secondaire a maintenant 4 items au lieu de 10 *(6 ont été cochés et vont disparaître dans les heures qui viennent)*. Il sait quoi prendre à la boulangerie sur le chemin du retour. La liste persiste jusqu'au prochain **vidage manuel** par le foyer *(U17 — pas de purge auto)*.

**Edge case.** Aurélie coche un item, sort du magasin, et en regardant le ticket de caisse se rend compte qu'elle ne l'a **pas réellement acheté** *(elle pensait l'avoir attrapé, ou Lionel l'avait coché par anticipation)*. → Elle a **24h pour décocher**, avant que le soft-delete ne le fasse disparaître *(U16)*. Sans ce délai, l'item serait perdu et il faudrait le retrouver dans la liste principale ou ressaisir.

#### UJ-5. Enrichir et éditer le catalogue de recettes

**Persona + contexte.** Principalement **Aurélie** *(puise l'inspiration sur Instagram, qui renvoie vers des blogs culinaires)* et **Lionel** *(saisit ponctuellement des recettes familiales)*. **Friction historique critique** : *c'est sur cette scène que le proto précédent est mort*. NFR-X1 « zéro saisie » est inapplicable au sous-flux 5b — l'UX devra donc **optimiser cette saisie au maximum**.

**Entry state.** *Cas type 5a :* Aurélie est sur Instagram, voit une recette de bo bun, le post renvoie vers un blog culinaire. Elle copie l'URL et ouvre Meal Planner. *Cas 5b :* pas d'URL — Lionel veut saisir une recette familiale. *Cas 5c :* la recette existe déjà, on revient l'ajuster après cuisson.

**Path.**

**5a — Import par lien *(cardinal)*.**

1. Aurélie tape « + » → « importer depuis un lien ». Elle colle l'URL.
2. L'app tente l'extraction via les données structurées `schema.org/Recipe` *(U19)*.
3. **Cas succès** : un formulaire pré-rempli s'affiche *(titre, ingrédients/quantités, étapes, photo, URL source — U23)*. Aurélie peut **ajuster** avant de sauvegarder *(corriger une quantité, ajouter une note, retirer une étape inutile)*.
4. **Cas échec** *(site non supporté, schema cassé)* : **message d'erreur clair** *(« ce site n'est pas supporté pour l'instant »)* + **bouton « saisie manuelle »** qui redirige vers le formulaire vide *(5b)* *(U19)*.
5. Aurélie sauvegarde. La recette rejoint le catalogue, immédiatement disponible pour les prochaines sessions menu.

**5b — Saisie manuelle.**

1. Formulaire vide. **Champs obligatoires : titre + ingrédients avec quantités** *(U20)*. Tout le reste *(étapes, photo, durée, catégorie, notes)* est optionnel.
2. Saisie clavier mobile — la seule scène où NFR-X1 ne tient pas. L'UX doit **optimiser cette friction au maximum** *(autocomplete sur ingrédients connus, copier-coller blocs texte, etc.)*.
3. Sauvegarde → catalogue.

**5c — Édition / note ultérieure.**

1. Deux mois plus tard, le foyer cuisine la recette. À table, *« j'ai mis moins de sucre, c'était mieux »*.
2. Aurélie *(ou Lionel)* ouvre la recette dans le catalogue. **N'importe quel compte du foyer peut éditer n'importe quelle recette** *(U22)*.
3. Elle modifie une quantité, ou ajoute une **note libre** dans le champ propre dédié *(textarea unique, pas un journal multi-entrées — U22)*.
4. Sauvegarde. **Pas d'historique de modifications conservé** *(U22 — hors-scope MVP)*. La version éditée devient la référence pour les prochaines cuissons.

**Climax.** **La leçon du proto précédent est tenue** : enrichir le catalogue ne tue plus l'app. Dans le cas 5a *(import par lien)* — qui est le cas majoritaire d'Aurélie — l'ajout d'une recette se fait en **moins d'1 minute, sans frapper plus de 2-3 touches** *(coller l'URL, valider)*. Le catalogue grossit naturellement au fil des envies réelles du foyer.

**Resolution.** La nouvelle recette rentre dans le pool *(éligible indifféremment à tout slot — U21, pas de typage « gamelle »)*. À la prochaine session menu *(UJ-1)*, elle peut apparaître naturellement dans la pioche. Le catalogue continue de s'enrichir cycle après cycle. **Le critère de succès « le catalogue continue de s'enrichir naturellement » du brief (6 mois) est servi par ce flux.**

**Edge case.** Aurélie veut importer une recette **Instagram natif** *(post, vidéo Reel, pas de lien blog derrière)*. **Hors-scope MVP** *(D5 du brief : Instagram en v2+)*. Message d'erreur + redirection saisie manuelle *(U19)*. Aurélie sait *(parce qu'on lui aura dit, ou par tâtonnement)* qu'il faut chercher le lien blog dans la bio ou les commentaires plutôt que de coller un lien Instagram direct.

## 3. Glossary

*Termes consolidés à partir des 5 UJ. Les FR du §4, les SM du §7 et la suite du PRD utilisent ces termes **exactement** — pas de synonyme. Les phases UX/Architecture aval doivent reprendre ce vocabulaire à l'identique.*

### Comptes et board partagé

*Pas de notion de « Foyer » comme entité du modèle au MVP — un seul Board partagé est instancié, racine implicite de tout le reste *(U24)*. Le mot « foyer » reste utilisé en prose et dans les noms composés *(« Setup foyer »)* mais n'est pas un terme du modèle.*

- **Board partagé** — Espace logique racine unique au MVP. Tout *(Comptes, Convives, Catalogue, Menus, Listes)* y est rattaché. Visible et éditable par tous les Comptes qui pointent dessus. Cohérence éventuelle suffit *(U10 — pas de live-sync attendue)*.
- **Compte** — Identifiant individuel authentifié *(probablement Firebase Auth, à confirmer en Architecture)*, donnant accès au Board partagé. **Cardinalité MVP : 2 Comptes** *(Aurélie, Lionel)*. Tous les Comptes ont **les mêmes droits** *(éditer Catalogue, valider Menu, basculer items, etc. — U22)*.
- **Setup foyer** — Flux de paramétrage initial du Board partagé, fait une seule fois : composition *(Convives)*, **pattern récurrent des soirs où Aurélie travaille** *(U3 — base du pré-remplissage des Slots gamelle)*. Modifiable à tout moment depuis n'importe quel Compte.
- **Convive** — Personne physique comptée dans la planification des Repas. **Cardinalité MVP : 3 Convives** *(Aurélie, Lionel, Rory)*. Rory compté comme un adulte en portion par simplification MVP *(brief)*. **Présence à un Repas : implicite par l'appartenance à un Slot au moins de ce Repas** — pas de flag d'absence dans le modèle *(U26)*.

### Catalogue de recettes

- **Catalogue** — Ensemble des Recettes du Board partagé. **1 Catalogue par Board partagé**, partagé entre tous les Comptes. **Composé exclusivement de Recettes choisies par le foyer** *(saisies ou importées par Aurélie ou Lionel)* — pas de recettes suggérées par l'app, pas de découverte algorithmique, pas de Recettes « bibliothèque pré-livrée ». Le foyer maîtrise intégralement son pool — *« pas de mauvaise surprise »* est un attribut implicite.
- **Recette** — Entité représentant une préparation culinaire. **Champs obligatoires : titre, ingrédients (avec quantités), nombre de Convives de référence** *(entier ≥ 1, défaut 4)* *(U20)*. **Champs optionnels** : étapes, photo, durée, catégorie, URL source *(quand importée — U23)*, notes libres. **Pas de typage « gamelle »** : toute Recette est éligible indifféremment à tout Slot *(U21 — révise D2bis brief)*. Le **nombre de Convives de référence** est la base du prorata appliqué par FR-15 *(« cette recette donne X parts ; sur un Slot avec Y Convives, les quantités sont multipliées par Y/X »)*.
- **Ingrédient** — Composant nommé d'une Recette, avec quantité et unité *(« 500g de tomates »)*. Sert de base à l'agrégation de la Liste principale.
- **Note libre (recette)** — Champ texte **unique** par Recette *(textarea, pas un journal multi-entrées horodaté)*. Éditable par tout Compte du Foyer *(U22)*. Usage type : *« j'ai mis moins de sucre »*, *« les enfants préfèrent avec du paprika »*.

### Planification — menus et repas

- **Fenêtre de planification** — Durée de la planification d'un Menu, **paramétrable de 7 à 14 jours, défaut 14** *(D3 brief)*. Choisie au moment de la génération du Menu.
- **Menu** — Ensemble des Repas planifiés sur une Fenêtre. Existe en deux états : **draft** *(menu pré-rempli en cours d'édition)* et **validé** *(figé par le geste « Valider le menu » — U6)*. **1 Menu actif validé par Board partagé** à un instant donné ; le suivant remplace le précédent à la prochaine validation. Le Menu validé est consultable à tout moment, y compris pour drill-down sur un Repas précis *(U11)*.
- **Repas** — Créneau du Menu défini par `(jour, créneau ∈ {midi, soir})`. Contient 1..N Slots *(modèle 1..N recettes par repas — D1 brief)*. **Cardinalité : 2 Repas par jour × N jours dans la Fenêtre = ~28 Repas pour Fenêtre par défaut.**
- **Slot** — Unité atomique d'un Repas, associant **une Recette du Catalogue (ou vide → Slot libre)** à un ensemble de **Convives** *(U25)*. **1..N Slots par Repas** *(typiquement 1 pour les repas familiaux, 2 quand Rory a un plat séparé, **3 les soirs-nuits** : Slot gamelle Aurélie + Slot Rory + Slot Lionel — U26)*.
- **Slot libre** — Slot sans Recette associée. Sémantique : *« on improvisera le jour J »*.
- **Slot gamelle** — Slot pré-rempli les soirs où Aurélie travaille *(d'après le pattern récurrent du Setup foyer — U3)*. **Par défaut Slot libre** *(U21/A)*. Aurélie peut y associer manuellement une Recette du Catalogue, ou laisser libre, ou supprimer le Slot en cas d'exception *(congés, échange de garde)*.
- **Gamelle** — Repas qu'Aurélie emporte au travail les soirs où elle travaille. **Concept fonctionnel**, sans typage technique sur les Recettes du Catalogue.

### Listes de courses

- **Liste principale** — Liste de courses **à acheter en ligne**, générée **automatiquement** par agrégation des Ingrédients de toutes les Recettes du Menu validé sur la Fenêtre. **Items agrégés par Ingrédient** *(1 ligne par Ingrédient distinct, quantités totales additionnées)* et **regroupés par catégorie** *(catégorisation exacte UX-décidée — U12)*. **Pas de cochage** des items mis au panier drive *(U1 — double usage)*. Reste affichée jusqu'au prochain Menu validé qui la remplace *(U4 — pas d'archivage explicite)*.
- **Liste secondaire** — Liste de courses **à acheter en magasin physique**, **alimentée par bascule depuis la Liste principale** *(U13 — items indisponibles sur le drive)*. Bascule **bidirectionnelle** *(U13)*. Format UX-décidé *(U15)*. **Persiste indéfiniment** tant qu'il reste des items non cochés *(U17)*, **consultable et cochable hors-ligne** *(U18)*. Items cochés en **soft-delete à 24h** *(U16)*. Vidage manuel explicite par tout Compte du Foyer *(U17)*. Partagée entre les 2 Comptes *(U5)*.

## 4. Features

*Chaque sous-section regroupe les FR d'une feature cohérente. Les FR sont **numérotés globalement** *(FR-1 à FR-N)* pour rester stables même si les Features sont réorganisées. Chaque FR cite les UJ qu'il réalise et les décisions UX *(U1-U26)* qu'il opérationnalise. Le vocabulaire utilisé est strictement celui du §3 Glossary.*

### 4.1 F1 — Setup & Comptes

**Description.** Tout le flux d'entrée dans l'app : se créer un Compte authentifié, rejoindre *(ou créer)* le Board partagé du foyer, paramétrer la composition du foyer *(Convives)* et le pattern récurrent des soirs où Aurélie travaille — base de tout pré-remplissage de Menu en aval. Réalise les entry states de **UJ-1, UJ-2, UJ-2b, UJ-3, UJ-4, UJ-5** *(tous les UJ démarrent en Compte authentifié sur le Board partagé)*.

**Functional Requirements.**

#### FR-1 : Création d'un Compte et authentification

Un utilisateur peut **créer un Compte authentifié** et **rester authentifié** sur son terminal entre 2 ouvertures de l'app. Réalise toutes les entry states UJ-*.

**Conséquences (testables) :**
- Un utilisateur sans Compte peut s'inscrire via une méthode d'authentification *(email/mot de passe, social login — choix d'implémentation tranché en Architecture)*.
- Une fois authentifié sur iPhone, le Compte reste actif **sans re-login** à chaque ouverture *(session persistante — UJ-1, UJ-2 « session iOS persistante »)*.
- L'utilisateur peut se déconnecter explicitement *(geste UX)*. Une déconnexion replace la prochaine ouverture sur l'écran d'authentification.

**Out of Scope :**
- Multi-Foyer / multi-Board pour un même Compte *(U24 — 1 seul Board au MVP)*.
- Récupération de mot de passe *(à confier à la méthode Auth choisie, hors-FR métier)*.
- Suppression de Compte *(hors-scope MVP)*.

#### FR-2 : Rattachement d'un Compte au Board partagé

Un Compte peut **rejoindre le Board partagé d'un foyer existant** *(2ᵉ Compte du foyer)*, ou **créer un nouveau Board partagé** *(1ᵉʳ Compte)*. Réalise les entry states UJ-* impliquant les 2 Comptes.

**Conséquences (testables) :**
- Le 1ᵉʳ Compte du foyer *(Lionel ou Aurélie)* crée le Board partagé lors de son inscription.
- Le 2ᵉ Compte rejoint le Board existant via un **mécanisme d'invitation par scan de QR code** *(Lionel — préférence séance ; l'écran du 1ᵉʳ Compte affiche un QR, le 2ᵉ Compte scanne avec l'iPhone et rejoint)*. Faisabilité ergonomique et fallback *(lien partagé si scan impossible)* à confirmer en UX.
- Une fois rattachés, **les 2 Comptes voient strictement la même donnée** *(Catalogue, Menus, Listes)* — cohérence éventuelle suffit *(U10)*.
- Tous les Comptes du Board ont **les mêmes droits** *(éditer Catalogue, valider Menu, basculer items — U22)*. Pas de notion d'admin/owner au MVP.
- **Cardinalité MVP : 2 Comptes par Board** *(pas de mécanique pour en ajouter un 3ᵉ : si ça arrive un jour, ce sera une exception qu'on traitera à ce moment-là)*.

#### FR-3 : Définition de la composition du foyer *(Convives)*

Un Compte peut **définir et modifier la liste des Convives** du foyer depuis le Setup foyer. Réalise les Slots de UJ-1, UJ-2, UJ-3.

**Conséquences (testables) :**
- Un Convive est défini au minimum par un **nom** *(ex. « Aurélie », « Lionel », « Rory »)*. Champs additionnels *(photo, âge, note)* optionnels et UX-décidés.
- La liste des Convives est éditable à tout moment depuis tout Compte du Board *(U22)* — ajouter, renommer, retirer un Convive.
- **Au MVP : 3 Convives instanciés** *(Aurélie, Lionel, Rory)* mais le modèle accepte 1..N.
- Retirer un Convive **n'affecte pas rétroactivement** les Slots historiques : le Menu validé en cours et l'historique des Menus passés conservent la trace de ce Convive. *(Décision séance — Lionel : « i ».)*

#### FR-4 : Définition du pattern récurrent des soirs-nuits d'Aurélie

Un Compte peut **définir et modifier un pattern récurrent** de soirs où un Convive du foyer travaille *(typiquement Aurélie)*, utilisé par la génération du Menu pour pré-remplir les Slots gamelle. Réalise UJ-1 beat 1.

**Conséquences (testables) :**
- Le pattern est défini par : **un Convive ciblé** *(typiquement Aurélie)* + **un ensemble de jours de la semaine** *(ex. mardi, mercredi, vendredi)*. **Créneau implicite : « soir »** *(Lionel — séance : Aurélie ne travaille que de nuit ; toute exception « service de jour » sera ajustée manuellement à la session menu, hors-pattern)*.
- Le pattern est éditable à tout moment depuis tout Compte *(U22)*.
- À la génération du Menu, **pour chaque jour de la Fenêtre correspondant au pattern**, le Repas du soir est pré-rempli avec un **Slot gamelle** pour le Convive ciblé *(par défaut Slot libre — U21)*, en plus des autres Slots du Repas.
- L'utilisateur peut **supprimer ponctuellement** un Slot gamelle pré-rempli au moment de la session menu *(U3 — exceptions : congés, échange de garde)*. La suppression ponctuelle n'altère pas le pattern récurrent.
- **Au MVP : un seul pattern récurrent par Board** *(celui d'Aurélie)*. Le modèle accepte 0..N patterns pour anticiper le cas où d'autres Convives auraient des cycles similaires.

**Feature-specific NFRs.**
- **Sécurité.** Le mécanisme d'invitation *(FR-2)* doit empêcher un tiers non-invité de rejoindre le Board partagé — code d'invitation à usage unique, expiration, ou équivalent.
- **Disponibilité.** Le Setup foyer *(FR-3, FR-4)* doit être accessible **avant** la 1ʳᵉ génération de Menu *(sinon Menu vide, pas d'usage possible)*.

**Notes.**
- **Soin disproportionné sur FR-2** : c'est le moment où Aurélie rejoint l'app pour la 1ʳᵉ fois — friction zéro indispensable, sinon adoption tuée d'entrée. → **OQ-2** *(UX)*.
- **Stack Auth conditionne FR-1 + FR-2** → **OQ-12** *(Architecture)*.

### 4.2 F2 — Catalogue de recettes

**Description.** Le cœur de l'amorçage de l'app : alimenter et entretenir le Catalogue. **Friction historique critique** — c'est sur cette feature que le proto précédent est mort *(saisie pénible, abandon)*. Toute conception UX/produit de F2 doit garder en mémoire **la phrase cardinale du brief** :

> *« Le moment où Aurélie ajoute une recette ne doit jamais être l'endroit où elle abandonne l'app. »*

Tous les FR de F2 sont lus sous le **principe transverse NFR-X1 « zéro saisie »**, étant entendu que FR-6 *(saisie manuelle)* est la **seule exception assumée** où la saisie clavier est inévitable et doit donc être **optimisée au maximum**. Réalise **UJ-5 (a, b, c)** intégralement.

**Functional Requirements.**

#### FR-5 : Import d'une Recette par lien *(schema.org/Recipe)*

Un Compte peut **importer une Recette en collant l'URL** d'un site qui expose les données structurées `schema.org/Recipe`. Réalise UJ-5a.

**Conséquences (testables) :**
- L'utilisateur fournit une URL ; l'app **tente l'extraction via `schema.org/Recipe`** *(U19)*.
- **Cas succès** : un **formulaire pré-rempli** est affiché à l'utilisateur *(titre, ingrédients/quantités, **nombre de Convives de référence** mappé depuis `recipeYield` du schema.org — défaut 4 si absent, étapes, photo, URL source)*. L'utilisateur peut **ajuster** chaque champ avant sauvegarde.
- **Cas échec** *(site non supporté, JSON-LD absent ou cassé)* : **message d'erreur clair** *(« ce site n'est pas supporté pour l'instant »)* + **bouton « saisie manuelle »** qui mène au formulaire vide de FR-6 *(U19)*.
- L'**URL source est stockée** sur la Recette créée *(U23)*, pour rétro-référence ultérieure *(retour au blog, lecture des commentaires)*.

**Out of Scope (MVP).**
- Scraping HTML *« best-effort »* au-delà de schema.org *(reporté en hors-MVP — brief « élargir les sources d'import »)*.
- Import depuis Instagram natif *(post / Reel)* — reporté en v2+ *(brief D5)*.
- Import par photo / OCR d'un livre — reporté en v2+ *(brief)*.

#### FR-6 : Saisie manuelle d'une Recette

Un Compte peut **saisir une Recette à la main** dans un formulaire vide, soit comme **entrée volontaire** *(pas d'URL disponible — recette de famille)*, soit comme **fallback** d'un import qui a échoué. Réalise UJ-5b et le fallback de UJ-5a.

**Conséquences (testables) :**
- **Champs obligatoires : titre, ingrédients (avec quantités), nombre de Convives de référence** *(entier ≥ 1, défaut 4)* *(U20 + cf. §3 Glossary Recette)*. La sauvegarde est bloquée si un de ces champs est vide.
- **Champs optionnels** : étapes, photo, durée, catégorie, URL source, notes. Une Recette peut être créée en complétant **uniquement** les champs obligatoires.
- La saisie d'un ingrédient se fait via un mécanisme à **friction minimale** *(autocomplete sur les Ingrédients déjà connus du Catalogue, suggestions d'unités, copier-coller d'un bloc texte en option — mécanique précise UX-décidée)*.

**Feature-specific NFRs.**
- **Friction de saisie minimale.** Ce FR est l'unique exception à NFR-X1 ; sa conception ergonomique conditionne directement la survie de l'app *(leçon proto précédent)*. À optimiser au maximum par l'UX *(autocomplete, presse-papier intelligent, etc.)*.

#### FR-7 : Édition d'une Recette existante

**N'importe quel Compte du Board** peut **modifier n'importe quelle Recette** du Catalogue. Réalise UJ-5c.

**Conséquences (testables) :**
- Tous les champs *(obligatoires comme optionnels)* sont éditables après création.
- **Pas de notion de « propriétaire »** d'une Recette : tout Compte du Board a les mêmes droits d'édition *(U22 — cohérent avec U10 et FR-2)*.
- **Pas d'historique des modifications** conservé au MVP *(U22 — hors-scope MVP)*. La version courante est la référence ; l'écraser perd l'ancienne définitivement.

#### FR-8 : Notes libres sur une Recette

Un Compte peut **saisir et modifier une note libre** rattachée à une Recette. Réalise UJ-5c.

**Conséquences (testables) :**
- La note est un **champ texte unique** *(textarea simple)* sur la Recette *(U22)*. Pas de structure imposée, pas de multi-entrées horodatées.
- Éditable par tout Compte du Board *(U22)*, comme tout autre champ de la Recette *(FR-7)*.
- La note est **visible** en consultation de Recette *(dans UJ-1, UJ-2)*, pour que le contexte *(« moins de sucre la prochaine fois »)* serve la prochaine cuisson.

#### FR-9 : Suppression d'une Recette du Catalogue

Un Compte peut **supprimer une Recette** du Catalogue. *(Décision séance — Lionel : « i » : suppression au MVP avec préservation de l'historique.)*

**Conséquences (testables) :**
- Confirmation explicite demandée avant suppression *(éviter le tap accidentel)*.
- La suppression **n'altère pas rétroactivement** les Slots historiques *(le Menu validé en cours et l'historique des Menus passés conservent une référence — gel de nom + ingrédients au moment de l'utilisation, ou bien tombstone, choix d'implémentation tranché en Architecture)*. Cohérent avec FR-3 *(suppression Convive)*.
- Une Recette **utilisée dans le Menu validé en cours** peut être supprimée du Catalogue ; le Slot du Menu courant conserve sa référence figée.

#### FR-10 : Consultation du Catalogue

Un Compte peut **parcourir la liste des Recettes** du Catalogue, pour : trouver une Recette à éditer *(FR-7)*, à supprimer *(FR-9)*, ou à associer manuellement à un Slot du Menu *(FR à venir en F3 — régénération 2 temps)*. Réalise tous les UJ qui impliquent un accès aux Recettes.

**Conséquences (testables) :**
- Vue listante des Recettes du Catalogue *(ordre par défaut : UX-décidé — alphabétique, chronologique inverse, par catégorie…)*.
- Au MVP : **pas de recherche textuelle obligatoire**, pas de filtres complexes. Si le Catalogue dépasse ~30-50 Recettes et que la navigation devient pénible, une recherche simple pourra être ajoutée *(post-MVP)*.
- Sélection d'une Recette → vue de détail *(titre, ingrédients, étapes, photo, notes, URL source)*.

**Notes.**
- **FR-6 (saisie manuelle) = point de friction historique le plus important de l'app.** Conception à soigner disproportionnément. → **OQ-4** *(UX)*.
- **Parsing `schema.org/Recipe` (FR-5)** — choix client vs serverless. → **OQ-11** *(Architecture)*.

### 4.3 F3 — Génération & édition du Menu

**Description.** Cœur de la valeur perçue d'Aurélie le samedi matin : ouvrir l'app, voir un Menu **déjà pré-rempli** pour les 10-14 prochains jours, l'**ajuster** en quelques minutes — régénérer un Slot qui déplaît, en remplacer un manuellement, en ajouter ou en supprimer un *(slot enfant, gamelle d'exception)*, ajuster les Convives — puis **Valider le Menu** d'un geste actif unique, qui clôt la session et déclenche la génération de la Liste principale *(F5)*. Réalise **UJ-1** intégralement et conditionne **UJ-2, UJ-2b, UJ-3, UJ-4** *(rien à consulter, à commander, ni à acheter sans Menu validé)*.

**Functional Requirements.**

#### FR-11 : Génération initiale du Menu draft

Un Compte peut **générer un nouveau Menu draft** sur une Fenêtre paramétrable, avec pré-remplissage automatique des Slots à partir du Catalogue et du pattern récurrent *(FR-4)*. Réalise UJ-1 beat 1.

**Conséquences (testables) :**
- L'utilisateur **choisit la durée de la Fenêtre** au moment de la génération : entier entre **7 et 14 jours, défaut 14** *(D3 brief)*.
- L'app crée un Menu **draft** *(état Glossary)* sur la Fenêtre. Pour chaque jour : 2 Repas *(midi, soir)*.
- **Chaque Repas est pré-rempli** :
    - **Jour soir correspondant au pattern récurrent** *(FR-4)* : **3 Slots** — un **Slot gamelle** *(par défaut Slot libre — U21)* pour le Convive cible, **+** un Slot familial *(avec Recette piochée auto — voir ci-dessous)* pour les Convives restants ; et si le Repas réunit en réalité 2 sous-groupes incompatibles *(comme « plat enfant Rory + plat parent Lionel »)*, l'ajout d'un Slot supplémentaire passe par FR-14, manuel.
    - **Tous les autres Repas** : **1 Slot familial** *(tous les Convives présents, avec une Recette piochée auto)*.
- **Pioche automatique d'une Recette** *(quand le Slot n'est pas libre)* : tirage aléatoire dans le Catalogue, **avec contrainte de non-répétition sur la Fenêtre** *(une même Recette n'apparaît pas 2 fois dans une même Fenêtre tant que le Catalogue le permet)*. **Pas d'anti-récence inter-Fenêtre au MVP** *(décision séance — Lionel : « i » ; cohérent avec « pioche/règles basiques au départ, pas d'IA intelligente » du brief, et un Catalogue petit au début)*. À reconsidérer si l'usage révèle un besoin *(« on nous propose toujours les mêmes 10 recettes »)*.
- **La pioche auto ne s'applique jamais aux Slots gamelle** — ils restent libres par défaut *(U21)*. L'utilisateur peut y associer manuellement une Recette *(FR-13)*.
- **Si le Catalogue est insuffisant** pour remplir toute la Fenêtre sans répétition *(< 14 Recettes au démarrage)*, la pioche **autorise les répétitions** intra-Fenêtre, avec une indication visuelle UX-décidée *(« vous avez 8 recettes, certaines sont répétées »)*.
- **Pas de Menu draft persistant entre 2 générations** : si un Compte génère un nouveau Menu draft alors qu'un autre Menu draft est en cours d'édition, le précédent est **écrasé** *(pas de notion de plusieurs Menus draft en parallèle au MVP)*.

#### FR-12 : Régénération automatique d'un Slot *(1ᵉʳ temps)*

Un Compte peut, sur un Slot du Menu draft, **demander une régénération automatique** : un tap → l'app pioche une autre Recette du Catalogue à la place. Réalise UJ-1 beat 2 (1ᵉʳ temps de U2).

**Conséquences (testables) :**
- Geste accessible directement sur le Slot dans la vue du Menu draft *(geste précis — tap sur icône, swipe — UX-décidé)*.
- L'app pioche une nouvelle Recette dans le Catalogue selon **la même règle de non-répétition intra-Fenêtre** que FR-11.
- La régénération **peut être réitérée** *(si la 2ᵉ ne convient pas, l'utilisateur peut piocher une 3ᵉ, etc.)* — mais le **flux UX naturel** *(U2)* invite à passer au **choix manuel** *(FR-13)* après 1 ou 2 tentatives ratées.
- La régénération **ne s'applique pas aux Slots gamelle** *(qui n'ont pas de pioche auto — U21)*.

#### FR-13 : Choix manuel d'une Recette pour un Slot *(2ᵉ temps + cas slot gamelle)*

Un Compte peut, sur n'importe quel Slot du Menu draft *(régulier OU gamelle)*, **choisir manuellement** une Recette du Catalogue à associer. Réalise UJ-1 beat 2 (2ᵉ temps de U2) et UJ-1 beat 3.

**Conséquences (testables) :**
- Un geste depuis le Slot ouvre une **vue de sélection** *(la vue listante de FR-10, ouverte en contexte « choisir pour ce Slot »)*.
- L'utilisateur **sélectionne une Recette** → elle est associée au Slot et remplace l'éventuelle Recette précédente.
- L'utilisateur peut **annuler** la sélection sans modifier le Slot *(retour à l'écran Menu draft sans changement)*.
- Une Recette utilisée dans un autre Slot de la même Fenêtre **reste sélectionnable** *(l'utilisateur peut volontairement créer une répétition, ex. « pâtes de Rory mardi et mercredi »)*, avec éventuelle indication UX-décidée.

#### FR-14 : Ajout, suppression, slot libre d'un Slot d'un Repas

Un Compte peut **ajouter, supprimer, ou rendre libre** un Slot d'un Repas du Menu draft. Réalise UJ-1 beat 3 *(ajustement Slot gamelle d'exception)*, et le cas réel du brief *« 3 plats sur un même créneau »*.

**Conséquences (testables) :**
- **Ajouter un Slot** : un Repas existant peut recevoir un Slot supplémentaire *(typiquement : ajouter un Slot « plat Rory » à un Repas familial)*. Le nouveau Slot est créé **Slot libre par défaut** ; l'utilisateur peut y associer une Recette via FR-13 *(ou laisser libre)*.
- **Supprimer un Slot** : un Slot pré-rempli peut être supprimé *(typiquement : supprimer un Slot gamelle pour un jour de congé d'Aurélie — U3 exception)*. La suppression d'un Slot n'altère pas les autres Slots du même Repas.
- **Rendre libre un Slot** *(retirer la Recette sans supprimer le Slot)* : l'utilisateur peut détacher la Recette d'un Slot et le laisser en état Slot libre *(improvisation J)*.
- Les ajouts/suppressions de Slot sont **locaux au Menu draft en cours** — ils n'altèrent pas le pattern récurrent *(FR-4)* ni les Menus historiques.

#### FR-15 : Ajustement des Convives d'un Slot et recalcul des quantités

Un Compte peut **modifier la liste des Convives** associés à un Slot du Menu draft. Les **quantités d'ingrédients** affichées et agrégées dans la Liste principale sont **recalculées automatiquement** au prorata des Convives. Réalise le besoin du brief *(« Recalcul automatique des quantités »)*.

**Conséquences (testables) :**
- Sur un Slot ouvert : l'utilisateur peut **ajouter ou retirer** un Convive de la liste associée au Slot *(sélection multiple parmi les Convives définis en FR-3)*.
- Les **quantités effectives** d'ingrédients du Slot *(utilisées pour la Liste principale en F5)* sont **proportionnelles** au nombre de Convives sur le Slot, calculées par la **formule explicite** : `quantité_effective = quantité_référence × (nombre_convives_slot / nombre_convives_référence_recette)`, où `nombre_convives_référence_recette` est le champ obligatoire de la Recette *(§3 Glossary, FR-6)*.
- **Recalcul immédiat** à toute modification de la liste de Convives.
- **Cas particulier Slot libre** : pas de quantités à recalculer *(pas de Recette)* ; les Convives associés au Slot libre sont conservés pour information *(« ce Slot libre est pour Aurélie »)* mais n'impactent pas la Liste principale.

#### FR-16 : Validation du Menu

Un Compte peut **valider le Menu draft** en cours par un **geste actif unique** *(« Valider le menu »)*. Le Menu passe en état **validé**, devient **persistant et consultable** *(F4)*, et **déclenche la génération de la Liste principale** *(F5)*. Réalise UJ-1 beat 4 et U6.

**Conséquences (testables) :**
- Geste accessible depuis la vue Menu draft *(bouton unique, visible — geste UX précis)*.
- À la validation : le Menu draft devient Menu **validé** *(état Glossary)*. **Le Menu validé précédent est remplacé** *(1 seul Menu validé actif à la fois — Glossary)*.
- À la validation : **la Liste principale est générée automatiquement** par agrégation des Ingrédients de toutes les Recettes des Slots du Menu validé *(détail en F5)*. **La Liste secondaire en cours n'est pas affectée** *(persiste indépendamment — U17, F6)*.
- Le Menu validé est **immuable** jusqu'à la prochaine validation : pas d'édition possible sur un Menu validé *(U9 — pas de modification du menu validé en plein flux de cuisine)*. Pour le modifier, il faut **régénérer un Menu draft** *(FR-11)* qui écrasera le validé à la prochaine validation.

**Feature-specific NFRs.**
- **Temps cible session menu < 5 minutes.** L'enchaînement FR-11 → FR-12/FR-13/FR-14/FR-15 → FR-16 doit pouvoir s'exécuter en **moins de 5 minutes** pour une Fenêtre typique *(14 jours, ~5 ajustements moyens)* — critère cardinal de succès du brief *(3 mois)*. À garder en tête en UX *(densité d'information, accessibilité des actions, etc.)*.
- **Pas d'attente perceptible** sur les opérations courantes *(régénération d'un Slot, ajustement Convive)* : < 200ms côté client. La génération initiale *(FR-11)* peut accepter une latence un peu plus longue *(< 1s)* mais doit rester perçue comme instantanée.

**Notes.**
- **Vue Menu draft = écran principal** où se joue le « 45 min → 5 min ». Conception très exigeante. → **OQ-8** *(UX)*.
- **Concurrence sur Menu draft** *(deux Comptes éditant en simultané — rare au MVP)* → **OQ-14** *(Architecture, cohérent avec NFR-X3)*.

### 4.4 F4 — Consultation du Menu validé

**Description.** Tout l'usage hors-session-menu et hors-courses : ouvrir l'app pour **savoir ce qu'on cuisine maintenant**, pour **vérifier ce qu'on a planifié plus tard dans la semaine** *(préparer la gamelle d'Aurélie, anticiper le mardi soir)*, ou pour **revoir un Menu passé** *(quand a-t-on fait les pâtes carbonara ?)*. Réalise **UJ-2** *(Lionel soir-nuit)* et **UJ-2b** *(Aurélie consulte plus tôt pour la gamelle)*. Sert aussi de point d'entrée à la phase cuisson dans UJ-2.

**Principe transverse à F4 — source unique en cuisson.** *L'app est l'unique source à consulter en cuisine* — pas d'aller-retour vers le site source de la Recette, pas de Post-it papier, pas de capture d'écran annotée. La Recette telle qu'elle existe dans le Catalogue *(éventuellement enrichie de notes via FR-8)* est **la version de référence du foyer**, et la cuisson se fait à partir d'elle uniquement.

**Functional Requirements.**

#### FR-17 : Consultation du Menu validé courant

Tout Compte peut **consulter le Menu validé courant** — vue d'ensemble de la Fenêtre, **drill-down sur un Repas ou un Slot précis** *(jour + créneau)* pour accéder au détail. Réalise UJ-2 beat 1, UJ-2b *(et U11)*.

**Conséquences (testables) :**
- **Vue d'ensemble** : tous les Repas de la Fenêtre validée sont visibles *(structure UX-décidée : grille calendrier, liste verticale, autre)*.
- **Drill-down sur un Repas** : tap sur un Repas affiche les Slots de ce Repas *(Recette ou libre, Convives associés, quantités effectives)*.
- **Drill-down sur un Slot** : tap sur un Slot affiche la Recette complète *(titre, ingrédients aux quantités effectives — recalculées au prorata des Convives FR-15, étapes, photo, durée, notes libres, URL source)*. Mode lecture seule.
- **Mode consultation = lecture seule.** Aucun geste d'édition n'est accessible depuis cette vue *(le Menu validé est immuable jusqu'à la prochaine validation — FR-16, U9)*.

#### FR-18 : Vue rapide du repas du moment *(« ce soir »)*

Tout Compte peut, **en moins de 5 secondes après ouverture de l'app**, **identifier ce qui est à cuisiner ou à préparer pour le créneau courant** *(midi ou soir d'aujourd'hui)*. Réalise UJ-2 beat 1 et son contrainte clé.

**Conséquences (testables) :**
- L'app **propose un chemin direct** vers le Slot du Repas courant *(jour = aujourd'hui, créneau = midi avant ~14h, soir après ~17h — seuils UX-décidés)*. Mécanique précise UX-décidée *(landing page « ce qui se passe maintenant », tab « aujourd'hui » mis en évidence, autre — NOTE-PM-1)*.
- Le chemin reste utilisable **même quand plusieurs Slots existent dans le Repas courant** *(soirs-nuits : Slot gamelle Aurélie + Slot Rory + Slot Lionel)* — chaque Convive doit pouvoir naviguer vers son Slot pertinent.
- L'**affichage tient à un coup d'œil** sur smartphone portrait, sans scroll requis pour l'identifier *(titre + Convives + état Recette/libre)*.

#### FR-19 : Consultation de l'historique des Menus passés

Tout Compte peut **consulter les Menus validés antérieurs** sur un horizon récent. Réalise le besoin du brief *(MVP point 8 : « Historique des menus passés, lecture seule, ~2-3 semaines »)*.

**Conséquences (testables) :**
- **Profondeur d'historique au MVP** : **pas de limite** *(Lionel — séance : « iii »)*. Tous les Menus validés sont conservés. Coût stockage négligeable pour un foyer ; si ça devient un sujet plus tard, on fixera une politique de purge à ce moment-là.
- **Lecture seule** : pas d'édition, pas de régénération de Liste principale, pas d'impact sur le Menu validé courant.
- Usage type : *« quand est-ce qu'on a fait les bo bun ? »*, *« la semaine dernière on avait planifié quoi le mardi ? »* — la réponse est trouvable en quelques taps.

**Feature-specific NFRs.**
- **Réactivité de la vue rapide *(FR-18)*.** Le chemin « ouverture de l'app → identification du Slot courant » doit tenir en **moins de 5 secondes**, total tap-count inclus. Garde-fou cardinal *(NOTE-PM-1)* — l'app meurt si Lionel galère pour trouver ce qu'il cuisine.

**Notes.**
- *[NOTE FOR PM (UX)]* Trois capacités de consultation *(FR-17 vue d'ensemble, FR-18 vue rapide, FR-19 historique)* coexistent — Sally devra arbitrer si elles s'intègrent dans **une même surface** *(tabs, dashboard unifié)* ou **plusieurs**. Critère : FR-18 doit dominer le chemin d'entrée *(c'est le besoin majoritaire en fréquence)*.

### 4.5 F5 — Liste de courses principale

**Description.** L'écran qu'Aurélie consulte **en parallèle de l'app du drive**, ~2 heures après la session menu : la liste des ingrédients à acheter en ligne, **déjà consolidée**, **déjà groupée**, sans aucune charge mentale de reconstitution. Réalise **UJ-3** intégralement.

**Functional Requirements.**

#### FR-20 : Agrégation automatique et présentation de la Liste principale

Au geste **Valider le Menu** *(FR-16)*, l'app **agrège automatiquement** les Ingrédients de toutes les Recettes des Slots du Menu validé et les **présente** sous forme de Liste principale **groupée par catégorie**. Réalise UJ-3 beat 1 et le climax de UJ-1.

**Conséquences (testables) :**
- **Agrégation par Ingrédient** : si plusieurs Recettes utilisent un même Ingrédient *(« tomates »)*, la Liste affiche **1 ligne unique** avec la **quantité totale additionnée** sur la Fenêtre *(U12)*.
- **Quantités** : les quantités sont celles **après recalcul prorata Convives** *(FR-15)* — pas les quantités de référence brutes des Recettes.
- **Regroupement par catégorie**. **La mécanique de catégorisation est entièrement déléguée à la phase UX/Architecture** *(Lionel — séance : « iv »)* : taxonomie des catégories, méthode d'assignation d'un Ingrédient à une catégorie *(saisie volontaire, dictionnaire interne, classification auto, à la demande de l'utilisateur, etc.)*. Le PRD exige uniquement la **capacité fonctionnelle** : la Liste doit présenter les items **regroupés par catégorie cohérente avec les rayons d'un drive type** *(U12)*.
- **Fallback catégorisation : catégorie « Autre » garantie.** **Tout Ingrédient non assignable** *(non-reconnu par la mécanique UX/Architecture choisie)* **tombe dans une catégorie « Autre » affichée en fin de Liste**. L'utilisateur n'est jamais bloqué par un Ingrédient inconnu — l'item apparaît dans « Autre » et peut éventuellement être recatégorisé manuellement *(mécanique d'apprentissage UX-décidée)*.
- **Slots libres** : un Slot libre **n'apporte rien** à la Liste principale *(pas de Recette = pas d'Ingrédients)*. L'utilisateur sait qu'il improvisera et achètera à la marge si besoin.
- **Pas de cochage** des items dans la Liste principale *(U1 — pas de double usage avec le panier drive)*. Le seul geste actif sur un item est la **bascule vers la Liste secondaire** *(FR-21)*.
- La Liste principale **reste affichée** entre les utilisations, **jusqu'au prochain FR-16** qui la remplace *(U4 — pas d'archivage explicite)*.

#### FR-21 : Bascule bidirectionnelle d'un item entre Liste principale et Liste secondaire

Tout Compte peut **basculer un item** de la Liste principale **vers la Liste secondaire** *(item indisponible sur le drive)*, et **inversement**, depuis la Liste secondaire **vers la Liste principale** *(annulation d'une bascule erronée)*. Réalise UJ-3 beats 3-4 et **U13**.

**Conséquences (testables) :**
- **Geste accessible sur chaque item** des deux listes *(swipe, long-press, toggle — UX-décidé — U13)*.
- **Bascule principale → secondaire** : l'item **quitte visuellement** la Liste principale et **apparaît** sur la Liste secondaire avec ses **quantité + unité conservées**.
- **Bascule secondaire → principale** : l'item revient sur la Liste principale **dans sa catégorie d'origine**. Si l'item secondaire avait été **coché** *(état soft-delete en cours — FR-23)*, ce statut est **réinitialisé** au retour vers la principale.
- **Confirmation non-requise** *(les bascules sont annulables par la bascule réciproque — pas de risque destructeur)*.

**Feature-specific NFRs.**
- **Visibilité du flux principal/secondaire.** Depuis la Liste principale, l'utilisateur doit pouvoir **voir d'un coup d'œil** qu'il existe X items sur la Liste secondaire *(éviter le sentiment de perte d'information lorsque des items disparaissent par bascule — NOTE FOR PM UJ-3)*.

**Notes.**
- *[NOTE FOR PM (UX)]* La Liste principale est consultée **en parallèle de l'app drive** — l'écran iOS est partagé entre 2 apps *(split, va-et-vient)*. L'ergonomie doit assumer cette contrainte : items lisibles à hauteur de pouce, gestes fonctionnels en split-view si possible, transitions courtes pour limiter le coût cognitif du va-et-vient.
- *[NOTE FOR PM (UX) — règle empirique du foyer]* Aurélie a empiriquement appris à **éviter de commander le dimanche** *(rupture de stock fréquente sur le drive)*. Si l'UX propose un jour des nudges temporels *(rappels « il est temps de planifier », suggestions de moments)*, tenir compte de cette préférence — pas de prompt de commande le dimanche.

### 4.6 F6 — Liste de courses secondaire

**Description.** La **seule vraie innovation produit du MVP** *(rien d'équivalent chez Jow ou autres apps grand public)* : la liste de ce qui reste à acheter **en magasin physique**, accessible **hors-ligne**, partagée entre les 2 Comptes, persistante sur plusieurs visites. Adresse directement la *3ᵉ charge mentale du brief* — *« se souvenir de quoi acheter en semaine »*. Réalise **UJ-4** intégralement.

**Functional Requirements.**

#### FR-22 : Consultation de la Liste secondaire *(avec mode hors-ligne)*

Tout Compte peut **consulter la Liste secondaire** depuis n'importe quel écran de l'app, **y compris hors-ligne** *(au sous-sol Monoprix, dans le parking, en magasin sans couverture)*. Réalise UJ-4 beat 1 et **U18**.

**Conséquences (testables) :**
- Vue dédiée à la Liste secondaire, accessible depuis la navigation principale *(emplacement UX-décidé)*.
- Items présentés avec **nom, quantité, unité, état (coché ou pas, FR-23)**. **Format de présentation UX-décidé** *(U15)* — pas de contrainte imposée par le PRD au-delà du « lisible et cochable d'une main en magasin ».
- **Mode hors-ligne** : la Liste secondaire doit être **consultable et cochable** sans connexion réseau au moment de l'accès. Les données ont été préalablement chargées *(stack technique tranchée par Architecture — PWA + Service Worker + IndexedDB ou équivalent ; U18 réactive D6 du brief)*.
- La Liste secondaire **persiste indéfiniment** tant que des items non-cochés existent et qu'aucun vidage manuel *(FR-24)* n'a été effectué *(U17)*.
- **Partage entre Comptes** *(U5)* : un item ajouté ou coché depuis un Compte est visible depuis l'autre Compte *(après synchronisation au retour réseau si l'opération avait eu lieu hors-ligne — U10/U18)*.

#### FR-23 : Cochage d'un item de la Liste secondaire avec soft-delete à 24h

Tout Compte peut **cocher un item** de la Liste secondaire *(quand il l'a attrapé en magasin)*. L'item passe en **état coché** puis **disparaît automatiquement 24 heures plus tard**. Le cochage est **réversible** dans cette fenêtre de 24h. Réalise UJ-4 beats 2, 4 et son edge case, opérationnalise **U16**.

**Conséquences (testables) :**
- Geste de cochage accessible directement sur chaque item *(geste UX-décidé)*.
- État **coché visible** dans l'UI *(distinct de l'état non-coché)* pendant **24h après le geste**.
- Au-delà de 24h, l'item est **purgé** automatiquement de la Liste secondaire *(soft-delete consommé)*.
- **Décochage** : pendant les 24h, l'utilisateur peut **décocher un item** *(retour à l'état non-coché ; le compteur des 24h s'annule)*.
- **Fonctionne hors-ligne** : les coches/décoches faites hors-ligne sont persistées localement et **synchronisées au retour réseau** *(U18)*. La fenêtre de 24h court à partir du **timestamp du geste local**, pas du moment de sync.
- **Multi-Compte** : si Aurélie coche un item à 14h et que Lionel ne se synchronise qu'à 18h, Lionel voit l'item coché depuis 4h à l'ouverture *(U10 — cohérence éventuelle suffit)*.

#### FR-24 : Vidage manuel de la Liste secondaire

Tout Compte peut, depuis la vue Liste secondaire, **vider explicitement** la liste — purge en bloc de tous les items, qu'ils soient cochés ou non. Opérationnalise **U17** *(« elle se vide quand on décide de la vider »)*.

**Conséquences (testables) :**
- Geste accessible depuis la vue Liste secondaire *(emplacement UX-décidé : menu, bouton, geste long-press, etc.)*.
- **Confirmation explicite demandée** *(action destructive irréversible)* : modal *(« vider la Liste secondaire ? Cette action ne peut pas être annulée. »)* avec validation requise.
- Après confirmation : **tous les items** *(cochés et non-cochés)* sont purgés. La Liste secondaire revient à un état vide.
- **Pas de purge automatique** par ailleurs *(U17)* — ni à la fin d'une session magasin, ni à la prochaine validation de Menu *(qui ne touche que la Liste principale — FR-16)*.

**Feature-specific NFRs.**
- **Disponibilité hors-ligne.** La Liste secondaire **doit** être consultable et cochable sans réseau — c'est l'**exigence métier la plus contraignante** du MVP côté tech *(impose probablement une stack PWA installable, à trancher par Winston)*. L'absence de cette capacité dégraderait fortement la valeur perçue de UJ-4 *(« j'ai sorti l'app au sous-sol, ça tourne dans le vide »)*.
- **Robustesse de synchronisation.** Les coches faites hors-ligne ne doivent **jamais être perdues** au retour réseau — y compris si Aurélie reprend l'app le lendemain, ou si un conflit apparaît avec une coche faite par Lionel pendant ce temps. Stratégie de résolution de conflit à confier à Winston *(typique CRDT simple, last-write-wins, etc.)*.

**Notes.**
- **Conjonction FR-22 + FR-23 + FR-2 = stratégie de sync non-triviale.** → **OQ-10** *(Architecture — Firestore offline persistence vs CRDT)*.
- *[NOTE FOR PM (UX)]* Le ratio temps de cochage / temps total en magasin doit rester minime : si l'app demande plus de 1 seconde pour acter un coche, Aurélie l'abandonnera. À confier à Sally.

### 4.7 NFRs transverses *(cross-cutting)*

*Exigences non-fonctionnelles qui s'appliquent à l'**ensemble** de l'app, par opposition aux NFRs feature-specific listés sous chaque feature. Référencées dans les FR ci-dessus.*

#### NFR-X1 : Zéro saisie = scénario réussi

Tout flux quotidien d'usage *(consulter le Menu, ajuster, valider, cuisiner, commander, faire les courses physiques)* doit pouvoir s'exécuter **sans saisie clavier**. La saisie clavier reste cantonnée aux moments d'**enrichissement du Catalogue** *(FR-6 — saisie manuelle d'une Recette, où la friction est inévitable)*. **Garde-fou cardinal** — *le proto précédent est mort de la violation de ce principe*.

**Application.** Chaque FR de F1, F3, F4, F5, F6 doit être réalisable sans clavier *(taps, swipes, listes, sélecteurs, boutons — pas de champs de saisie sur le chemin courant)*. Toute proposition UX qui requiert une saisie clavier dans ces flux est un signal à remettre en question.

#### NFR-X2 : Performance perçue — instantanéité des actions courantes

Les opérations courantes *(consultation, navigation, régénération d'un Slot, cochage d'un item, bascule, validation du Menu)* doivent **paraître instantanées** à l'utilisateur : **< 200ms** côté client pour le rendu visuel du résultat de l'action. Les opérations plus lourdes *(génération initiale du Menu — FR-11, agrégation de la Liste principale — FR-20)* peuvent monter à **< 1s** mais doivent rester perçues comme rapides.

**Garde-fou complémentaire — vue rapide « ce soir » (FR-18).** Le chemin total *« ouverture de l'app → identification du Slot du repas courant »* doit tenir en **< 5 secondes** dans le pire cas, taps inclus *(NOTE-PM-1, brief)*.

#### NFR-X3 : Cohérence éventuelle entre Comptes — pas de live-sync attendue

Les 2 Comptes du Board partagé travaillent sur la **même donnée logique**, mais le PRD n'exige **pas de synchronisation en temps réel** *(U10)*. Une modification faite par un Compte devient visible sur l'autre Compte à sa **prochaine ouverture** *(ou à son prochain rafraîchissement après reconnexion)*. **Cohérence éventuelle suffit.**

**Implication Architecture.** Les choix techniques peuvent rester simples *(Firestore offline persistence natif, last-write-wins, ou équivalent)* — pas de besoin de CRDT custom ou de mécanique de présence en temps réel. Exception possible si **F6** *(Liste secondaire hors-ligne)* impose une stratégie de résolution de conflit plus rigoureuse — à trancher par Winston *(notes F6)*.

#### NFR-X4 : Souveraineté des données du foyer

Les données du Board partagé *(Catalogue, Menus, Listes, Convives, pattern récurrent)* sont **propres au foyer** et **ne sont partagées avec aucune tierce partie** au-delà du strict nécessaire à l'opération de l'app *(hébergeur cloud choisi par Architecture, fournisseur Auth, fournisseur de parsing schema.org si serverside)*.

**Implications.**

- Pas de partage analytique vers tiers, pas de tracking utilisateur tiers.
- Pas d'export automatique vers une plateforme externe.
- Le foyer doit pouvoir, en cas d'abandon de l'app, **récupérer son Catalogue** sous une forme lisible. **Souveraineté de fait** : la stack *(Firestore, accessible en console pour un dev)* garantit cette récupération sans capacité applicative dédiée au MVP *(voir §6.2 — formalisation FR différée hors-MVP, séance finalize)*.

#### NFR-X5 : Soutenabilité — 1 développeur sur la durée

L'app est conçue, codée et maintenue par **un seul développeur** *(Lionel)*, sur son temps personnel, en parallèle de son apprentissage de la méthode BMAD. Tout choix de stack, de dépendance, ou de pattern doit assumer cette contrainte.

**Implications.**

- Préférer les solutions **éprouvées** et **bien documentées** *(Firebase pressenti — confirmé par le brief)* aux pointes de complexité.
- Éviter les dépendances qui exigeraient une mise à niveau fréquente ou une expertise rare.
- Refuser les abstractions prématurées : *« trois lignes similaires valent mieux qu'une abstraction qui anticipe un besoin hypothétique »*.
- Tolérer l'imperfection si elle réduit le coût de maintenance — une feature *« qui marche bien sans être polie »* est préférable à une feature *« polie mais fragile »*.

## 5. Non-Goals (Explicit)

*Ce que Meal Planner n'est pas, et ne deviendra pas en v1. Énoncés ici comme **frontières larges** ; les exclusions tactiques par FR sont en §6.2.*

- **Pas un produit grand public.** Aucun objectif d'audience, de croissance, d'analytics, de cible marché. Un seul foyer cible, sans ambiguïté *(§2)*. L'app ne se veut pas concurrente de Jow, Marmiton, Whisk ou autres applications de planification grand public — elle accepte d'être moins polie, moins jolie, moins astucieuse, en échange d'une **précision de cible** que ces apps ne peuvent pas atteindre.
- **Pas un produit business.** Pas de monétisation, pas d'utilisateur payant, pas de stack business. Tout arbitrage produit est tranché sur la valeur d'usage pour le foyer, pas sur une valeur économique.
- **Pas un produit multi-foyer.** Un seul Board partagé instancié *(U24)*. *(Détails §6.2.)*
- **Pas un assistant nutritionnel ni un produit santé.** Catalogue neutre, pas de tags diététiques, pas d'équilibre des macros, pas de profil santé. *(Couche nutrition v2+ §6.2.)*
- **Pas un anti-gaspi ni un inventaire du frigo.** Définitivement écarté — habitudes du foyer + incompatible NFR-X1.
- **Pas une plateforme de partage de recettes.** Catalogue local au Board partagé — pas d'export communautaire, pas d'import inter-foyer, pas de feed, pas de notations.
- **Pas connecté aux drives au MVP.** *(Détails §6.2 — étoile du nord v2+, conditionnée par API publiques drive.)*
- **Pas une IA conversationnelle ni assistant intelligent.** Pas de chat, pas de LLM créatif, pas d'apprentissage des goûts. Pioche basique au MVP *(FR-11)*. *(Détails §6.2.)*
- **Pas un produit desktop ou tablette.** Mobile-only iPhone *(D5 du brief)*. Toute UX se conçoit en portrait, à hauteur de pouce, sans souris ni clavier physique.
- **Pas un produit hors-écosystème iOS.** Pas de cible Android, pas de version Mac, pas de cible Windows. *(Si le foyer change d'écosystème un jour, ce sera un projet distinct ou une révision majeure de l'architecture.)*

## 6. MVP Scope

### 6.1 In Scope

L'**ensemble des 24 FR** du §4, regroupés en 6 Features. Le tableau :

| Feature | FR couverts | Capacité métier en une phrase |
|---|---|---|
| **F1 — Setup & Comptes** | FR-1 → FR-4 | 2 Comptes Auth qui pointent sur 1 Board partagé ; Convives définis ; pattern récurrent des nuits paramétré. |
| **F2 — Catalogue** | FR-5 → FR-10 | Import par lien *(schema.org)* + saisie manuelle + édition + notes + suppression + consultation. |
| **F3 — Menu** | FR-11 → FR-16 | Génération pré-remplie sur Fenêtre 7-14j → régénération 2 temps + choix manuel + ajustements Slots/Convives → validation. |
| **F4 — Consultation Menu validé** | FR-17 → FR-19 | Vue d'ensemble + drill-down + vue rapide « ce soir » < 5s + historique. |
| **F5 — Liste principale** | FR-20 → FR-21 | Agrégation auto par Ingrédient, regroupement par catégorie, bascule bidirectionnelle ↔ secondaire. |
| **F6 — Liste secondaire** | FR-22 → FR-24 | Consultation hors-ligne + cochage soft-delete 24h + vidage manuel ; partage entre les 2 Comptes. |

### 6.2 Out of Scope for MVP

Capacités explicitement déférées — réparties en *(a)* quick wins post-MVP envisagés, *(b)* v2+ inscrits dans la Vision du brief, *(c)* hors-scope définitif.

**Quick wins post-MVP**

- **Repas récurrents / épingler des favoris.** Une fois l'usage installé, identifier les *« pâtes carbonara classique »* qui reviennent souvent et les épingler pour pioche prioritaire ou ajout en 1 tap. *[NOTE FOR PM : revisiter à 3 mois si Aurélie/Lionel le réclament.]*
- **Élargir les sources d'import au-delà de `schema.org/Recipe`** *(parseur HTML best-effort, plus de domaines)*. À ouvrir si le Catalogue stagne après 2-3 mois faute de sites supportés.
- **Recherche textuelle dans le Catalogue.** Pas obligatoire au MVP *(FR-10)*, mais quick win à brancher dès que le Catalogue dépasse ~30 Recettes et que la navigation devient pénible.
- **Export du Catalogue en JSON** *(NFR-X4 — souveraineté).* Capacité formelle d'export, déclenchable depuis le Setup foyer. **Hors-MVP** *(Lionel — séance finalize : « b »)*. Justification : la souveraineté de fait est garantie par la stack *(Firestore accessible directement en console pour un dev, données récupérables sans capacité applicative)*. À formaliser si Aurélie veut un jour le faire sans dépendre de Lionel.

**v2+ — Vision du brief**

- **Import depuis Instagram natif** *(D5 brief)* — source majeure d'inspiration d'Aurélie. Reporté en l'attente d'une mécanique fiable d'extraction *(post-OCR, link-fishing dans la bio, etc.)*.
- **Import photo / OCR de livres de cuisine** *(brief)*.
- **Équilibre nutritionnel** discret sur la Fenêtre *(brief)*.
- **Budget effort/temps par recette et par jour** — rend la planification consciente de l'énergie disponible *(brief)*.
- **Génération « intelligente »** *(apprentissage des goûts, recettes plus subtiles)* *(brief)*.
- **Export panier vers le drive en ligne** — *l'étoile du nord* *(brief)*. Dépend de l'ouverture d'API publiques côté La Belle Vie / Monoprix, hors de notre contrôle.
- **Anti-récence inter-Fenêtre** dans la pioche *(FR-11)* — à reconsidérer si l'usage révèle un besoin.
- **Quantités vs conditionnement drive** *(U14)* — indication *« 500g → ~1 filet »* à côté de chaque item.
- **Planification de la gamelle d'Aurélie en B2/B3** *(brief)* — portion supplémentaire du dîner du jour, restes J-1. Reporté jusqu'à ce que l'usage révèle un besoin que B1+B4 ne couvrent pas.
- **Historique des modifications d'une Recette** *(FR-7)* — si un conjoint veut savoir qui a changé quoi.
- **Suppression de Compte / récupération de mot de passe** *(FR-1)* — délégué à la stack Auth, à formaliser quand un cas d'usage réel se présente.

**Hors-scope définitif**

- **Anti-gaspillage / inventaire frigo** *(brief, hors-scope assumé)* — décision active, ne reviendra pas.
- **Adaptation d'une Recette à la volée pendant la cuisson** *(addendum brief, cascade « changer la recette »)*. Si un ingrédient manque ou cloche, l'utilisateur improvise hors-app — pas de geste *« modifier la recette de ce soir »* dans le PRD *(U9 — modifier le Menu validé décalerait la Liste de courses, les autres Repas planifiés, et romprait la stabilité du plan)*. La friction de cette cascade est consciemment laissée hors-scope.
- **Cascade « item indispo côté drive » résolue *à la source*** *(brief, limite connue)* — pas d'API drive publique fiable. Le mécanisme F6 traite la conséquence *(la liste secondaire physique)*, pas la cause.
- **Multi-Foyer / multi-Board / multi-tenant** *(U24)* — pas de mécanique d'extension prévue. Le système reste mono-Board.
- **Plus de 2 Comptes par Board** *(FR-2)* — si jamais un cas réel apparaît, on traitera l'exception ad hoc.
- **Tous les Non-Goals du §5** restent hors-scope par construction.

**Sous contrainte d'Architecture** — voir **OQ-9** *(PWA installable conditionnée par U18 / F6 hors-ligne)*.

## 7. Success Metrics

*Adapté des critères de succès du brief. **Aucune métrique d'analytics** — tout est **observable au quotidien** et **tranchable en conversation directe** entre Aurélie et Lionel. Cross-référence aux FR clés pour traçabilité.*

### Primaires *(signal cardinal du brief — l'app a tenu sa promesse principale)*

- **SM-1 — Session menu à 3 mois : moins de 5 minutes.** Décider du menu de la quinzaine se fait en balayage rapide + ajustement marginal, plus en composition de zéro. **Ce n'est pas une réduction de durée, c'est un changement de nature** — on ne *s'assoit plus* pour faire le menu. Valide **F3 entier** *(FR-11 à FR-16)*, et indirectement F4 *(FR-18 si la vue rapide tient < 5s)*.
- **SM-2 — Aurélie ne reconstitue plus les ingrédients de tête à 3 mois.** Elle commande sur le drive en s'appuyant uniquement sur la Liste principale générée par l'app. Valide **F5** *(FR-20, FR-21)*.

### Secondaires *(signes de l'installation réelle dans le quotidien)*

- **SM-3 — Catalogue ≥ 15-20 Recettes à 1 mois.** Le foyer a numérisé son inventaire « de tête » *(~15 Recettes favorites)*, plus quelques nouveautés. Valide **F2** *(FR-5, FR-6)*. *Aucun blocage rédhibitoire à l'ajout — ni Aurélie, ni Lionel n'a renoncé à saisir une Recette à cause de la friction *(leçon proto précédent)*.*
- **SM-4 — Liste secondaire utilisée au moins une fois à 3 mois,** et a évité un *« faut se souvenir de quoi acheter »*. Valide **F6** *(FR-22, FR-23)*.
- **SM-5 — L'app survit aux nuits d'Aurélie.** Les soirs où Aurélie travaille, Lionel ouvre l'app et trouve ce qu'il doit préparer pour Rory et lui, **sans avoir à demander**. Valide **F4** *(FR-17, FR-18)* et indirectement F3 *(FR-4 — pattern récurrent)*.
- **SM-6 — Catalogue continue de s'enrichir naturellement à 6 mois.** Preuve que la friction de saisie/import est suffisamment basse pour ne pas devenir un frein. Valide **F2** *(NFR-X1 exception sur FR-6)*.
- **SM-7 — Au moins une fonctionnalité v2 désirée explicitement par Aurélie ou Lionel à 6 mois.** Signe que le MVP a **créé un appel**, sans couvrir tout l'espace — preuve d'usage installé. Valide la **viabilité du périmètre §6.1**.
- **SM-8 — L'app est toujours utilisée à 6 mois.** Pas oubliée derrière une icône. Le seuil de mort des apps perso est ~3 mois ; passer 6 mois est le vrai signe d'intégration.

### Counter-metrics *(à ne PAS optimiser)*

- **SM-C1 — Ne PAS chercher à réduire le temps de SM-1 en dessous de 5 minutes au prix de la concertation à deux.** Le brief insiste : c'est un *changement de nature*, pas une compression. Si l'app atteint 30 secondes en supprimant la conversation matinale entre Aurélie et Lionel, c'est un échec. *Contre-balance SM-1.*
- **SM-C2 — Ne PAS gonfler artificiellement le Catalogue pour atteindre SM-3.** Importer 30 Recettes qu'on ne fera jamais n'apporte rien. Le seuil 15-20 est une cible naturelle de **digitalisation de l'existant**, pas un objectif à courir. *Contre-balance SM-3.*
- **SM-C3 — Ne PAS rendre l'app plus jolie / plus polie au prix de plus de friction de saisie.** Le proto précédent est mort de cette dérive. NFR-X1 est le garde-fou. *Contre-balance toute tentation cosmétique.*
- **SM-C4 — Ne PAS continuer le développement « par culpabilité » si SM-STOP est atteint.** Voir condition d'arrêt ci-dessous.

### Condition d'arrêt *(brief — à conserver telle quelle)*

- **SM-STOP — Si à 3 mois Aurélie continue de faire les courses *principalement* sans l'app** *(de tête + Jow)* parce qu'elle la trouve **plus contraignante que pratique**, alors le produit a raté sa promesse principale — pas la méthode BMAD, le produit. Dans ce cas : **autopsie honnête, on consigne ce qu'on a appris** *(méthode + tech)*, on n'investit pas en v2 par culpabilité. ***L'app sert le foyer, pas l'inverse.***

## 8. Open Questions

*Questions explicitement non-tranchées par ce PRD. Chacune nomme son owner pressenti *(UX = Sally / Architecture = Winston / PM = Lionel-en-tant-que-décideur)* et son moment de résolution attendu. Elles deviendront des tickets de phase aval ou des décisions de revue à 3 mois.*

### Délégations UX *(Sally)*

- **OQ-1 — Mécanique exacte de la vue rapide « ce soir » *(FR-18)*.** Vue calendrier, tab « aujourd'hui », landing page contextuelle ? Contrainte : < 5s d'identification, taps inclus. **Owner : Sally**. NOTE-PM-1 du `.decision-log.md`.
- **OQ-2 — Mécanique d'invitation du 2ᵉ Compte *(FR-2)*.** Préférence Lionel : **scan QR**. Faisabilité ergonomique iOS à confirmer + fallback *(lien partagé)* si scan impossible. **Owner : Sally**.
- **OQ-3 — Catégorisation des Ingrédients dans la Liste principale *(FR-20)*.** Taxonomie + méthode d'assignation *(saisie volontaire, dictionnaire interne, classification auto, à la demande)*. Délégation totale par Lionel. **Owner : Sally**.
- **OQ-4 — Ergonomie de saisie/import F2 *(FR-5, FR-6)*.** **Le plus critique** — friction historique qui a tué le proto précédent. Autocomplete, copier-coller bloc, presse-papier intelligent. NFR-X1 a une exception ici, à minimiser. **Owner : Sally**, à confier avec un budget de soin disproportionné.
- **OQ-5 — Geste précis de bascule Liste principale ↔ secondaire *(FR-21)*.** Swipe, long-press, toggle visible. Pas d'avis fort de Lionel. **Owner : Sally**.
- **OQ-6 — Visibilité du flux principal/secondaire *(F5, NFR feature-specific)*.** L'utilisateur doit voir « X items sur la secondaire » depuis la principale, pour éviter le sentiment de perte. **Owner : Sally**.
- **OQ-7 — Format de présentation de la Liste secondaire *(FR-22, U15)*.** Regroupé par catégorie ou liste simple, ergonomie tactile en mobilité. **Owner : Sally**.
- **OQ-8 — Vue Menu draft *(F3)* — densité et hiérarchisation.** Écran-clé de la session menu, conditionne SM-1 *(< 5 min)*. Conception très exigeante. **Owner : Sally**.

### Délégations Architecture *(Winston)*

- **OQ-9 — Décision PWA installable** *(D6 du brief, ré-activé par NFR-X1 + F6 hors-ligne)*. Choix entre PWA + Service Worker + IndexedDB, alternatives, ou abandon de l'exigence hors-ligne au MVP. **Owner : Winston**, sous contrainte de servir F6.
- **OQ-10 — Stratégie de sync entre les 2 Comptes avec hors-ligne *(F6, NFR-X3)*.** Firestore offline persistence native + last-write-wins, CRDT simple, ou stratégie custom. Critère : robustesse — les coches faites hors-ligne ne doivent jamais être perdues. **Owner : Winston**.
- **OQ-11 — Parsing schema.org/Recipe *(FR-5)*.** Côté client *(extraction JSON-LD dans la page)* vs serverless *(éviter CORS, normalisation centralisée)*. Compromis simplicité vs coût. **Owner : Winston**.
- **OQ-12 — Stack Auth *(FR-1, FR-2)*.** Firebase Auth pressenti par le brief. Confirmer + définir la mécanique d'invitation côté backend *(QR code à usage unique, expiration)*. **Owner : Winston**.
- **OQ-13 — Stratégie de gel/tombstone pour la suppression de Recettes et de Convives *(FR-3, FR-9)*.** Référence figée *(snapshot)* au moment de l'utilisation par un Slot, ou bien tombstone côté Convive/Recette ? Compromis simplicité de modèle vs coût stockage. **Owner : Winston**.
- **OQ-14 — Concurrence sur le Menu draft *(F3, FR-12 à FR-15)*.** Éventualité où 2 Comptes éditent simultanément le même Menu draft. Stratégie : last-write-wins, lock, merge ? **Owner : Winston**, cohérent avec NFR-X3.

### Décisions PM *(Lionel, ou revue à 3 mois)*

- ~~**OQ-15 — Export du Catalogue en JSON *(NFR-X4 — souveraineté des données).***~~ **Résolu en séance finalize 2026-06-18 : hors-MVP** *(Lionel — « b » ; voir §6.2 quick wins post-MVP)*. Souveraineté de fait via la stack *(Firestore accessible en console pour un dev)*.
- **OQ-16 — Repas favoris / épinglage *(§6.2 quick wins)*.** À revisiter à 3 mois si Aurélie ou Lionel le réclament explicitement *(SM-7)*. **Owner : Lionel**, revue post-MVP.
- **OQ-17 — Élargissement des sources d'import au-delà de schema.org *(§6.2 quick wins)*.** À ouvrir si le Catalogue stagne à 3 mois faute de sites supportés. **Owner : Lionel**, revue à 3 mois.
- **OQ-18 — Ajustement de la Fenêtre de planification par défaut.** Le cycle réel de courses du foyer est de **~10 jours** *(addendum brief)*, le défaut de FR-11 est **14 jours** *(D3 brief)*. Tension consciente : 14j absorbe la variabilité, 10j colle au réel. À revoir à 3 mois selon ce qu'Aurélie choisit en pratique au moment de la génération du Menu. **Owner : Lionel**, revue à 3 mois.
- **OQ-19 — Environnements de base de données séparés dev / prod *(brainstorming, profil utilisateur Firebase).*** Lionel souhaite explicitement deux environnements distincts pour tester en dev sans toucher au prod. À formaliser dans le solution design *(naming des projets Firebase, gestion des secrets, mécanique de déploiement)*. **Owner : Winston**, dans la phase Architecture.

## 9. Assumptions Index

*Index des hypothèses encore implicitement portées par ce PRD. Le mode Coaching path a tranché en séance la majorité des arbitrages — la plupart des `[ASSUMPTION]` initialement posés ont été remplacés par des décisions explicites *(traces dans `.decision-log.md` U1-U26)*. Restent ici uniquement les hypothèses **non-explicitement confirmées** au cours de la session, à valider rapidement avant la phase Implementation.*

- **AS-1 — URL source de l'import stockée sur la Recette *(FR-5 / U23).*** *« Quand l'import par lien réussit, l'URL d'origine est stockée sur la Recette pour rétro-référence *(retour au blog, lecture des commentaires)*. »* J'ai posé la valeur par défaut sans demander explicitement à Lionel ; à confirmer avant la phase Implementation. **Impact si rejeté** : champ optionnel à retirer du modèle Recette ; pas de conséquence métier majeure.

*Tous les autres arbitrages tranchables sont consignés dans le `.decision-log.md` *(U1-U26)*, qui constitue la mémoire canonique des décisions de cette rédaction.*
