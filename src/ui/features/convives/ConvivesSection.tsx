import styled from 'styled-components';

import { tokens } from '../../theme/tokens';
import { type ConviveRow } from './convives-slice';

const { colors, radii, space, fonts } = tokens;

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

export type AddNotice = { tone: 'error'; message: string };

export type ConvivesSectionProps = {
  name: string;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
  submitDisabled: boolean;
  inputDisabled: boolean;
  addNotice: AddNotice | null;
} & (
  | { status: 'loading' }
  | { status: 'error'; message: string; onRetry: () => void }
  | { status: 'unavailable'; message: string; onRetry: () => void }
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
  overflow-wrap: anywhere;
`;

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
      {props.addNotice !== null && <Note role="alert">{props.addNotice.message}</Note>}
    </Form>
  );
}

function RowNoticeView({ notice }: { notice: ConviveRow['notice'] }) {
  if (notice === null) return null;
  return <Note role="alert">{notice.message}</Note>;
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
        <RowName data-testid="convive-name">{row.name}</RowName>
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
    case 'unavailable':
      return (
        <>
          <Note role="status">{props.message}</Note>
          <RetryButton type="button" onClick={props.onRetry}>
            Réessayer
          </RetryButton>
        </>
      );
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
