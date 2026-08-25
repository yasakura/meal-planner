import { styled, keyframes } from 'styled-components';
import { Link } from 'react-router-dom';

import { tokens } from '../../theme/tokens';
import { type MenuDay, type SlotChoiceLink } from './menu-days';
import { type MenuSaveNotice } from './menu-notice';

const { colors, space, fonts } = tokens;

export type MenuScreenProps =
  | { status: 'loading' }
  | { status: 'error'; message: string; onRetry: () => void }
  | { status: 'unavailable'; message: string; onRetry: () => void }
  | { status: 'empty' }
  | {
      status: 'consultation';
      days: MenuDay[];
      periodLabel: string;
      previousDisabled: boolean;
      nextDisabled: boolean;
      saveNotice: MenuSaveNotice | null;
      onPrevious: () => void;
      onNext: () => void;
    };

const Page = styled.div`
  flex: 1;
  background: ${colors.creme};
  display: flex;
  flex-direction: column;
  padding: ${space.lg}px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${space.xl}px;
`;

const Title = styled.h1`
  font-family: ${fonts.serif};
  font-size: 28px;
  color: ${colors.ink};
  margin: 0;
`;

const AddLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  margin-right: -${space.sm}px;
  color: ${colors.terracotta};
  text-decoration: none;
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

const RetryButton = styled.button`
  background: none;
  border: 1px solid ${colors.hairline};
  border-radius: ${tokens.radii.sm};
  color: ${colors.ink};
  font-family: ${fonts.body};
  font-size: 14px;
  padding: ${space.sm}px ${space.md}px;
`;

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${space.sm}px;
  padding: ${space.xl}px;
  text-align: center;
`;

const EmptyIcon = styled.svg`
  color: ${colors.hairline};
  margin-bottom: ${space.sm}px;
`;

const EmptyTitle = styled.p`
  font-family: ${fonts.serif};
  font-size: 20px;
  color: ${colors.ink};
  margin: 0;
`;

const EmptyText = styled.p`
  font-family: ${fonts.body};
  font-size: 14px;
  color: ${colors.inkSecondary};
  margin: 0;
  max-width: 260px;
`;

const PeriodBar = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space.md}px;
  margin-bottom: ${space.lg}px;
`;

const PeriodLabel = styled.p`
  font-family: ${fonts.serif};
  font-size: 20px;
  color: ${colors.ink};
  margin: 0;
`;

const ArrowButton = styled.button`
  background: none;
  border: 1px solid ${colors.hairline};
  border-radius: ${tokens.radii.sm};
  color: ${colors.ink};
  font-family: ${fonts.body};
  font-size: 20px;
  line-height: 1;
  padding: ${space.xs}px ${space.md}px;

  &:disabled {
    opacity: 0.35;
  }
`;

const Note = styled.p`
  font-family: ${fonts.body};
  font-size: 13px;
  color: ${colors.inkSecondary};
  margin: ${space.sm}px 0 0;
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

const SlotEnd = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.sm}px;
`;

const ChooseLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 32px;
  margin: -${space.xs}px -${space.sm}px -${space.xs}px 0;
  color: ${colors.terracotta};
  text-decoration: none;
`;

function ChooseSlotLink({ choose }: { choose: SlotChoiceLink }) {
  return (
    <ChooseLink to={choose.href} aria-label={choose.label}>
      <svg
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    </ChooseLink>
  );
}

export function MenuDays({ days }: { days: MenuDay[] }) {
  return (
    <DayList>
      {days.map((day) => (
        <DaySection key={day.key}>
          <DayLabel>{day.label}</DayLabel>
          <SlotList>
            {day.slots.map((slot) => (
              <SlotItem key={slot.key}>
                <CreneauLabel>{slot.creneauLabel}</CreneauLabel>
                <SlotEnd>
                  {slot.recipe === 'known' ? (
                    <SlotLink to={slot.href}>{slot.title}</SlotLink>
                  ) : (
                    <SlotTitle>{slot.title}</SlotTitle>
                  )}
                  {slot.choose === null ? null : <ChooseSlotLink choose={slot.choose} />}
                </SlotEnd>
              </SlotItem>
            ))}
          </SlotList>
        </DaySection>
      ))}
    </DayList>
  );
}

export function MenuSpinner() {
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
      <StateText>Chargement…</StateText>
    </CenteredState>
  );
}

export function MenuUnavailable({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <CenteredState>
      <StateText role="status">{message}</StateText>
      <RetryButton type="button" onClick={onRetry}>
        Réessayer
      </RetryButton>
    </CenteredState>
  );
}

export function MenuSaveNoticeView({ notice }: { notice: MenuSaveNotice | null }) {
  if (notice === null) return null;
  return <Note role="status">{notice.message}</Note>;
}

function Body(props: MenuScreenProps) {
  switch (props.status) {
    case 'loading':
      return <MenuSpinner />;
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
      return <MenuUnavailable message={props.message} onRetry={props.onRetry} />;
    case 'empty':
      return (
        <EmptyState>
          <EmptyIcon
            width={64}
            height={64}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x={3} y={5} width={18} height={16} rx={2} />
            <path d="M3 10h18" />
            <path d="M8 3v4" />
            <path d="M16 3v4" />
          </EmptyIcon>
          <EmptyTitle>Aucun menu enregistré</EmptyTitle>
          <EmptyText>Génère ton premier menu pour le retrouver ici</EmptyText>
        </EmptyState>
      );
    case 'consultation':
      return (
        <>
          <PeriodBar>
            <ArrowButton
              type="button"
              aria-label="Menu précédent"
              disabled={props.previousDisabled}
              onClick={props.onPrevious}
            >
              ‹
            </ArrowButton>
            <PeriodLabel>{props.periodLabel}</PeriodLabel>
            <ArrowButton
              type="button"
              aria-label="Menu suivant"
              disabled={props.nextDisabled}
              onClick={props.onNext}
            >
              ›
            </ArrowButton>
          </PeriodBar>
          <MenuSaveNoticeView notice={props.saveNotice} />
          <MenuDays days={props.days} />
        </>
      );
  }
}

export function MenuScreen(props: MenuScreenProps) {
  return (
    <Page>
      <Header>
        <Title>Menu</Title>
        <AddLink to="/menu/nouveau" aria-label="Créer un menu">
          <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </AddLink>
      </Header>
      <Body {...props} />
    </Page>
  );
}
