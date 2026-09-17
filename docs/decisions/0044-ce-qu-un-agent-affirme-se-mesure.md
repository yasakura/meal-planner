# ADR 0044 — Ce qu'un agent affirme se mesure, et son banc d'essai aussi

- **Statut** : en vigueur
- **Date** : 2026-08-27 (règles), mesures des 2026-08-20 et 2026-08-27
- **Portée** : `CLAUDE.md`, section « Un garde-fou qu'on n'a jamais vu échouer »

## Contexte

Le dépôt confrontait déjà ses garde-fous et ses instruments de mesure. Il ne confrontait pas ce que
l'agent **dit** — et c'est par là que les erreurs passaient.

Deux familles d'affirmation se sont révélées fausses de façon répétée, et aucune n'a été rattrapée
par un test.

## La mesure — les affirmations

Sur **une seule journée**, le 2026-08-27, **six** affirmations négatives ou de complétude ont été
fausses :

- « je ne peux pas lancer `/code-review` » — il l'avait été **quatre fois dans la même session** ;
- une borne numérique proposée par raisonnement, qu'**aucune source** ne soutenait ;
- « ce lot ferme l'issue #161 », **démenti par une mesure** contre le code réel.

**Aucune n'a été trouvée par l'agent lui-même.** Toutes par une question de l'utilisateur, un
sous-agent, ou une revue.

Le point commun est la **forme** de l'affirmation, pas son sujet : « je ne peux pas », « c'est
couvert », « c'est fermé », « ce n'est pas atteignable », « c'est pré-existant ». Ce sont exactement
celles qu'aucune intuition ne valide, parce qu'elles portent sur une **absence** — et qu'on ne
constate pas une absence par introspection.

## La mesure — les bancs d'essai

Un banc jetable, écrit pour mesurer l'état d'un arbre de travail, a rendu un résultat **faux** et a
failli être rapporté. Cause : `git stash --keep-index` **ne met pas de côté les fichiers non
suivis**. Le banc mesurait donc un arbre pollué par ce qu'il croyait avoir écarté.

Un banc jetable est un instrument. Il n'a ni test ni revue, il est écrit vite, et son résultat part
directement dans un rapport : c'est le maillon le moins gardé de la chaîne.

## Décision

1. **Une affirmation négative ou de complétude se mesure, ou s'annonce explicitement comme non
   vérifiée.** « Non vérifié » est une réponse acceptable ; une affirmation nue ne l'est pas. Le coût
   est d'une phrase.
2. **Un banc d'essai jetable se confronte comme n'importe quel instrument** : à un cas dont la
   réponse est connue d'avance, avant que son résultat ne soit rapporté.
3. **Rien ne se mesure pendant qu'un agent travaille.** Une suite lancée pendant qu'un agent
   travaillait a sorti un flake, et un rouge inexistant a failli être annoncé.

## Conséquences

- **C'est la règle la plus rentable du corpus, et la moins coûteuse à appliquer.** Elle ne demande ni
  outil ni délégation, seulement de nommer l'incertitude au lieu de la taire.
- Elle s'applique à ce document même : quand une ADR ne peut pas re-vérifier un fait au moment de sa
  rédaction, elle le dit à l'endroit où elle le cite.
- **Aucun garde-fou automatique ne peut l'appliquer.** Un lint ne voit pas une phrase fausse dans un
  rapport. C'est une règle tenue par la revue et par l'utilisateur, ce qui la rend fragile — et c'est
  précisément pourquoi son motif doit rester lisible.
- Elle explique la forme de plusieurs mesures du dépôt : l'inventaire des garde-fous
  ([ADR 0043](0043-inventaire-des-garde-fous.md)) refait son instrument après l'avoir vu mentir,
  et [ADR 0042](0042-la-concurrence-de-stryker-est-declaree.md) refuse de rapporter un chiffre
  produit sur une machine occupée.
