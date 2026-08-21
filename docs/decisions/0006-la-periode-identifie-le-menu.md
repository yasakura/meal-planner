# ADR 0006 — La période est l'identifiant du menu, et la rétention passe après

- **Statut** : en vigueur
- **Date** : 2026-08-20 (`aa305fb`, `feat(menu): enregistrer le menu généré`)
- **Portée** : `src/data/menu-mapper.ts`, `firestore-menu-repository.ts`,
  `src/domain/use-cases/save-menu.ts`

## Contexte

Un menu couvre une période qui commence à une date. Deux menus ne doivent pas pouvoir se disputer
la même période, et l'historique ne doit pas enfler indéfiniment dans une base facturée au
document.

## Décision

**L'identifiant du document `menus/{id}` EST la date de début, au format ISO** (`menus/2026-08-24`)
— et cette date **ne figure pas dans le corps** du document.

C'est ce choix qui réalise « une période, un menu » : deux enregistrements sur la même date
écrivent le même document, sans qu'aucun garde applicatif n'ait à comparer quoi que ce soit, et
`remove(dateDebut)` n'a rien à chercher. Répéter la date dans le corps ouvrirait la porte à deux
vérités contradictoires sur la période d'un même menu.

Trois corollaires :

- les repas restent indexés par **décalage** (`jour: 0..13`), comme l'entité. Une date par repas
  serait dérivable de la date de début, donc redondante — et pourrait la contredire ;
- `findAllStartDates()` rend **les identifiants seuls**. Charger le contenu de tout l'historique
  pour décider quoi purger serait payer une lecture complète à chaque enregistrement ;
- l'adapter **ne filtre rien**. La rétention est une règle, elle appartient au domaine ; un adapter
  qui écarterait les périodes trop vieilles priverait le domaine de ce qu'il doit effacer, et
  l'historique enflerait sans que rien ne le signale.

**L'ordre du use-case porte une règle** : `saveMenuUseCase` enregistre le menu **puis** fait le
ménage (fenêtre glissante de deux mois, comptée depuis **aujourd'hui**, pas depuis le menu écrit).
Une panne de l'entretien — lecture des périodes ou effacement — ne coûte pas son menu à
l'utilisateur, et le ménage sera refait au prochain enregistrement. Une panne de l'**écriture**,
elle, remonte : il n'y a rien à masquer.

Le menu qu'on vient d'écrire traverse le même inventaire que les autres, sans traitement de
faveur. C'est une **absence** de branche, pas une branche.

## La mesure

Aucune mesure chiffrée : c'est une décision de modélisation, prise contre l'alternative « date en
double, dans la clé et dans le corps » et contre « identifiant technique + champ date », qui
auraient toutes deux exigé un garde d'unicité applicatif. Constaté, non mesuré.

## Conséquences

- La rétention est **ancrée sur aujourd'hui** : un menu qui démarrerait dans le passé serait
  enregistré puis purgé dans la foulée — un succès qui ne conserve rien. C'est la raison du
  plancher de la date de début ([ADR 0008](0008-l-horloge-ne-promet-rien-entre-deux-lectures.md)).
- Les doubles de `MenuRepository` doivent clé sur la **chaîne ISO**, jamais sur l'objet
  `CalendarDate` : une `Map` clée sur l'objet distinguerait deux 5 janvier construits séparément
  et accepterait deux menus sur la même période — exactement ce que le port interdit.
- La forme du document épouse l'entité plutôt que de l'aplatir (`slots: [{ recipeId }]` et non
  `slots: ['recipe-1']`) : écraser un slot en chaîne encoderait dans `data/` une décision de
  modélisation que le domaine n'a pas prise.
