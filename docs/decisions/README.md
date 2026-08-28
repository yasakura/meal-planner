# Décisions d'architecture (ADR)

Ce dossier garde le **savoir qui n'existe nulle part ailleurs** : un comportement mesuré sur un
système externe (Firestore, Stryker, Playwright, React, React Router), une décision prise contre
une alternative précise, un piège où l'on est déjà tombé.

Il ne garde rien d'autre. Ce que le code dit déjà, le code le dit mieux — il a des tests et des
mutants pour le tenir à jour, ce qu'aucune prose n'a. Ce que [`CLAUDE.md`](../../CLAUDE.md) déclare
comme règle du projet reste dans `CLAUDE.md` : deux documents qui disent la même chose finissent
par diverger.

## Origine

Issue [#76](https://github.com/yasakura/meal-planner/issues/76) : les commentaires du code
productif sont supprimés, parce que **rien ne garde leur vérité** — sur la seule session du
19-20 août 2026, six commentaires devenus faux ont été trouvés, chacun par une revue de code,
aucun par un test. Le savoir mesuré, lui, déménage ici avant que la suppression n'ait lieu.

## Ce qu'une ADR porte

Le **titre**, la **date** de la décision, le **contexte** (quel problème réel), la **décision**, la
**mesure qui l'a produite** — sans elle une ADR n'est qu'une opinion — et les **conséquences**, y
compris ce qui a été écarté.

Une ADR n'est pas un commentaire déplacé : le commentaire dit « pourquoi cette ligne », l'ADR dit
« pourquoi ce choix ». Elle se lit sans avoir le fichier sous les yeux.

Quand un fait n'a pas pu être re-vérifié au moment de la rédaction, l'ADR le dit à l'endroit où il
est cité. Un chiffre repris d'un commentaire est attribué à sa source.

Une décision qui porte sur un **outil externe** cite sa source là où elle l'affirme : l'**URL** de sa
documentation, ou la **mesure** qu'on a faite. Les deux valent, les confondre non —
[ADR 0038](0038-une-ecriture-acceptee-localement-est-reussie.md) sépare le mécanisme prouvé au banc
du code d'erreur lu dans la documentation, et
[ADR 0037](0037-sonder-indexeddb-avant-d-y-adosser-le-cache.md) le cas mesuré du multi-onglets
seulement documenté. Une source citée se vérifie en revue ; « as-tu lu la doc ? » ne se vérifie pas.

## Convention de nommage

`NNNN-titre-en-kebab.md`, numéro sur 4 chiffres, **attribué dans l'ordre de création** et jamais
réutilisé ni renuméroté. Le tri alphabétique du dossier est donc l'ordre d'arrivée, et une
référence `ADR 0009` reste valable pour toujours — y compris si la décision est plus tard
remplacée. Une décision révoquée n'est pas effacée : son statut passe à « remplacée par ADR NNNN »,
parce que savoir qu'on a essayé et abandonné vaut autant que la décision courante.

Chaque fichier porte un **statut** : `en vigueur`, `remplacée par ADR NNNN`, ou `caduque`.

## Référencer du code

Une ADR désigne le code par **`chemin/depuis/la/racine.ext#symbole`** —
`src/test/architecture.test.ts#featureEdges` — et **jamais par un numéro de ligne**, qui dérive en
silence au premier ajout en amont. Sept références sur vingt étaient fausses le jour où on les a
comptées ([ADR 0035](0035-une-adr-designe-un-symbole-pas-une-ligne.md)).

`src/test/adr-references.test.ts` refuse le numéro de ligne en prose et vérifie que chaque
`#symbole` existe. Ce qui est **cité dans un bloc de code** — sortie d'outil, extrait daté — est
exempt du premier point : c'est une citation figée, pas une affirmation sur le code d'aujourd'hui.

## Index

| ADR                                                          | Décision                                                                | Date       |
| ------------------------------------------------------------ | ----------------------------------------------------------------------- | ---------- |
| [0001](0001-trois-issues-pour-une-ecriture.md)               | Une écriture a trois issues : faite, refusée, non acquittée             | 2026-08-12 |
| [0002](0002-borne-d-acquittement-des-ecritures.md)           | Borner l'acquittement des écritures Firestore                           | 2026-08-20 |
| [0003](0003-lectures-serveur-plutot-que-cache.md)            | Lire depuis le serveur, ou avouer qu'on n'a pas lu                      | 2026-08-12 |
| [0004](0004-reconnaissance-nominale-des-erreurs.md)          | Reconnaître l'erreur de dépôt par son nom, jamais par `instanceof`      | 2026-08-12 |
| [0005](0005-identifiant-pose-a-l-ouverture-du-formulaire.md) | L'identifiant du document est posé à l'ouverture du formulaire          | 2026-08-20 |
| [0006](0006-la-periode-identifie-le-menu.md)                 | La période est l'identifiant du menu, et la rétention passe après       | 2026-08-20 |
| [0007](0007-date-civile-ancree-sur-utc.md)                   | Une date civile ancrée sur UTC, sans bibliothèque de date au domaine    | 2026-08-19 |
| [0008](0008-l-horloge-ne-promet-rien-entre-deux-lectures.md) | Le port `Clock` ne promet rien entre deux lectures                      | 2026-08-19 |
| [0009](0009-garde-de-fraicheur-par-requestid.md)             | Discriminer les réponses de thunks par `requestId`                      | 2026-08-13 |
| [0010](0010-le-non-garde-de-generate-menu-fulfilled.md)      | Le non-garde de `generateMenu.fulfilled` tient à une seule ligne        | 2026-08-18 |
| [0011](0011-les-decisions-vivent-dans-des-fichiers-mutes.md) | Une décision vit dans un `.ts` muté, pas dans un `.tsx`                 | 2026-08-19 |
| [0012](0012-configurations-stryker-ecartees.md)              | Configurations Stryker mesurées et écartées                             | 2026-08-13 |
| [0013](0013-fuseau-du-runner-fige-a-utc.md)                  | Fuseau du runner figé à UTC, au niveau du processus                     | 2026-08-19 |
| [0014](0014-pas-d-emulateur-firestore.md)                    | Pas d'émulateur Firestore : humble object et garde statique             | 2026-07-14 |
| [0015](0015-frontieres-de-couches-inertes.md)                | Les frontières de couches étaient déclarées et inertes                  | 2026-08-17 |
| [0016](0016-mode-e2e-embarque.md)                            | Un mode e2e embarqué dans l'application                                 | 2026-08-17 |
| [0017](0017-surface-de-pilotage-des-scenarios.md)            | La surface de pilotage des scénarios, et ce qu'elle refuse d'offrir     | 2026-08-17 |
| [0018](0018-conventions-playwright.md)                       | Conventions Playwright : sous-chaîne, zéro réessai, viewport à plat     | 2026-08-17 |
| [0019](0019-doubles-hostiles-a-leur-port.md)                 | Un double n'offre jamais plus que son port : inversion, pas shuffle     | 2026-08-14 |
| [0020](0020-un-remontage-n-est-jamais-garanti.md)            | Un remontage n'est jamais garanti                                       | 2026-08-12 |
| [0021](0021-naviguer-sur-l-issue-pas-sur-le-statut.md)       | Naviguer sur l'issue d'une écriture, pas sur l'observation du statut    | 2026-08-18 |
| [0022](0022-la-provenance-vit-dans-l-url.md)                 | La provenance d'un parcours vit dans l'URL                              | 2026-08-19 |
| [0023](0023-elision-francaise-compromis-assume.md)           | L'élision française : se tromper sur les h aspirés, sciemment (caduque) | 2026-08-12 |
| [0024](0024-geometrie-mobile-et-hauteurs-declarees.md)       | Géométrie mobile : des hauteurs déclarées, jamais émergentes            | 2026-08-18 |
| [0025](0025-un-lien-quand-on-change-de-route.md)             | Un lien quand on change de route, un ton par rôle ARIA                  | 2026-08-18 |
| [0026](0026-regles-type-aware-et-runtime.md)                 | Trois règles type-aware, et ce qu'elles ignorent du runtime             | 2026-08-21 |
| [0027](0027-le-cache-plutot-qu-un-faux-hors-ligne.md)        | `getDocsFromServer` n'attend pas : lire avec repli sur le cache         | 2026-08-21 |
| [0028](0028-cliquet-de-complexite-au-maximum-atteint.md)     | Un cliquet de complexité, posé au maximum déjà atteint                  | 2026-08-22 |
| [0029](0029-deux-provenances-pour-deux-ecrans-de-menu.md)    | Deux provenances de menu, parce qu'il y a deux écrans de menu           | 2026-08-22 |
| [0030](0030-cliquet-de-couverture-au-niveau-mesure.md)       | Un cliquet de couverture, posé au niveau mesuré                         | 2026-08-22 |
| [0031](0031-lecture-des-imports-par-l-ast.md)                | Les gardes d'architecture lisent les imports par l'AST                  | 2026-08-22 |
| [0032](0032-features-acycliques-au-premier-degre.md)         | Les features acycliques, et ce que le garde ne voit pas                 | 2026-08-22 |
| [0033](0033-le-depot-e2e-sait-se-taire.md)                   | Le dépôt e2e sait se taire, et c'est la borne qui parle                 | 2026-08-23 |
| [0034](0034-la-course-se-joue-dans-la-page.md)               | Une course contre une animation se joue DANS la page                    | 2026-08-23 |
| [0035](0035-une-adr-designe-un-symbole-pas-une-ligne.md)     | Une ADR désigne un symbole, pas une ligne                               | 2026-08-23 |
| [0036](0036-designer-un-creneau-par-sa-position.md)          | Désigner un créneau par sa position, pas par son jour                   | 2026-08-23 |
| [0037](0037-sonder-indexeddb-avant-d-y-adosser-le-cache.md)  | `initializeFirestore` ne jette pas : sonder IndexedDB d'abord           | 2026-08-23 |
| [0038](0038-une-ecriture-acceptee-localement-est-reussie.md) | Une écriture acceptée localement est une écriture réussie               | 2026-08-24 |
| [0039](0039-un-seul-plafond-celui-du-compte-juste.md)        | Un seul plafond de quantité, celui du compte juste                      | 2026-08-27 |
| [0040](0040-le-filet-de-rendu-se-rearme-sur-la-cle.md)       | Le filet de rendu se réarme sur la clé de navigation                    | 2026-08-27 |
| [0041](0041-une-liste-de-courses-par-menu.md)                | Une liste de courses par menu, et l'abandon de la liste secondaire      | 2026-08-28 |
