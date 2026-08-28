import { styled } from 'styled-components';
import { Link } from 'react-router-dom';

import { tokens } from '../../theme/tokens';
import { type BackLink } from '../catalogue/recipe-detail-origin';
import { type LigneDeCoursesAffichee, type ListeDeCoursesView } from './liste-de-courses-view';
import { MenuSpinner } from './MenuScreen';

const { colors, space, fonts } = tokens;

export type ListeDeCoursesScreenProps = ListeDeCoursesView & {
  back: BackLink;
  onRetry: () => void;
};

const Page = styled.div`
  flex: 1;
  background: ${colors.creme};
  display: flex;
  flex-direction: column;
  padding: ${space.lg}px;
`;

const BackAnchor = styled(Link)`
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
  margin: 0 0 ${space.sm}px;
`;

const PeriodLabel = styled.p`
  font-family: ${fonts.body};
  font-size: 14px;
  color: ${colors.inkSecondary};
  margin: 0 0 ${space.lg}px;
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const LigneItem = styled.li`
  display: flex;
  justify-content: space-between;
  gap: ${space.md}px;
  padding: ${space.sm}px 0;
  border-bottom: 1px solid ${colors.hairline};
`;

const LigneName = styled.span`
  font-family: ${fonts.body};
  font-size: 15px;
  color: ${colors.ink};
`;

const LigneQuantity = styled.span`
  font-family: ${fonts.body};
  font-size: 15px;
  color: ${colors.inkSecondary};
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

function Lignes({ lignes }: { lignes: LigneDeCoursesAffichee[] }) {
  return (
    <List>
      {lignes.map((ligne, index) => (
        <LigneItem key={index}>
          <LigneName>{ligne.name}</LigneName>
          <LigneQuantity>{ligne.quantity}</LigneQuantity>
        </LigneItem>
      ))}
    </List>
  );
}

function Body(props: ListeDeCoursesScreenProps) {
  switch (props.status) {
    case 'loading':
      return <MenuSpinner />;
    case 'error':
      return (
        <CenteredState>
          <ErrorMessage role="alert">{props.message}</ErrorMessage>
          <RetryButton type="button" onClick={props.onRetry}>
            Réessayer
          </RetryButton>
        </CenteredState>
      );
    case 'unavailable':
      return (
        <CenteredState>
          <StateText role="status">{props.message}</StateText>
          <RetryButton type="button" onClick={props.onRetry}>
            Réessayer
          </RetryButton>
        </CenteredState>
      );
    case 'notFound':
      return (
        <CenteredState>
          <StateText role="alert">Menu introuvable</StateText>
        </CenteredState>
      );
    case 'empty':
      return (
        <>
          <PeriodLabel>{props.periodLabel}</PeriodLabel>
          <EmptyState>
            <EmptyTitle>Rien à acheter</EmptyTitle>
            <EmptyText>Aucun ingrédient à prévoir pour ce menu</EmptyText>
          </EmptyState>
        </>
      );
    case 'loaded':
      return (
        <>
          <PeriodLabel>{props.periodLabel}</PeriodLabel>
          <Lignes lignes={props.lignes} />
        </>
      );
  }
}

export function ListeDeCoursesScreen(props: ListeDeCoursesScreenProps) {
  return (
    <Page>
      <BackAnchor to={props.back.href}>{props.back.label}</BackAnchor>
      <Title>Liste de courses</Title>
      <Body {...props} />
    </Page>
  );
}
