# Meal Planner

> **Note.** Projet personnel, sans ambition de produit ni d'usage par des tiers. Il existe pour
> tester le développement d'une application **from scratch avec Claude Code** : jusqu'où une
> discipline écrite (TDD, frontières de couches, mutation testing) tient quand c'est un agent qui
> écrit le code. Le dépôt en porte la trace — 134 commits entre le 2026-06-12 et le 2026-08-21,
> dont les cinq premiers relèvent d'un autre outillage (BMAD-METHOD : brainstorming, brief, PRD,
> UX, conservés dans `_bmad-output/`) avant que le développement ne bascule, le 2026-07-11, sur le
> règlement décrit dans [`CLAUDE.md`](CLAUDE.md).

Application web **mobile-only**, en français, pour planifier les repas d'un foyer.

## Ce que ça fait aujourd'hui

L'application est installable (PWA) et tient en deux onglets, derrière une authentification
email/mot de passe.

- **Recettes** (`/catalogue`) — catalogue trié par titre ; création, consultation et modification
  d'une recette (titre, nombre de personnes de référence, ingrédients quantifiés en `g`, `kg`,
  `ml`, `l` ou `piece`, préparation facultative).
- **Foyer** (feuille « Compte », en haut à droite) — ajout, renommage et retrait des convives,
  triés par prénom en collation française. Aussi la déconnexion.
- **Menu** (`/menu`) — génération d'un menu sur une fenêtre d'**1 ou 2 semaines**, à partir du
  prochain lundi (date modifiable, jamais avant aujourd'hui), avec un **midi** et un **soir** par
  jour. Le tirage ne repropose pas une recette tant que le catalogue n'est pas épuisé.
  Régénération, puis enregistrement — l'enregistrement écrase le menu de la même période et purge
  les menus vieux de plus de deux mois (**rétention glissante**, comptée depuis aujourd'hui).

Chaque écran a ses états explicites : chargement, vide, et perte de réseau (« Aucune connexion — … »).

**Pas encore fait**, bien que présent dans le PRD : import d'une recette par lien, suppression
d'une recette, listes de courses, relecture d'un menu enregistré (le dépôt de menus n'expose
aucune lecture de contenu), convives par créneau et prorata des quantités — la fonction
`effectiveIngredients` existe dans `domain/` mais n'est branchée à aucun écran —, partage entre
plusieurs comptes, création de compte depuis l'application.

## Démarrer

Prérequis : **Node 20** (la CI utilise `node-version: '20'`), npm, et un projet Firebase
(Auth email/password + Firestore) pour le mode `dev`.

```bash
npm ci
cp .env.dev.example .env.dev   # puis renseigner les valeurs du projet Firebase
npm run dev                    # http://localhost:5173 (Vite prend le port suivant s'il est pris)
```

Le serveur de dev écoute aussi sur le réseau local (`--host`) et affiche un QR code au démarrage —
l'application se teste au téléphone. `npm run qr` réaffiche ce QR sans redémarrer le serveur.

### Les trois modes

| Mode   | Commande                            | Données                                               |
| ------ | ----------------------------------- | ----------------------------------------------------- |
| `dev`  | `npm run dev`                       | Firebase de développement (`.env.dev`, non versionné) |
| `e2e`  | `npm run dev:e2e` (port 5174 fixe)  | Adapters **en mémoire** : ni réseau, ni base partagée |
| `prod` | `npm run build` / `npm run preview` | Firebase de production (`.env.prod`, non versionné)   |

Variables lues : `VITE_ENV`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
`VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `VITE_E2E`. (`VITE_USE_EMULATORS` figure dans
les fichiers d'exemple et dans le typage, mais aucun code ne la lit aujourd'hui.)

`.env.e2e` est **versionné**, contrairement aux deux autres, et son en-tête dit pourquoi : il ne
contient aucun secret, pas même une clé Firebase, et un scénario doit pouvoir être rejoué sur
n'importe quelle machine sans configuration préalable.

Deux scripts parlent au vrai projet Firebase de dev et ne tournent donc ni en CI ni à l'aveugle :
`npm run seed:dev` (vide les collections `recipes`, `convives` et `menus`, puis insère un jeu de
recettes et les convives du foyer de dev — aucun menu n'est réinséré, les identifiants de recettes
changent à chaque run et un menu conservé n'afficherait que « Recette inconnue ») et
`npm run check:rules` (vérifie que les règles **déployées** autorisent ce que `src/data/` fait).

## Tester

```bash
npm run test          # Vitest, avec les seuils de couverture
npm run test:coverage # idem (les seuils portent sur domain/, data/ et ui/)
npm run e2e           # Playwright, démarre lui-même le mode e2e
npm run test:mutation # Stryker — gate break: 80, LOCAL uniquement
npm run lint          # ESLint, frontières comprises
npm run build         # tsc -b puis build Vite (le seul à typechecker les tests)
```

Trois niveaux, trois choses différentes :

- **Vitest** — le domaine contre des adapters en mémoire, le mapping Firestore comme module pur,
  les slices Redux, et les containers en React Testing Library avec ports mockés. S'y ajoutent des
  tests **statiques** (`src/test/`) : frontières de couches, fuseau du runner, et couverture de
  `firestore.rules` par les collections réellement utilisées dans `src/data/`.
- **Playwright** — la seule couche qui exerce l'application **assemblée** : vrai routeur, vrai
  store, vrai CSS, vrais cycles de montage, en viewport 393×852. Elle tourne sur le mode `e2e`,
  donc sur des adapters en mémoire avec identifiants séquentiels et une date figée : pas de
  réseau, pas de base partagée, rejouable partout. Les pannes se pilotent depuis le scénario
  (`window.__e2e`), ce qui rend les états hors-ligne testables sans couper quoi que ce soit.
- **Stryker** — mutation testing sur le code de production (`domain/`, `data/`, et la logique UI
  `src/ui/features/**/*.ts`). Les `.tsx` ne sont pas mutés du tout. Lire
  [`CLAUDE.md`](CLAUDE.md#mutation-testing) avant d'interpréter un score : le run global est
  incrémental et n'est pas reproductible, seul `npm run test:mutation:isolated -- '<fichier>'`
  fait foi.

En CI, un seul check couvre `Lint + Test + Build` ; Playwright tourne dans un **job séparé**,
délibérément, pour qu'une instabilité de navigateur ne bloque pas une PR saine.

## Structure

```
src/domain/   entities, use-cases, ports — PUR, aucune dépendance UI/infra
src/data/     adapters Firestore/Firebase + adapters en mémoire du mode e2e (src/data/e2e/)
src/ui/       React : composants dumb, containers Redux, slices, store (composition root)
src/config/   sélection d'environnement et initialisation Firebase
src/test/     tests statiques transverses (architecture, règles, fuseau)
e2e/          scénarios Playwright
```

Tout contrat entre couches passe par un **port** défini dans `src/domain/ports/` (`RecipeRepository`,
`ConviveRepository`, `MenuRepository`, `AuthGateway`, `Clock`, `IdGenerator`, `RandomPicker`), et
`src/ui/store/create-app-store.ts` est le seul endroit où les adapters concrets sont câblés.

Les frontières ne sont pas une intention : elles sont **tenues par deux garde-fous** —
`eslint-plugin-boundaries` (`eslint.config.js`) et `src/test/architecture.test.ts`, qui lit les
imports et échoue si `domain/` touche React, Redux, Firebase, styled-components ou date-fns.

Les invariants détaillés — TDD, anti test-tampering, conventions de construction, protocole de
revue — vivent dans [`CLAUDE.md`](CLAUDE.md). Ils ne sont pas recopiés ici : deux documents qui
disent la même chose finissent par diverger.

## Ce que le dépôt ne dit pas

- **Les Security Rules ne sont pas déployées par le dépôt.** `firestore.rules` est versionné, un
  test statique vérifie que chaque collection utilisée y a son bloc `match`, mais **rien ne pousse
  ce fichier** vers Firebase (le CLI Firebase n'est même pas une dépendance du projet). Tant qu'il
  n'est pas déployé à la main, le fichier ne fait pas foi : la suite peut être verte et l'écran
  mort. `npm run check:rules` est le seul contrôle qui interroge le déploiement réel.
- **Le round-trip Firestore et les règles ne sont pas testés automatiquement** — décision assumée,
  pas d'émulateur Java. Le mapping est testé comme module pur, les adapters ne sont que des
  wrappers d'I/O.
- **La mutation ne tourne pas en CI.** C'est une discipline de poste de travail ; le seul check
  requis sur `main` est `Lint + Test + Build`.
- **La spec produit n'est pas dans le code, et les numéros `FR-…` non plus.** Les commentaires de
  `firestore.rules` citent FR-3, FR-6 et FR-16 : ils renvoient au PRD versionné sous
  `_bmad-output/planning-artifacts/prds/prd-meal-planner-2026-06-14/prd.md`, rédigé avant que le
  développement ne commence et **jamais mis à jour depuis**. Il décrit une application nettement
  plus large que ce qui est implémenté ; le lire comme un état des lieux serait une erreur.
- **Aucune URL de déploiement, aucun identifiant de projet Firebase, aucune licence** ne sont
  documentés ici — ils ne sont pas vérifiables depuis le dépôt seul.
