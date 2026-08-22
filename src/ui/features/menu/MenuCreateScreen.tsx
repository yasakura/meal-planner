import { styled } from 'styled-components';
import { Link } from 'react-router-dom';

import { tokens } from '../../theme/tokens';
import { type MenuDay } from './menu-days';
import { type MenuSaveNotice } from './menu-notice';
import { MenuDays, MenuSaveNoticeView, MenuSpinner, MenuUnavailable } from './MenuScreen';

const { colors, space, fonts } = tokens;

export type MenuCreateScreenProps = {
  startDateIso: string;
  startDateFloorIso: string;
  startDateRefused: boolean;
  onStartDateChange: (iso: string) => void;
  selectedDays: number;
  onSelect: (days: number) => void;
  body: MenuCreateBodyProps;
};

export type MenuCreateBodyProps =
  | { status: 'form'; saveNotice: MenuSaveNotice | null; onGenerate: () => void }
  | { status: 'loading' }
  | { status: 'error'; message: string; onRetry: () => void }
  | { status: 'unavailable'; message: string }
  | {
      status: 'draft';
      days: MenuDay[];
      saveNotice: MenuSaveNotice | null;
      saveDisabled: boolean;
      onRegenerate: () => void;
      onSave: () => void;
    };

const Page = styled.div`
  flex: 1;
  background: ${colors.creme};
  display: flex;
  flex-direction: column;
  padding: ${space.lg}px;
`;

const BackLink = styled(Link)`
  font-family: ${fonts.body};
  font-size: 14px;
  color: ${colors.inkSecondary};
  text-decoration: none;
  margin-bottom: ${space.lg}px;
`;

const Title = styled.h1`
  font-family: ${fonts.serif};
  font-size: 28px;
  color: ${colors.ink};
  margin: 0 0 ${space.xl}px;
`;

const Segmented = styled.div`
  align-self: flex-start;
  display: inline-flex;
  border: 1px solid ${colors.hairline};
  border-radius: ${tokens.radii.sm};
  overflow: hidden;
  margin-bottom: ${space.lg}px;
`;

const Segment = styled.button<{ $active: boolean }>`
  background: ${(props) => (props.$active ? colors.terracotta : 'transparent')};
  color: ${(props) => (props.$active ? colors.creme : colors.inkSecondary)};
  border: none;
  font-family: ${fonts.body};
  font-size: 14px;
  padding: ${space.sm}px ${space.lg}px;
`;

const Field = styled.div`
  align-self: flex-start;
  display: flex;
  flex-direction: column;
  gap: ${space.xs}px;
  margin-bottom: ${space.lg}px;
`;

const FieldLabel = styled.label`
  font-family: ${fonts.body};
  font-size: 13px;
  color: ${colors.inkSecondary};
`;

const DateInput = styled.input`
  background: transparent;
  border: 1px solid ${colors.hairline};
  border-radius: ${tokens.radii.sm};
  color: ${colors.ink};
  font-family: ${fonts.body};
  font-size: 15px;
  padding: ${space.sm}px ${space.md}px;
`;

const FieldNotice = styled.p`
  font-family: ${fonts.body};
  font-size: 13px;
  color: ${colors.terracotta};
  margin: 0;
  max-width: 320px;
`;

const START_DATE_FIELD_ID = 'menu-start-date';

function StartDatePicker(props: {
  value: string;
  min: string;
  refused: boolean;
  onChange: (iso: string) => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={START_DATE_FIELD_ID}>Début du menu</FieldLabel>
      <DateInput
        id={START_DATE_FIELD_ID}
        type="date"
        value={props.value}
        min={props.min}
        onChange={(event) => props.onChange(event.target.value)}
      />
      {props.refused ? (
        <FieldNotice role="alert">Le menu ne peut pas commencer avant aujourd’hui.</FieldNotice>
      ) : null}
    </Field>
  );
}

const MENU_WINDOWS: { days: number; label: string }[] = [
  { days: 7, label: '1 semaine' },
  { days: 14, label: '2 semaines' },
];

function WindowSelector(props: { selectedDays: number; onSelect: (days: number) => void }) {
  return (
    <Segmented role="group" aria-label="Fenêtre du menu">
      {MENU_WINDOWS.map((window) => (
        <Segment
          key={window.days}
          type="button"
          $active={props.selectedDays === window.days}
          aria-pressed={props.selectedDays === window.days}
          onClick={() => props.onSelect(window.days)}
        >
          {window.label}
        </Segment>
      ))}
    </Segmented>
  );
}

const PrimaryButton = styled.button`
  align-self: flex-start;
  background: ${colors.terracotta};
  border: none;
  border-radius: ${tokens.radii.sm};
  color: ${colors.creme};
  font-family: ${fonts.body};
  font-size: 15px;
  padding: ${space.sm}px ${space.lg}px;

  &:disabled {
    opacity: 0.6;
  }
`;

const Actions = styled.div`
  align-self: flex-start;
  display: flex;
  gap: ${space.sm}px;
`;

const RetryButton = styled.button`
  background: none;
  border: 1px solid ${colors.hairline};
  border-radius: ${tokens.radii.sm};
  color: ${colors.ink};
  font-family: ${fonts.body};
  font-size: 14px;
  padding: ${space.sm}px ${space.md}px;
`;

const ErrorBox = styled.div`
  flex: 1;
  justify-content: center;
  display: flex;
  flex-direction: column;
  gap: ${space.md}px;
  align-items: flex-start;
`;

const ErrorMessage = styled.p`
  font-family: ${fonts.body};
  font-size: 14px;
  color: ${colors.terracotta};
  margin: 0;
`;

const Intro = styled.p`
  font-family: ${fonts.body};
  font-size: 14px;
  color: ${colors.inkSecondary};
  margin: 0 0 ${space.lg}px;
  max-width: 320px;
`;

function Reglages(props: MenuCreateScreenProps) {
  return (
    <>
      <StartDatePicker
        value={props.startDateIso}
        min={props.startDateFloorIso}
        refused={props.startDateRefused}
        onChange={props.onStartDateChange}
      />
      <WindowSelector selectedDays={props.selectedDays} onSelect={props.onSelect} />
    </>
  );
}

function Body(props: MenuCreateScreenProps) {
  const body = props.body;
  switch (body.status) {
    case 'form':
      return (
        <>
          <Intro>Génère un menu à partir de tes recettes.</Intro>
          <Reglages {...props} />
          <PrimaryButton type="button" onClick={body.onGenerate}>
            Générer un menu
          </PrimaryButton>
          <MenuSaveNoticeView notice={body.saveNotice} />
        </>
      );
    case 'loading':
      return <MenuSpinner />;
    case 'error':
      return (
        <ErrorBox>
          <ErrorMessage role="alert">{body.message}</ErrorMessage>
          <RetryButton type="button" onClick={body.onRetry}>
            Réessayer
          </RetryButton>
        </ErrorBox>
      );
    case 'unavailable':
      return <MenuUnavailable message={body.message} />;
    case 'draft':
      return (
        <>
          <MenuDays days={body.days} />
          <Reglages {...props} />
          <Actions>
            <PrimaryButton type="button" onClick={body.onRegenerate}>
              Régénérer
            </PrimaryButton>
            <PrimaryButton type="button" onClick={body.onSave} disabled={body.saveDisabled}>
              Enregistrer
            </PrimaryButton>
          </Actions>
          <MenuSaveNoticeView notice={body.saveNotice} />
        </>
      );
  }
}

export function MenuCreateScreen(props: MenuCreateScreenProps) {
  return (
    <Page>
      <BackLink to="/menu">← Menu</BackLink>
      <Title>Nouveau menu</Title>
      <Body {...props} />
    </Page>
  );
}
