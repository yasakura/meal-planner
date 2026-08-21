# ADR 0019 — Un double n'offre jamais plus que son port : inversion, pas shuffle

- **Statut** : en vigueur
- **Date** : 2026-08-14 (`3f20978`, FR-3) — origine du défaut : 2026-08-12
- **Portée** : `src/domain/test-doubles/`, `src/data/e2e/`

## Contexte

Un test-double plus **aimable** que son contrat est un faux vert **structurel** : aucun test ne peut
l'attraper, puisque c'est le référentiel lui-même qui ment.

## La mesure

Vécu FR-3 : `InMemoryConviveRepository.findAll()` rendait l'**ordre d'insertion**. Firestore, lui,
lit la collection **sans `orderBy`** et restitue l'ordre des **identifiants de documents** — des
cuid2, délibérément non triables. Résultat : **suite verte**, et un écran qui se réordonnait au
hasard à chaque rechargement. Défaut trouvé par la **vérification navigateur** seulement.

## Décision

Là où un port déclare une garantie **absente**, le double l'**exerce activement** :

- **ordre non garanti → ordre d'insertion INVERSÉ.** Inversion et non mélange pseudo-aléatoire
  seedé : c'est déterministe (suite reproductible) **et** garanti différent de l'insertion dès deux
  éléments, là où un shuffle peut retomber sur l'identité et affaiblir le garde en silence ;
- **`transform` rejouable → appelée DEUX fois**, seul le second résultat étant retenu. Une
  transaction Firestore rejoue son corps entier en cas de contention ; une transformation impure —
  qui incrémenterait un compteur, consommerait un générateur d'identifiants ou lirait l'horloge —
  casse ainsi **ici**, dans `domain/`, et non des mois plus tard sur une écriture concurrente réelle ;
- **horloge sans garantie entre deux lectures → `DriftingClock`**, qui avance d'un jour à chaque
  appel ([ADR 0008](0008-l-horloge-ne-promet-rien-entre-deux-lectures.md)) ;
- **écriture sous l'identifiant DEMANDÉ**, jamais sous celui de l'entité rendue par `transform` :
  l'adapter Firestore réécrit le document qu'il vient de lire, il n'en déplace aucun. Un double plus
  arrangeant rendrait vert un renommage d'identifiant que le vrai adapter n'a jamais su faire.

Symétriquement, ce que le port **promet** n'a pas à être mis en défaut : l'unicité des périodes de
`MenuRepository` découle de l'upsert par période, la `Map` la tient, et le double la respecte.

**Quand le contrat d'un port change, le double change dans la même passe.**

## Conséquences

- Les compteurs d'inspection (`saveCount`, `removeCount`, `updateCount`) comptent les **appels**,
  pas les écritures effectives : sinon un test d'idempotence ne pourrait pas distinguer « appelé et
  sans effet » de « jamais appelé ».
- Les méthodes d'inspection hors contrat (`all()`, `byId()`, `byStartDate()`) rendent l'ordre
  d'insertion **honnêtement**, et sont marquées comme telles : elles servent l'assertion, pas la
  production.
- La même hostilité s'applique aux adapters du **mode e2e**, qui ne sont pourtant pas des doubles
  ([ADR 0016](0016-mode-e2e-embarque.md)).
- Le contrat de rejet fait partie du port : un double **muet** sur la distinction « pas de réponse »
  / « a répondu non » rendrait vert un chemin que le vrai adapter n'a jamais eu
  ([ADR 0001](0001-trois-issues-pour-une-ecriture.md)).
