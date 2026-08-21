# ADR 0008 — Le port `Clock` ne promet rien entre deux lectures

- **Statut** : en vigueur
- **Date** : 2026-08-19 (`3554110` puis `7fe356a`, dates réelles et jour de début du menu)
- **Portée** : `src/domain/ports/clock.ts`, `src/data/system-clock.ts`, `menu-slice`, `store.ts`

## Contexte

Le domaine n'a pas le droit de lire `new Date()`. Il passe par un port `Clock` qui rend une date
**civile** — « quel jour on est » pour l'utilisateur, à Paris — et jamais un instant : c'est
l'adapter qui résout le fuseau ([ADR 0007](0007-date-civile-ancree-sur-utc.md)).

Le point non évident : **deux lectures consécutives peuvent tomber sur deux jours différents**.
À minuit, évidemment ; mais aussi dans une session restée ouverte toute la nuit — le store est un
singleton de session, une application web mobile n'est presque jamais « redémarrée ».

## Décision

Le port **déclare** cette absence de garantie, et le test-double `DriftingClock` l'**exerce
activement** : il avance d'un jour à chaque appel ([ADR 0019](0019-doubles-hostiles-a-leur-port.md)).
Toute logique qui lit l'horloge deux fois en supposant la stabilité est donc fausse, et rouge.

Il en découle deux régimes de lecture, opposés et tous deux délibérés :

- **la date de début du menu est lue UNE fois par session**, à la naissance du store
  (`menuInitialState(nextMonday(), today())`). C'est une **préférence** de l'utilisateur : relue au
  montage de l'écran, elle changerait de semaine au fil des allers-retours vers `/menu` sans que
  personne n'ait rien touché. Une lecture unique n'a besoin d'aucun garde — il n'y a pas de seconde
  lecture à empêcher ;
- **le plancher se relit**. Il dit « aujourd'hui », pas « le jour où la session a commencé » : un
  plancher figé au démarrage refuserait la mauvaise journée après minuit. Il est relu à l'arrivée
  sur l'écran, et **chaque décision de refus relit l'horloge** au lieu de consulter le plancher
  mémorisé. Un plancher stocké peut dater d'avant minuit ; une décision, jamais.

Le plancher stocké ne sert donc **qu'à l'affordance** du champ natif (attribut `min`), qui est un
confort et non un contrôle : il se contourne au clavier, et selon le navigateur il se contente de
marquer le champ invalide.

## La mesure

- `createTestStore` partage **une seule** instance de `DriftingClock`, partie d'un **dimanche**
  (23 août 2026). Le dimanche interdit de confondre « prochain lundi » avec « aujourd'hui » ; la
  dérive partagée rend visible une horloge qu'on aurait cessé de relire. Deux instances masqueraient
  le défaut.
- Le mode e2e fait l'**inverse**, et pour la même raison de fiabilité : une horloge **figée** au
  1er janvier 2026, un **jeudi** délibérément — une implémentation qui prendrait « aujourd'hui » au
  lieu du lundi suivant se verrait aussitôt dans les libellés.

## Conséquences

- « Le prochain lundi » **inclut aujourd'hui** : ouvrir l'application un lundi propose ce lundi-là.
- Un reducer ne peut pas lire l'horloge : les gestes qui en dépendent passent par un **thunk
  synchrone** (`AppThunk`) qui ne fait que la lecture et transmet le jour dans l'action. La
  **décision** reste dans le reducer, qui est muté
  ([ADR 0011](0011-les-decisions-vivent-dans-des-fichiers-mutes.md)). Ces actions ne sont **pas
  exportées** : les exposer laisserait poser un plancher arbitraire depuis n'importe où.
- `SystemClock` construit son `Intl.DateTimeFormat` **à chaque appel**, et prend une source
  d'instants `() => number` dont le défaut est la **référence** `Date.now` — deux choix qui ne sont
  pas des détails de style : voir [ADR 0011](0011-les-decisions-vivent-dans-des-fichiers-mutes.md),
  section « écrire pour être observable ».
