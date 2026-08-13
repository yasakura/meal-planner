import { useEffect, useState } from 'react';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { ConvivesSection, type AddNotice, type ConvivesSectionProps } from './ConvivesSection';
import { elidedDe } from './french-elision';
import {
  addConvive,
  conviveNameEdited,
  loadConvives,
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
  const { status, convives, addStatus, addSubjectName } = useAppSelector(selectConvives);
  const isAddInFlight = useAppSelector(selectIsAddInFlight);
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
    // Saisir efface le constat d'ajout périmé. Le container ne DÉCIDE rien : il rapporte le
    // geste, le slice tranche (il est le seul des deux à être couvert par la mutation).
    onNameChange: (value: string) => {
      setName(value);
      dispatch(conviveNameEdited());
    },
    onSubmit: () => void handleSubmit(),
    // Verrouillé aussi après un ajout non acquitté : l'écriture est réellement partie et
    // atterrira au retour du réseau. Ré-armer le bouton inviterait un second appui, donc un
    // second id, donc le doublon que tout ceci cherche à éviter. Le verrou se lève dès que
    // l'utilisateur retape quelque chose (`conviveNameEdited`) — pas au remontage, qui n'est
    // pas garanti.
    submitDisabled: addStatus === 'adding' || addStatus === 'unconfirmed' || name.trim() === '',
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
