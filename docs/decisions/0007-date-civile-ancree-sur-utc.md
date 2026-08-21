# ADR 0007 — Une date civile ancrée sur UTC, sans bibliothèque de date au domaine

- **Statut** : en vigueur
- **Date** : 2026-08-19 (`3554110`, `feat(menu): le menu porte des dates réelles` — `CalendarDate`
  et l'interdit `date-fns` dans le même commit)
- **Portée** : `src/domain/entities/calendar-date.ts`, `eslint.config.js`,
  `src/test/architecture.test.ts`

## Contexte

Un menu se lit en jours : « lundi 24 août ». Ce n'est **pas un instant** — « le 24 août » ne
désigne pas le même intervalle de temps à Paris et à Tokyo, et le menu n'a pas besoin qu'il en
désigne un. Manipuler des `Date` JavaScript ferait entrer un fuseau, donc l'heure d'été, dans une
couche qui n'en a que faire.

Le piège concret : **un jour local dure 23 ou 25 heures aux changements d'heure**. Toute
arithmétique « ajouter un jour » posée sur un instant local décale d'une heure deux fois par an, et
finit par changer de quantième.

## Décision

`CalendarDate` est un triplet `{ year, month, day }` gelé, sans heure ni fuseau. **Toute**
l'arithmétique passe par un ancrage **UTC** (`Date.UTC`), où un jour dure toujours 24 heures : ni
le fuseau de la machine ni l'heure d'été ne peuvent décaler un lendemain.

Le domaine **n'a aucune bibliothèque de date**. `date-fns` est interdit dans `src/domain/` par deux
garde-fous indépendants — `boundaries/external` dans `eslint.config.js` et
`src/test/architecture.test.ts` — et reste permis dans `src/ui/` pour le **formatage** seul.

Détails que le code ne raconte pas :

- **le contrôle d'existence est un aller-retour**. `Date.UTC` normalise silencieusement : le
  30 février devient le 2 mars, un composant fractionnaire est tronqué, un `NaN` contamine tout. Si
  la date relue diffère de celle demandée, le triplet ne désignait aucun jour ;
- **reculer de N mois clampe** sur le dernier jour du mois d'arrivée. Le 30 avril moins deux mois
  est le 28 février, pas le 2 mars : un `setUTCMonth` appliqué à une fin de mois déborde
  silencieusement sur le mois suivant, et ce débordement décalerait la borne de rétention ;
- **le clamp s'obtient par deux appuis, qu'aucune lecture du calcul ne restitue.** Le premier : on
  vise le **1er** du mois d'arrivée avant de poser le quantième. Un mois dont on ne demande que le
  premier jour ne peut pas déborder, quelle que soit la longueur réelle du mois ; l'ancrage rend
  donc le calcul insensible à l'ordre des opérations. Le second : la longueur du mois d'arrivée se
  lit en demandant le **jour 0 du mois suivant** (`Date.UTC(annee, mois + 1, 0)`), parce que le
  « jour 0 » d'un mois désigne, par convention de l'API `Date` de JavaScript, le **dernier jour du
  mois précédent**. C'est du savoir sur une API externe, non déductible du code : sans lui,
  l'expression passe pour une incantation. Le quantième retenu est le plus petit du quantième de
  départ et de cette longueur ;
- **la comparaison `isBefore` est stricte** — un jour ne se précède pas lui-même. C'est cette
  strictesse qui rend inclusive une borne exprimée par « purger ce qui est avant », et qui laisse
  passer un menu démarrant aujourd'hui ;
- **le formatage, lui, est ancré LOCAL** (`menu-day-label.ts` construit `new Date(y, m - 1, d)`) :
  `format` de `date-fns` lit les composants **locaux**, donc un ancrage UTC afficherait la veille
  sur toute machine à l'ouest de Greenwich. Les deux ancrages sont contradictoires en apparence et
  corrects chacun à sa place.

## La mesure

Les changements d'heure sont couverts par deux tests de `calendar-date.test.ts`. Ils ne mesurent ce
qu'ils annoncent que si le runner tourne sous un fuseau **figé** : voir
[ADR 0013](0013-fuseau-du-runner-fige-a-utc.md).

Le formatage français impose deux formats et non un token ordinal : le premier du mois est le
**seul** quantième que le français écrit en ordinal (« 1er septembre », puis « 2 septembre »). Le
token `do` de `date-fns` rendrait bien « 1er » mais suffixerait aussi « 2ème » et « 21ème ».

## Conséquences

- Le fuseau `Europe/Paris` n'existe qu'à un seul endroit : l'adapter `SystemClock`
  ([ADR 0008](0008-l-horloge-ne-promet-rien-entre-deux-lectures.md)).
- La traduction vers le format d'échange du champ `<input type="date">` (`toIsoDate`,
  `parseIsoDate`) vit dans l'entité et non dans un container : le format est HTML, mais sa
  traduction est une règle de calendrier — et un container n'est pas muté
  ([ADR 0011](0011-les-decisions-vivent-dans-des-fichiers-mutes.md)).
- `parseIsoDate` contrôle **deux** choses : la forme (expression rationnelle) puis l'existence du
  jour. « 2026-02-30 » passe la première et échoue à la seconde — un motif ne connaît pas la
  longueur des mois.
- `parseIsoDate` ne contrôle en revanche **pas ses captures**, et c'est délibéré : une capture
  absente vaut `undefined`, `Number(undefined)` rend `NaN`, et le triplet part au rejet par
  `createCalendarDate` — l'aller-retour UTC ci-dessus ne relit jamais un `NaN` comme le composant
  demandé. Le chemin `undefined → NaN → rejet` couvre déjà le cas ; un garde explicite sur les
  captures serait du code qu'aucun test ne peut rendre rouge. Ce `NaN`-là n'est pas celui du
  contrôle d'existence : l'un naît d'une **capture manquante** au parsing, l'autre d'un
  **composant fractionnaire** passé à `Date.UTC`.
