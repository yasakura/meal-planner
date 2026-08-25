import { useEffect, useMemo, useState } from 'react';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { ConvivesSection, type ConvivesSectionProps } from './ConvivesSection';
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
} from './convives-slice';

export function ConvivesContainer() {
  const [name, setName] = useState('');
  const convivesState = useAppSelector(selectConvives);
  const { renameDraft } = convivesState;
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
