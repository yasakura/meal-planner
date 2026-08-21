import { styled, keyframes } from 'styled-components';
import { Link } from 'react-router-dom';

import { tokens } from '../../theme/tokens';

const { colors, space, fonts } = tokens;

export type RecipeListItem = { id: string; title: string; meta: string };

export type RecipeListScreenProps =
  | { status: 'loading' }
  | { status: 'error'; message: string; onRetry: () => void }
  | { status: 'unavailable'; message: string }
  | { status: 'empty' }
  | { status: 'loaded'; recipes: RecipeListItem[] };

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

const LoadingState = styled(CenteredState)``;

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

const RetryButton = styled.button`
  background: none;
  border: 1px solid ${colors.hairline};
  border-radius: ${tokens.radii.sm};
  color: ${colors.ink};
  font-family: ${fonts.body};
  font-size: 14px;
  padding: ${space.sm}px ${space.md}px;
`;

const EmptyState = styled(CenteredState)`
  color: ${colors.inkSecondary};
`;

const EmptyIcon = styled.svg`
  color: ${colors.hairline};
`;

const EmptyTitle = styled.p`
  font-family: ${fonts.serif};
  font-size: 22px;
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

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const Row = styled.li`
  border-bottom: 1px solid ${colors.hairline};
`;

const RowLink = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: ${space.xs}px;
  padding: ${space.md}px 0;
  text-decoration: none;
`;

const RowTitle = styled.h2`
  font-family: ${fonts.serif};
  font-size: 22px;
  color: ${colors.ink};
  margin: 0;
`;

const RowMeta = styled.p`
  font-family: ${fonts.body};
  font-size: 13px;
  color: ${colors.inkSecondary};
  margin: 0;
`;

function Body(props: RecipeListScreenProps) {
  switch (props.status) {
    case 'loading':
      return (
        <LoadingState role="status">
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
        </LoadingState>
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
            <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H18a2 2 0 0 1 2 2v13.5" />
            <path d="M6 4v14.5" />
            <path d="M4 18.5A1.5 1.5 0 0 1 5.5 17H20" />
            <path d="M20 17v3H5.5A1.5 1.5 0 0 1 4 18.5V5.5" />
          </EmptyIcon>
          <EmptyTitle>Aucune recette</EmptyTitle>
          <EmptyText>Crée ta première recette pour la retrouver ici</EmptyText>
        </EmptyState>
      );
    case 'loaded':
      return (
        <List>
          {props.recipes.map((recipe) => (
            <Row key={recipe.id}>
              <RowLink to={`/catalogue/${recipe.id}`}>
                <RowTitle>{recipe.title}</RowTitle>
                <RowMeta>{recipe.meta}</RowMeta>
              </RowLink>
            </Row>
          ))}
        </List>
      );
  }
}

export function RecipeListScreen(props: RecipeListScreenProps) {
  return (
    <Page>
      <Header>
        <Title>Recettes</Title>
        <AddLink to="/catalogue/nouvelle" aria-label="Ajouter une recette">
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
