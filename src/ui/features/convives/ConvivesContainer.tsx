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
  convivesRetried,
  convivesViewOf,
  removeConvive,
  renameConvive,
  renameDraftEdited,
  selectConvives,
  selectIsAddInFlight,
  type ConviveAddStatus,
} from './convives-slice';

function addNoticeFor(addStatus: ConviveAddStatus, subjectName: string | null): AddNotice | null {
  if (addStatus === 'error') return { tone: 'error', message: 'Impossible d’ajouter le convive.' };
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
  const convivesState = useAppSelector(selectConvives);
  const { addStatus, addSubjectName, renameDraft } = convivesState;
  const isAddInFlight = useAppSelector(selectIsAddInFlight);
  const view = useMemo(() => convivesViewOf(convivesState), [convivesState]);
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(conviveFormScreenOpened());
  }, [dispatch]);

  const handleSubmit = async () => {
    const result = await dispatch(addConvive({ name }));
    if (addConvive.fulfilled.match(result)) setName('');
  };

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
    submitDisabled: isAddInFlight || name.trim() === '',
    inputDisabled: isAddInFlight,
    addNotice: addNoticeFor(addStatus, addSubjectName),
  };

  let props: ConvivesSectionProps;
  if (view.status === 'unavailable') {
    props = {
      ...form,
      status: 'unavailable',
      message: 'Aucune connexion — le foyer n’a pas pu être chargé.',
      onRetry: () => dispatch(convivesRetried()),
    };
  } else if (view.status === 'error') {
    props = {
      ...form,
      status: 'error',
      message: 'Impossible de charger les convives.',
      onRetry: () => dispatch(convivesRetried()),
    };
  } else if (view.status === 'loaded') {
    props = { ...form, status: 'loaded', convives: view.convives, rowActions };
  } else if (view.status === 'empty') {
    props = { ...form, status: 'empty' };
  } else {
    props = { ...form, status: 'loading' };
  }

  return <ConvivesSection {...props} />;
}
