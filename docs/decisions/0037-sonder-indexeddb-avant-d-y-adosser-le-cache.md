# ADR 0037 — `initializeFirestore` ne jette pas : sonder IndexedDB avant d'y adosser le cache

- **Statut** : en vigueur — ferme l'alternative que
  [ADR 0027](0027-le-cache-plutot-qu-un-faux-hors-ligne.md) avait écartée pour l'instant
- **Date** : 2026-08-23 (branche `iter-53-observation`)
- **Portée** : `src/config/firebase.ts`, `src/config/persistence-probe.ts`

## Contexte

[ADR 0027](0027-le-cache-plutot-qu-un-faux-hors-ligne.md) a rendu les lectures tolérantes au cache
du SDK, et a laissé un trou nommé : le cache était un cache **mémoire**, donc vide après un
rechargement, donc le **démarrage hors ligne** n'était pas couvert. Le remède était identifié —
`initializeFirestore(app, { localCache: persistentLocalCache() })` — et mis de côté faute de mesure.

Ce lot le prend. La mesure a trouvé autre chose que ce qu'elle cherchait : le cache persistant a un
mode d'échec qui ne ressemble à aucun échec.

## La mesure

Banc d'essai dans Chrome, `firebase` 12.16.0, contre le Firestore de **dev**. Chaque ligne monte
l'application, pose un `onSnapshot`, et relève ce qui arrive — le rappel de données, le rappel
`onError`, la console.

| Initialisation           | IndexedDB                    | `onError` de `onSnapshot` | Console                                                                                                            |
| ------------------------ | ---------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `getFirestore` (mémoire) | `indexedDB.open()` **jette** | appelé en **110 ms**      | propre                                                                                                             |
| `persistentLocalCache`   | `indexedDB.open()` **jette** | _**jamais appelé**_       | `INTERNAL UNHANDLED ERROR`, puis `FIRESTORE INTERNAL ASSERTION FAILED: Unexpected state (ID: b815)`, **en boucle** |
| `persistentLocalCache`   | saine                        | appelé en **178 ms**      | propre                                                                                                             |
| sonde + repli mémoire    | `indexedDB.open()` **jette** | appelé en **118 ms**      | propre                                                                                                             |

Trois faits en sortent, et ce sont eux qui décident.

1. **`initializeFirestore` ne jette pas.** L'échec ne se voit pas à l'initialisation. Il n'y a rien
   à entourer d'un `try`, rien à rattraper, rien à observer au moment où la décision se prend.
2. **Le blocage n'emprunte aucun canal d'erreur documenté.** `onError` n'est **jamais** appelé —
   ni tard, ni jamais rejeté : jamais appelé. La seule trace est une assertion interne du SDK
   (`b815`) qui se répète dans la console, c'est-à-dire à l'endroit exact que personne ne regarde
   sur le téléphone d'un utilisateur. Un écran qui attend son premier rappel attend pour toujours :
   c'est la signature du **loader infini** rapporté.
3. **Le repli coûte 8 ms et rend l'erreur.** Ligne 2 contre ligne 4, même panne d'IndexedDB : sans
   la sonde, l'écran ne reçoit rien ; avec elle, il reçoit son `onError` en 118 ms contre 110 ms
   pour une instance mémoire pure. La sonde est un `indexedDB.open()`, et il se paie ce prix-là.

## Décision

`src/config/firebase.ts` n'appelle plus `initializeFirestore` inconditionnellement : il interroge
d'abord `src/config/persistence-probe.ts#persistenceIsAvailable`, une **sonde synchrone** qui tente
`indexedDB.open()` dans un `try/catch`, referme la connexion obtenue et supprime la base de sonde.

- Sonde positive → `initializeFirestore` avec
  `persistentLocalCache({ tabManager: persistentMultipleTabManager() })`.
- Sonde négative → `getFirestore(app)`, cache mémoire, exactement le comportement d'avant ce lot.

**La sonde remplace un canal d'erreur qui n'existe pas.** Ce n'est pas une précaution : c'est le
seul endroit du programme où l'indisponibilité d'IndexedDB est encore **observable**. Une fois
`initializeFirestore` appelé, elle ne l'est plus.

**Le gestionnaire multi-onglets n'est pas une option de confort**, et
`src/config/firebase.ts#persistentMultipleTabManager` n'est pas décoratif.
`persistentLocalCache()` nu vaut `persistentSingleTabManager()` : le premier onglet prend le
verrou, et l'initialisation du **second échoue en `failed-precondition`**. Le foyer, c'est deux
personnes et plusieurs appareils, avec des onglets qu'on ne ferme pas. Un mode d'échec réservé à la
deuxième personne est un mode d'échec qu'on ne reproduit jamais soi-même. _Ce point-là est le
comportement documenté du SDK ; il n'a pas été rejoué sur le banc, dont les quatre lignes portent
toutes sur un seul onglet._

## Ce que la décision ne couvre pas

**Un `indexedDB.open()` qui ne jette pas, mais échoue en asynchrone** — le `request.onerror` d'une
base corrompue, d'un quota refusé, d'une suppression en vol. La sonde rend `true`, le cache
persistant s'installe, et on retombe **exactement sur la ligne 2 du tableau** : le loader infini,
sans `onError`, avec `b815` en boucle.

C'est nommé et non traité, pour une raison de forme : `db` est un **export de module**, consommé à
l'import par toute la couche `data/`. Attendre `request.onerror` rendrait la sonde asynchrone, donc
`db` une promesse, donc la racine de composition un chantier. Ce prix-là n'a pas été payé, et la
fréquence du cas n'a pas été mesurée.

Ce qui reste vrai malgré tout : la sonde couvre le cas **le plus courant**, celui où le navigateur
refuse l'API d'emblée — navigation privée, stockage bloqué par une politique de site — et où
`open()` jette une `SecurityError` synchrone.

## Pourquoi aucun test ne l'attrapera

Même raison structurelle que pour [ADR 0027](0027-le-cache-plutot-qu-un-faux-hors-ligne.md), et
c'est la limite assumée par [ADR 0014](0014-pas-d-emulateur-firestore.md) : les tests de `src/data/`
mockent le SDK, donc ils vérifient **quelle fonction on appelle**, jamais ce qu'elle fait. Les tests
de `src/config/` font de même — ils tiennent le **câblage** (quelle initialisation pour quelle
réponse de sonde, et qu'aucune des deux ne déborde sur l'autre), pas le comportement de Firestore.

Aucun d'eux n'aurait vu le `b815`. Il a fallu un navigateur, une vraie base, et une panne
d'IndexedDB provoquée à la main.

## Conséquences

- **Le démarrage hors ligne est couvert**, sur un cache rempli. Le trou nommé par
  [ADR 0027](0027-le-cache-plutot-qu-un-faux-hors-ligne.md) est fermé ; sa conséquence qui
  l'annonçait ouvert est amendée sur place.
- **Le faux vide de [ADR 0003](0003-lectures-serveur-plutot-que-cache.md) se rétrécit sans
  disparaître.** Un tout premier lancement hors ligne trouve toujours un cache froid, et `getDocs`
  rend alors un snapshot **vide** que rien ne distingue d'un vide réel. La fenêtre est plus étroite
  qu'avant ce lot ; l'avertissement de `0003` reste debout.
- **La sonde ne laisse rien derrière elle** : elle referme la connexion qu'elle a ouverte et
  supprime sa propre base. Une sonde qui laisse une base résiduelle serait un effet de bord posé au
  démarrage de chaque session, pour un booléen.
- **Le repli est silencieux, et c'est délibéré.** Un utilisateur en navigation privée perd la
  persistance sans en être averti : il retrouve le comportement de session d'avant ce lot, qui
  fonctionne. L'avertir demanderait la décision d'interface que
  [ADR 0003](0003-lectures-serveur-plutot-que-cache.md) puis
  [ADR 0027](0027-le-cache-plutot-qu-un-faux-hors-ligne.md) ont toutes deux refusé de trancher —
  distinguer à l'écran une donnée fraîche d'une donnée de cache.
- **Cette page s'ancre sur `#persistenceIsAvailable` et `#persistentMultipleTabManager`**, les deux
  symboles qui portent sa décision : ils disparaissent du dépôt si l'on revient au cache mémoire ou
  au mono-onglet. C'est la technique de [ADR 0035](0035-une-adr-designe-un-symbole-pas-une-ligne.md),
  appliquée en sachant ce qu'elle ne promet pas — cette page est justement le lot qui a fait
  repasser au vert l'exemple canonique de `0035`, sans rien rendre de vrai
  ([son amendement](0035-une-adr-designe-un-symbole-pas-une-ligne.md#amendement-du-2026-08-23--lexemple-canonique-sest-vérifié-puis-sest-défait)).

## Alternatives écartées

**Entourer `initializeFirestore` d'un `try/catch`.** La forme qui vient à l'esprit, et la mesure la
tue en une ligne : il ne jette pas. Le `catch` ne serait jamais atteint, et sa présence ferait
croire le cas traité — un garde-fou qu'on n'a jamais vu échouer.

**Guetter l'erreur côté `onSnapshot` et se replier ensuite.** Écarté par la ligne 2 : il n'y a pas
d'erreur à guetter. Le repli tardif suppose un signal, et le signal est précisément ce qui manque.

**`persistentLocalCache()` nu.** Moins de code, un onglet. Écarté ci-dessus : le second onglet
échoue en `failed-precondition`, et le foyer en ouvre un second.

**Ne rien changer, rester en cache mémoire.** C'était l'état d'avant, et il est sûr. Écarté parce
qu'il laisse le démarrage à froid sans données alors que la mesure montre que le cas sain coûte
178 ms et se comporte proprement : le risque était concentré sur une seule branche, celle qu'on
vient de fermer.
