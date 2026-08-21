import { styled, keyframes } from 'styled-components';
import { Link } from 'react-router-dom';

import { tokens } from '../../theme/tokens';
import { type MenuSaveNotice } from './menu-slice';

const { colors, space, fonts } = tokens;

export type MenuSlotLine =
  | { key: string; creneauLabel: string; title: string; recipe: 'known'; href: string }
  | { key: string; creneauLabel: string; title: string; recipe: 'unknown' };
export type MenuDay = { key: string; label: string; slots: MenuSlotLine[] };

export type MenuScreenProps =
  | {
      status: 'idle';
      startDateIso: string;
      startDateFloorIso: string;
      startDateRefused: boolean;
      onStartDateChange: (iso: string) => void;
      selectedDays: number;
      onSelect: (days: number) => void;
      onGenerate: () => void;
    }
  | { status: 'loading' }
  | { status: 'error'; message: string; onRetry: () => void }
  | { status: 'unavailable'; message: string }
  | {
      status: 'success';
      days: MenuDay[];
      startDateIso: string;
      startDateFloorIso: string;
      startDateRefused: boolean;
      onStartDateChange: (iso: string) => void;
      selectedDays: number;
      onSelect: (days: number) => void;
      onRegenerate: () => void;
      onSave: () => void;
      saveDisabled: boolean;
      saveNotice: MenuSaveNotice | null;
    };

const Page = styled.div`
  flex: 1;
  background: ${colors.creme};
  display: flex;
  flex-direction: column;
  padding: ${space.lg}px;
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

const Note = styled.p`
  font-family: ${fonts.body};
  font-size: 13px;
  color: ${colors.inkSecondary};
  margin: ${space.sm}px 0 0;
`;

function SaveNoticeView({ notice }: { notice: MenuSaveNotice | null }) {
  if (notice === null) return null;
  return <Note role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.message}</Note>;
}

const RetryButton = styled.button`
  background: none;
  border: 1px solid ${colors.hairline};
  border-radius: ${tokens.radii.sm};
  color: ${colors.ink};
  font-family: ${fonts.body};
  font-size: 14px;
  padding: ${space.sm}px ${space.md}px;
`;

const CenteredState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${space.md}px;
  padding: ${space.xl}px;
  text-align: center;
`;

const Intro = styled.p`
  font-family: ${fonts.body};
  font-size: 14px;
  color: ${colors.inkSecondary};
  margin: 0 0 ${space.lg}px;
  max-width: 320px;
`;

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const Spinner = styled.svg`
  width: 40px;
  height: 40px;
  animation: ${spin} 0.8s linear infinite;
`;

const StateText = styled.p`
  font-family: ${fonts.body};
  font-size: 14px;
  color: ${colors.inkSecondary};
  margin: 0;
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

const DayList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.lg}px;
  margin-bottom: ${space.xl}px;
`;

const DaySection = styled.section``;

const DayLabel = styled.h2`
  font-family: ${fonts.serif};
  font-size: 20px;
  color: ${colors.ink};
  margin: 0 0 ${space.sm}px;
`;

const SlotList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const SlotItem = styled.li`
  display: flex;
  justify-content: space-between;
  gap: ${space.md}px;
  padding: ${space.sm}px 0;
  border-bottom: 1px solid ${colors.hairline};
`;

const CreneauLabel = styled.span`
  font-family: ${fonts.body};
  font-size: 13px;
  color: ${colors.inkSecondary};
`;

const SlotTitle = styled.span`
  font-family: ${fonts.body};
  font-size: 15px;
  color: ${colors.ink};
`;

const SlotLink = styled(Link)`
  font-family: ${fonts.body};
  font-size: 15px;
  color: ${colors.ink};
  text-decoration: none;
`;

function Body(props: MenuScreenProps) {
  switch (props.status) {
    case 'idle':
      return (
        <>
          <Intro>Génère un menu à partir de tes recettes.</Intro>
          <StartDatePicker
            value={props.startDateIso}
            min={props.startDateFloorIso}
            refused={props.startDateRefused}
            onChange={props.onStartDateChange}
          />
          <WindowSelector selectedDays={props.selectedDays} onSelect={props.onSelect} />
          <PrimaryButton type="button" onClick={props.onGenerate}>
            Générer un menu
          </PrimaryButton>
        </>
      );
    case 'loading':
      return (
        <CenteredState role="status">
          <Spinner viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx={12} cy={12} r={9} stroke={colors.hairline} strokeWidth={2.5} />
            <path
              d="M12 3a9 9 0 0 1 9 9"
              stroke={colors.terracotta}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          </Spinner>
          <StateText>Génération…</StateText>
        </CenteredState>
      );
    case 'error':
      return (
        <ErrorBox>
          <ErrorMessage role="alert">{props.message}</ErrorMessage>
          <RetryButton type="button" onClick={props.onRetry}>
            Réessayer
          </RetryButton>
        </ErrorBox>
      );
    case 'unavailable':
      return (
        <CenteredState>
          <StateText role="status">{props.message}</StateText>
        </CenteredState>
      );
    case 'success':
      return (
        <>
          <DayList>
            {props.days.map((day) => (
              <DaySection key={day.key}>
                <DayLabel>{day.label}</DayLabel>
                <SlotList>
                  {day.slots.map((slot) => (
                    <SlotItem key={slot.key}>
                      <CreneauLabel>{slot.creneauLabel}</CreneauLabel>
                      {slot.recipe === 'known' ? (
                        <SlotLink to={slot.href}>{slot.title}</SlotLink>
                      ) : (
                        <SlotTitle>{slot.title}</SlotTitle>
                      )}
                    </SlotItem>
                  ))}
                </SlotList>
              </DaySection>
            ))}
          </DayList>
          <StartDatePicker
            value={props.startDateIso}
            min={props.startDateFloorIso}
            refused={props.startDateRefused}
            onChange={props.onStartDateChange}
          />
          <WindowSelector selectedDays={props.selectedDays} onSelect={props.onSelect} />
          <Actions>
            <PrimaryButton type="button" onClick={props.onRegenerate}>
              Régénérer
            </PrimaryButton>
            <PrimaryButton type="button" onClick={props.onSave} disabled={props.saveDisabled}>
              Enregistrer
            </PrimaryButton>
          </Actions>
          <SaveNoticeView notice={props.saveNotice} />
        </>
      );
  }
}

export function MenuScreen(props: MenuScreenProps) {
  return (
    <Page>
      <Title>Menu</Title>
      <Body {...props} />
    </Page>
  );
}
