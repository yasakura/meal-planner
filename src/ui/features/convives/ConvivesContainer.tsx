import { useEffect, useMemo, useState } from 'react';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { ConvivesSection, type AddNotice, type ConvivesSectionProps } from './ConvivesSection';
import { elidedDe } from './french-elision';
import {
  addConvive,
  conviveEditCancelled,
  conviveEditRequested,
  conviveFormScreenOpened,
  conviveRemovalCancelled,
  conviveRemovalRequested,
  loadConvives,
  removeConvive,
  renameConvive,
  renameDraftEdited,
  conviveRowsOf,
  selectConvives,
  selectIsAddInFlight,
  type ConviveAddStatus,
} from './convives-slice';

// « n'a pas pu être confirmé » et non « n'est pas enregistré » : l'écriture part réellement
// au retour du réseau, donc l'affirmer perdue serait un nouveau mensonge. La phrase reste
// vraie dans les deux issues, et n'emprunte pas le mot « personne » que l'état vide utilise
// au même endroit de la sheet comme négation.
function addNoticeFor(addStatus: ConviveAddStatus, subjectName: string | null): AddNotice | null {
  if (addStatus === 'error') return { tone: 'error', message: 'Impossible d’ajouter le convive.' };
  // `subjectName` est toujours renseigné en `unconfirmed` : le slice le mémorise sur
  // `pending`, qui précède nécessairement `rejected`. Le test de nullité est une exigence du
  // typage, pas un cas atteignable.
  if (addStatus === 'unconfirmed' && subjectName !== null) {
    return {
      tone: 'unconfirmed',
      message: `Aucune connexion — l’ajout ${elidedDe(subjectName)} n’a pas pu être confirmé.`,
    };
  }
  return null;
}

export function ConvivesContainer() {
  const [name, setName] = useState('');
  // `useMemo` et non `useAppSelector` sur la projection : elle construit un tableau neuf à
  // chaque appel, et react-redux re-rendrait en boucle sur une référence toujours différente.
  const convivesState = useAppSelector(selectConvives);
  const { status, convives, addStatus, addSubjectName, renameDraft } = convivesState;
  const isAddInFlight = useAppSelector(selectIsAddInFlight);
  const rows = useMemo(() => conviveRowsOf(convivesState), [convivesState]);
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Un formulaire d'ajout s'ouvre : on le SIGNALE au slice, qui décide seul s'il pose
    // l'identifiant du document à écrire. Le container n'en connaît aucun.
    dispatch(conviveFormScreenOpened());
    dispatch(loadConvives());
  }, [dispatch]);

  const handleSubmit = async () => {
    // dispatch() seul résout aussi bien un fulfilled qu'un rejected : sans ce filtre,
    // un échec viderait le champ exactement comme un succès (faux signal de succès).
    const result = await dispatch(addConvive({ name }));
    if (addConvive.fulfilled.match(result)) setName('');
  };

  // Le container ne DÉCIDE plus rien ici, et ne RETIENT plus rien : il rapporte le geste.
  // Le brouillon vit dans le store — un `useState` se serait vidé au remontage pendant que
  // le store, lui, gardait l'édition ouverte.
  const rowActions = {
    renameDraft,
    onRenameDraftChange: (value: string) => dispatch(renameDraftEdited(value)),
    onRenameSubmit: (id: string) => void dispatch(renameConvive({ id, name: renameDraft })),
    onEditRequest: (id: string) => dispatch(conviveEditRequested(id)),
    onEditCancel: () => dispatch(conviveEditCancelled()),
    onRemoveRequest: (id: string) => dispatch(conviveRemovalRequested(id)),
    onRemoveConfirm: (id: string) => void dispatch(removeConvive({ id })),
    onRemoveCancel: () => dispatch(conviveRemovalCancelled()),
  };

  const form = {
    name,
    onNameChange: setName,
    onSubmit: () => void handleSubmit(),
    // Le verrou vit dans le slice, qui est muté : le temps de l'écriture, et rien de plus. Un
    // ajout non acquitté ne verrouille rien — un second envoi vise le même document.
    submitDisabled: isAddInFlight || name.trim() === '',
    inputDisabled: isAddInFlight,
    addNotice: addNoticeFor(addStatus, addSubjectName),
  };

  let props: ConvivesSectionProps;
  if (status === 'unavailable') {
    props = {
      ...form,
      status: 'unavailable',
      message: 'Aucune connexion — le foyer n’a pas pu être chargé.',
    };
  } else if (status === 'error') {
    props = {
      ...form,
      status: 'error',
      message: 'Impossible de charger les convives.',
      onRetry: () => dispatch(loadConvives()),
    };
  } else if (status === 'success') {
    props =
      convives.length === 0
        ? { ...form, status: 'empty' }
        : { ...form, status: 'loaded', convives: rows, rowActions };
  } else {
    props = { ...form, status: 'loading' };
  }

  return <ConvivesSection {...props} />;
}
