import styled from 'styled-components';

import { tokens } from '../../theme/tokens';

const { colors, radii, space, fonts } = tokens;

export type ConviveItem = { id: string; name: string };

/**
 * Issue d'un ajout qui n'a pas abouti. `error` = le serveur a refusé, l'utilisateur peut
 * agir. `unconfirmed` = le serveur n'a rien acquitté, il n'y a rien à faire d'utile —
 * d'où deux tons, et deux rôles ARIA distincts.
 * Un seul objet nullable plutôt que deux messages nullables : au plus un constat à la fois,
 * et l'état invalide « les deux à la fois » devient irreprésentable.
 */
export type AddNotice = { tone: 'error' | 'unconfirmed'; message: string };

// Le formulaire d'ajout accompagne tous les états « chargés » (liste ou foyer vide) ;
// les états transitoires (chargement, erreur, hors-ligne) n'exposent que leur constat.
//
// ANGLE MORT ACCEPTÉ. `addNotice` vit dans le formulaire, donc il disparaît avec lui : si un
// rechargement concurrent échoue pendant qu'un ajout est en vol, l'issue de cet ajout devient
// invisible jusqu'au prochain chargement réussi. L'écran est alors INCOMPLET, pas faux — le
// chargement a réellement échoué et c'est ce qu'il dit. Rendre le constat dans `unavailable`
// contredirait la décision d'y masquer le formulaire, prise pour ne pas inviter la re-saisie
// qui produit les doublons. Aucun doublon possible ici : le prochain chargement resynchronise
// depuis le serveur, et le convive apparaît s'il a été écrit.
export type ConvivesSectionProps = {
  name: string;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
  submitDisabled: boolean;
  // Verrou du champ, volontairement séparé de `submitDisabled` : le bouton se verrouille
  // aussi sur un ajout non confirmé, le champ jamais — la frappe est le mécanisme de
  // récupération. Deux props, parce que ce sont deux règles.
  inputDisabled: boolean;
  addNotice: AddNotice | null;
} & (
  | { status: 'loading' }
  | { status: 'error'; message: string; onRetry: () => void }
  // Hors ligne : un constat, sans « Réessayer » — le bouton ne ferait que rejouer le même
  // échec tant que le réseau manque. C'est ce qui distingue cet état de `error`, où le
  // réessai a du sens.
  | { status: 'unavailable'; message: string }
  | { status: 'empty' }
  | { status: 'loaded'; convives: ConviveItem[] }
);

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${space.sm}px;
`;

const Title = styled.h3`
  font-family: ${fonts.serif};
  font-size: 17px;
  color: ${colors.ink};
  margin: 0;
`;

// Constat neutre (chargement, foyer vide, échec) : même teinte secondaire pour tous les états,
// aucun rouge d'alerte — un état n'est pas un jugement.
const Note = styled.p`
  font-family: ${fonts.body};
  font-size: 13px;
  color: ${colors.inkSecondary};
  margin: 0;
`;

const RetryButton = styled.button`
  align-self: flex-start;
  background: transparent;
  border: 1px solid ${colors.hairline};
  border-radius: ${radii.sm};
  color: ${colors.ink};
  font-family: ${fonts.body};
  font-size: 13px;
  padding: ${space.sm}px ${space.md}px;
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const Row = styled.li`
  font-family: ${fonts.body};
  font-size: 15px;
  color: ${colors.ink};
  padding: ${space.sm}px 0;

  & + & {
    border-top: 1px solid ${colors.hairline};
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${space.xs}px;
`;

const Label = styled.label`
  font-family: ${fonts.body};
  font-size: 13px;
  color: ${colors.inkSecondary};
`;

const FieldRow = styled.div`
  display: flex;
  gap: ${space.sm}px;
`;

const Input = styled.input`
  flex: 1;
  min-width: 0;
  min-height: 44px;
  box-sizing: border-box;
  background: ${colors.sand};
  border: none;
  border-radius: ${radii.sm};
  padding: 0 ${space.md}px;
  font-family: ${fonts.body};
  /* 16px : en dessous, iOS zoome au focus. */
  font-size: 16px;
  color: ${colors.ink};
`;

const SubmitButton = styled.button`
  min-height: 44px;
  background: ${colors.terracotta};
  color: ${colors.white};
  border: none;
  border-radius: ${radii.sm};
  padding: 0 ${space.lg}px;
  font-family: ${fonts.body};
  font-size: 14px;

  &:disabled {
    opacity: 0.6;
  }
`;

function AddForm(props: ConvivesSectionProps) {
  return (
    <Form
      onSubmit={(event) => {
        event.preventDefault();
        props.onSubmit();
      }}
    >
      <Label htmlFor="convive-name">Prénom</Label>
      <FieldRow>
        <Input
          id="convive-name"
          name="convive-name"
          type="text"
          value={props.name}
          disabled={props.inputDisabled}
          onChange={(event) => props.onNameChange(event.target.value)}
        />
        <SubmitButton type="submit" disabled={props.submitDisabled}>
          Ajouter
        </SubmitButton>
      </FieldRow>
      {props.addNotice !== null && (
        <Note role={props.addNotice.tone === 'error' ? 'alert' : 'status'}>
          {props.addNotice.message}
        </Note>
      )}
    </Form>
  );
}

function Body(props: ConvivesSectionProps) {
  switch (props.status) {
    case 'loading':
      return <Note role="status">Chargement…</Note>;
    case 'error':
      return (
        <>
          <Note role="alert">{props.message}</Note>
          <RetryButton type="button" onClick={props.onRetry}>
            Réessayer
          </RetryButton>
        </>
      );
    // `role="status"` (poli) et non `role="alert"` (assertif) : une absence de réseau est un
    // constat, pas une alerte, et rien n'est attendu de l'utilisateur dans l'immédiat.
    case 'unavailable':
      return <Note role="status">{props.message}</Note>;
    case 'empty':
      return (
        <>
          <Note>Personne dans le foyer pour le moment.</Note>
          <AddForm {...props} />
        </>
      );
    case 'loaded':
      return (
        <>
          <List>
            {props.convives.map((convive) => (
              <Row key={convive.id}>{convive.name}</Row>
            ))}
          </List>
          <AddForm {...props} />
        </>
      );
  }
}

export function ConvivesSection(props: ConvivesSectionProps) {
  return (
    <Section>
      <Title>Foyer</Title>
      <Body {...props} />
    </Section>
  );
}
