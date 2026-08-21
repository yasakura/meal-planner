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
  const { status, convives, addStatus, addSubjectName, renameDraft } = convivesState;
  const isAddInFlight = useAppSelector(selectIsAddInFlight);
  const rows = useMemo(() => conviveRowsOf(convivesState), [convivesState]);
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(conviveFormScreenOpened());
    dispatch(loadConvives());
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
