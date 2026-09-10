# ADR 0047 — Un classement de finding se périme

- **Statut** : en vigueur
- **Date** : 2026-08-25
- **Portée** : `CLAUDE.md`, section « Règle d'arrêt »
- **Issue** : [#138](https://github.com/yasakura/meal-planner/issues/138)

## Contexte

La règle d'arrêt classe chaque finding sur deux axes — introduit ou pré-existant, bloquant ou non
bloquant — et seul un défaut introduit ou bloquant maintient une branche ouverte. Sans cette règle,
une revue trouvant toujours quelque chose, aucune branche ne se fermerait jamais.

Le classement est fait **au moment où le finding est trouvé**, sur l'état du code de ce moment-là.
Il est ensuite écrit dans une issue et n'est plus relu.

## La mesure

L'issue [#138](https://github.com/yasakura/meal-planner/issues/138) classait un défaut **non
bloquant** le matin : un bandeau d'information pouvait être recouvert par une modale.

**Quatre heures plus tard**, il était le **seul bloquant de la journée**. Entre-temps, un lot avait
fait de ce bandeau le seul endroit annonçant une **donnée perdue**. Le défaut n'avait pas changé ;
le travail confié au mécanisme, si.

## Décision

Un classement vaut pour l'état du code au moment où il est posé, et **se périme quand un lot confie
un nouveau travail au mécanisme concerné**.

Au démarrage d'un lot : lister les issues ouvertes qui nomment les fichiers qu'on va toucher — elles
portent déjà leurs références `fichier:ligne`, c'est un `grep` — et **relire leur classement**.

## Conséquences

- **Le coût est d'un `grep` par lot**, et il est payé au démarrage, là où il oriente encore le
  travail. Relu à la fin, il ne sert plus à rien.
- C'est la règle qui rend la référence `fichier:ligne` d'une issue **utile et pas seulement
  documentaire** : elle est ce que le `grep` interroge.
- Un défaut latent n'est pas un défaut mineur. Il est en attente d'un appelant, exactement comme
  `effectiveIngredients` l'a été pendant des mois avant que
  [ADR 0039](0039-un-seul-plafond-celui-du-compte-juste.md) ne révèle ce qu'il rendait de faux.
- La règle **ne rouvre pas** une branche fermée : elle change le classement d'un finding **avant**
  que le lot suivant ne commence.
