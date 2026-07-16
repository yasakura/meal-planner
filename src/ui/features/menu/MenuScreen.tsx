import { styled, keyframes } from 'styled-components';

import { tokens } from '../../theme/tokens';

const { colors, space, fonts } = tokens;

export type MenuSlotLine = { key: string; creneauLabel: string; title: string };
export type MenuDay = { key: string; label: string; slots: MenuSlotLine[] };

export type MenuScreenProps =
  | { status: 'idle'; onGenerate: () => void }
  | { status: 'loading' }
  | { status: 'error'; message: string; onRetry: () => void }
  | { status: 'success'; days: MenuDay[]; onRegenerate: () => void };

const Page = styled.div`
  min-height: 100dvh;
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

const PrimaryButton = styled.button`
  align-self: flex-start;
  background: ${colors.terracotta};
  border: none;
  border-radius: ${tokens.radii.sm};
  color: ${colors.creme};
  font-family: ${fonts.body};
  font-size: 15px;
  padding: ${space.sm}px ${space.lg}px;
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

const LoadingText = styled.p`
  font-family: ${fonts.body};
  font-size: 14px;
  color: ${colors.inkSecondary};
  margin: 0;
`;

const ErrorBox = styled.div`
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

function Body(props: MenuScreenProps) {
  switch (props.status) {
    case 'idle':
      return (
        <>
          <Intro>Génère un menu de la semaine à partir de tes recettes.</Intro>
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
          <LoadingText>Génération…</LoadingText>
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
                      <SlotTitle>{slot.title}</SlotTitle>
                    </SlotItem>
                  ))}
                </SlotList>
              </DaySection>
            ))}
          </DayList>
          <PrimaryButton type="button" onClick={props.onRegenerate}>
            Régénérer
          </PrimaryButton>
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
