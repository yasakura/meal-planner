import { styled, keyframes } from 'styled-components';
import { Link } from 'react-router-dom';

import { tokens } from '../../theme/tokens';

const { colors, space, fonts } = tokens;

export type RecipeDetailIngredient = { name: string; quantity: string };

export type RecipeDetailScreenProps =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'notFound' }
  | {
      status: 'loaded';
      title: string;
      convivesLabel: string;
      ingredients: RecipeDetailIngredient[];
      instructions: string | null;
    };

const Page = styled.div`
  min-height: 100dvh;
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
  margin: 0 0 ${space.sm}px;
`;

const Convives = styled.p`
  font-family: ${fonts.body};
  font-size: 14px;
  color: ${colors.inkSecondary};
  margin: 0 0 ${space.xl}px;
`;

const SectionTitle = styled.h2`
  font-family: ${fonts.serif};
  font-size: 20px;
  color: ${colors.ink};
  margin: 0 0 ${space.md}px;
`;

const List = styled.ul`
  list-style: none;
  margin: 0 0 ${space.xl}px;
  padding: 0;
`;

const IngredientItem = styled.li`
  display: flex;
  justify-content: space-between;
  gap: ${space.md}px;
  padding: ${space.sm}px 0;
  border-bottom: 1px solid ${colors.hairline};
`;

const IngredientName = styled.span`
  font-family: ${fonts.body};
  font-size: 15px;
  color: ${colors.ink};
`;

const IngredientQuantity = styled.span`
  font-family: ${fonts.body};
  font-size: 15px;
  color: ${colors.inkSecondary};
`;

const Instructions = styled.p`
  font-family: ${fonts.body};
  font-size: 15px;
  line-height: 1.5;
  color: ${colors.ink};
  white-space: pre-wrap;
  margin: 0;
`;

const NoInstructions = styled.p`
  font-family: ${fonts.body};
  font-size: 14px;
  color: ${colors.inkSecondary};
  font-style: italic;
  margin: 0;
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

const ErrorText = styled.p`
  font-family: ${fonts.body};
  font-size: 14px;
  color: ${colors.terracotta};
  margin: 0;
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

function Body(props: RecipeDetailScreenProps) {
  switch (props.status) {
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
          <StateText>Chargement…</StateText>
        </CenteredState>
      );
    case 'error':
      return (
        <CenteredState>
          <ErrorText role="alert">{props.message}</ErrorText>
        </CenteredState>
      );
    case 'notFound':
      return (
        <CenteredState>
          <StateText role="alert">Recette introuvable</StateText>
        </CenteredState>
      );
    case 'loaded':
      return (
        <>
          <Title>{props.title}</Title>
          <Convives>{props.convivesLabel}</Convives>

          <SectionTitle>Ingrédients</SectionTitle>
          <List>
            {props.ingredients.map((ingredient, index) => (
              <IngredientItem key={index}>
                <IngredientName>{ingredient.name}</IngredientName>
                <IngredientQuantity>{ingredient.quantity}</IngredientQuantity>
              </IngredientItem>
            ))}
          </List>

          <SectionTitle>Préparation</SectionTitle>
          {props.instructions !== null ? (
            <Instructions>{props.instructions}</Instructions>
          ) : (
            <NoInstructions>Aucune préparation</NoInstructions>
          )}
        </>
      );
    default:
      return null;
  }
}

export function RecipeDetailScreen(props: RecipeDetailScreenProps) {
  return (
    <Page>
      <BackLink to="/catalogue">← Recettes</BackLink>
      <Body {...props} />
    </Page>
  );
}
