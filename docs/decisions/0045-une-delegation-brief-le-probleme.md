# ADR 0045 — Une délégation brief le problème, pas la solution

- **Statut** : en vigueur
- **Date** : 2026-08-25
- **Portée** : `CLAUDE.md`, section « Flux de travail »

## Contexte

L'agent principal orchestre et délègue. La tentation, quand on croit connaître la réponse, est
d'écrire la consigne sous forme de solution — « fais X » — plutôt que de problème — « ceci est cassé,
voilà à quoi on reconnaît que c'est réparé ».

Le sous-agent a le contexte frais, les fichiers sous les yeux et les moyens de mesurer. L'agent qui
délègue a une intuition. Prescrire la forme revient à substituer la seconde aux premiers.

## La mesure

**Trois formes prescrites dans une même journée, fausses les trois fois** :

| Consigne donnée                             | Ce qu'il fallait faire                                             |
| ------------------------------------------- | ------------------------------------------------------------------ |
| « remonter le `z-index` »                   | **Déplacer l'élément** — le remonter recouvrait le champ de saisie |
| « atteignable → rétablir, sinon supprimer » | Supprimer **verrouillait une ligne** pour toute la session         |
| « chaque commit doit être vert isolément »  | Affirmé, puis **vérifié faux**                                     |

Les délégations qui donnaient les **mesures** et le **critère de réparation**, sans prescrire la
forme, ont rendu de meilleures solutions que celles imaginées.

Le troisième cas est le plus instructif : la consigne n'était pas seulement une mauvaise forme, elle
était une **affirmation fausse** — ce que couvre [ADR 0044](0044-ce-qu-un-agent-affirme-se-mesure.md).
Prescrire une solution, c'est affirmer sans mesurer.

## Décision

Une délégation porte **ce qui est cassé** et **à quoi on reconnaît que c'est réparé**. La forme
appartient à celui qui mesure.

Une solution qu'on croit connaître se propose comme **hypothèse à vérifier**, explicitement nommée
comme telle, jamais comme consigne.

## Conséquences

- **Le brief devient plus court, pas plus long.** Décrire un symptôme et un critère tient en deux
  phrases ; décrire une solution demande de la justifier.
- **Le sous-agent peut contredire l'hypothèse**, et c'est le résultat recherché. Une hypothèse
  écartée avec sa mesure vaut mieux qu'une consigne appliquée.
- La règle vaut aussi quand la solution paraît triviale : les trois cas mesurés paraissaient tous
  triviaux au moment où ils ont été prescrits.
- Elle ne dispense pas de donner du **contexte** — fichiers concernés, mesures déjà faites, issues
  ouvertes sur la zone. Briefer le problème n'est pas briefer moins.
