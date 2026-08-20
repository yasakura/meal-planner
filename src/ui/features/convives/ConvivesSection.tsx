import styled from 'styled-components';

import { tokens } from '../../theme/tokens';
import { type ConviveRow } from './convives-slice';

const { colors, radii, space, fonts } = tokens;

/**
 * Gestes possibles sur une ligne. Le composant ne décide RIEN : il rapporte le geste et
 * affiche ce que `selectConviveRows` a décidé (mode, constat, verrous) — ce sélecteur vit
 * dans un `.ts` que la mutation couvre, ce fichier non.
 */
export type ConviveRowActions = {
  renameDraft: string;
  onRenameDraftChange: (value: string) => void;
  onRenameSubmit: (id: string) => void;
  onEditRequest: (id: string) => void;
  onEditCancel: () => void;
  onRemoveRequest: (id: string) => void;
  onRemoveConfirm: (id: string) => void;
  onRemoveCancel: () => void;
};

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
  // Verrou du champ, volontairement séparé de `submitDisabled` : le bouton se verrouille aussi
  // sur une saisie vide, le champ jamais. Deux props, parce que ce sont deux règles.
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
  | { status: 'loaded'; convives: ConviveRow[]; rowActions: ConviveRowActions }
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
  display: flex;
  flex-direction: column;
  gap: ${space.xs}px;
  font-family: ${fonts.body};
  font-size: 15px;
  color: ${colors.ink};
  padding: ${space.sm}px 0;

  & + & {
    border-top: 1px solid ${colors.hairline};
  }
`;

const RowLine = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.sm}px;
`;

const RowName = styled.span`
  flex: 1;
  min-width: 0;
  /* Mesuré à 393 px : sans ceci, un prénom plus long que sa boîte s'affichait PAR-DESSUS les
     boutons. Il passe désormais à la ligne, la rangée grandit — on ne tronque pas, le seul
     contenu de cet écran est une liste de prénoms. */
  overflow-wrap: anywhere;
`;

// Bouton d'action de ligne : discret, tactile (44 px), sans couleur d'alarme — retirer un
// convive est un geste ordinaire du foyer, pas un danger à signaler en rouge.
const RowButton = styled.button`
  flex: none;
  min-height: 44px;
  background: transparent;
  border: 1px solid ${colors.hairline};
  border-radius: ${radii.sm};
  color: ${colors.ink};
  font-family: ${fonts.body};
  font-size: 13px;
  padding: 0 ${space.md}px;

  &:disabled {
    opacity: 0.6;
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

// Ton du constat → rôle ARIA. `alert` (assertif) seulement quand une action est attendue de
// l'utilisateur ; `status` (poli) pour ce sur quoi il ne peut rien.
function RowNoticeView({ notice }: { notice: ConviveRow['notice'] }) {
  if (notice === null) return null;
  return <Note role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.message}</Note>;
}

function ConviveRowView({ row, actions }: { row: ConviveRow; actions: ConviveRowActions }) {
  if (row.mode === 'editing') {
    return (
      <Row>
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            actions.onRenameSubmit(row.id);
          }}
        >
          <Label htmlFor={`rename-${row.id}`}>Nouveau prénom pour {row.name}</Label>
          <FieldRow>
            <Input
              id={`rename-${row.id}`}
              name={`rename-${row.id}`}
              type="text"
              value={actions.renameDraft}
              disabled={row.editInputDisabled}
              onChange={(event) => actions.onRenameDraftChange(event.target.value)}
            />
            <SubmitButton type="submit" disabled={row.saveDisabled}>
              Enregistrer
            </SubmitButton>
            <RowButton type="button" onClick={actions.onEditCancel}>
              Annuler
            </RowButton>
          </FieldRow>
          <RowNoticeView notice={row.notice} />
        </Form>
      </Row>
    );
  }
  if (row.mode === 'confirming-removal') {
    return (
      <Row>
        {/* Question, pas avertissement : la confirmation existe parce que l'effacement est
            définitif et sans undo, pas pour dramatiser un geste ordinaire. */}
        <Note>Retirer {row.name} du foyer ?</Note>
        <RowLine>
          <RowButton type="button" onClick={actions.onRemoveCancel}>
            Annuler
          </RowButton>
          <RowButton
            type="button"
            disabled={row.confirmDisabled}
            onClick={() => actions.onRemoveConfirm(row.id)}
          >
            Retirer
          </RowButton>
        </RowLine>
        <RowNoticeView notice={row.notice} />
      </Row>
    );
  }
  return (
    <Row>
      <RowLine>
        {/* Le prénom a son propre élément, et son propre point d'accroche : la composition
            du foyer se lit sans passer par le `textContent` de la ligne, que tout contrôle
            ajouté ici pollue. */}
        <RowName data-testid="convive-name">{row.name}</RowName>
        {/* Le prénom est DANS le nom accessible mais PAS dans le libellé visible : « Renommer »
            seul ne dit pas qui on renomme au lecteur d'écran, mais l'y écrire faisait grossir
            le bouton avec le prénom, aux dépens du seul contenu qui compte. Le libellé visible
            reste inclus dans le nom accessible (WCAG 2.5.3). */}
        <RowButton
          type="button"
          aria-label={`Renommer ${row.name}`}
          disabled={row.actionsDisabled}
          onClick={() => actions.onEditRequest(row.id)}
        >
          Renommer
        </RowButton>
        <RowButton
          type="button"
          aria-label={`Retirer ${row.name}`}
          disabled={row.actionsDisabled}
          onClick={() => actions.onRemoveRequest(row.id)}
        >
          Retirer
        </RowButton>
      </RowLine>
      <RowNoticeView notice={row.notice} />
    </Row>
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
              <ConviveRowView key={convive.id} row={convive} actions={props.rowActions} />
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
