import { useEffect, useState } from 'react';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { ConvivesSection, type ConvivesSectionProps } from './ConvivesSection';
import { addConvive, loadConvives, selectConvives } from './convives-slice';

export function ConvivesContainer() {
  const [name, setName] = useState('');
  const { status, convives, addStatus } = useAppSelector(selectConvives);
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(loadConvives());
  }, [dispatch]);

  const handleSubmit = async () => {
    // dispatch() seul résout aussi bien un fulfilled qu'un rejected : sans ce filtre,
    // un échec viderait le champ exactement comme un succès (faux signal de succès).
    const result = await dispatch(addConvive({ name }));
    if (addConvive.fulfilled.match(result)) setName('');
  };

  const form = {
    name,
    onNameChange: setName,
    onSubmit: () => void handleSubmit(),
    submitDisabled: addStatus === 'adding' || name.trim() === '',
    addErrorMessage: addStatus === 'error' ? 'Impossible d’ajouter le convive.' : null,
  };

  let props: ConvivesSectionProps;
  if (status === 'error') {
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
        : {
            ...form,
            status: 'loaded',
            convives: convives.map((convive) => ({ id: convive.id, name: convive.name })),
          };
  } else {
    props = { ...form, status: 'loading' };
  }

  return <ConvivesSection {...props} />;
}
