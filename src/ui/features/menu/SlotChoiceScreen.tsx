import { styled } from 'styled-components';
import { Link } from 'react-router-dom';

import { tokens } from '../../theme/tokens';
import { type BackLink } from '../catalogue/recipe-detail-origin';
import { MenuSpinner } from './MenuScreen';
import { type SlotChoiceItem, type SlotChoiceView } from './slot-choice';

const { colors, space, fonts } = tokens;

export type SlotChoiceScreenProps = {
  view: SlotChoiceView;
  back: BackLink;
  onChoose: (recipeId: string) => void;
  onRetry: () => void;
};

const Page = styled.div`
  flex: 1;
  background: ${colors.creme};
  display: flex;
  flex-direction: column;
  padding: ${space.lg}px;
`;

const BackToDraft = styled(Link)`
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
  margin: 0 0 ${space.xs}px;
`;

const SlotLabel = styled.p`
  font-family: ${fonts.body};
  font-size: 14px;
  color: ${colors.inkSecondary};
  margin: 0 0 ${space.lg}px;
`;

const CenteredState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${space.sm}px;
  padding: ${space.xl}px;
  text-align: center;
`;

const StateText = styled.p`
  font-family: ${fonts.body};
  font-size: 14px;
  color: ${colors.inkSecondary};
  margin: 0;
`;

const StateTitle = styled.p`
  font-family: ${fonts.serif};
  font-size: 22px;
  color: ${colors.ink};
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

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const Row = styled.li`
  border-bottom: 1px solid ${colors.hairline};
`;

const RowButton = styled.button`
  width: 100%;
  background: none;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${space.xs}px;
  padding: ${space.md}px 0;
  text-align: left;
`;

const RowTitle = styled.span`
  font-family: ${fonts.serif};
  font-size: 22px;
  color: ${colors.ink};
`;

const Badge = styled.span`
  font-family: ${fonts.body};
  font-size: 13px;
  color: ${colors.terracotta};
`;

function Choices(props: {
  slotLabel: string;
  recipes: SlotChoiceItem[];
  onChoose: (recipeId: string) => void;
}) {
  return (
    <>
      <SlotLabel>{props.slotLabel}</SlotLabel>
      <List>
        {props.recipes.map((recipe) => (
          <Row key={recipe.id}>
            <RowButton type="button" onClick={() => props.onChoose(recipe.id)}>
              <RowTitle>{recipe.title}</RowTitle>
              {recipe.alreadyUsed ? <Badge>Déjà dans ce menu</Badge> : null}
            </RowButton>
          </Row>
        ))}
      </List>
    </>
  );
}

function Body(props: SlotChoiceScreenProps) {
  const view = props.view;
  switch (view.status) {
    case 'introuvable':
      return (
        <CenteredState>
          <StateText role="status">{view.message}</StateText>
        </CenteredState>
      );
    case 'loading':
      return <MenuSpinner />;
    case 'error':
      return (
        <ErrorBox>
          <ErrorMessage role="alert">{view.message}</ErrorMessage>
          <RetryButton type="button" onClick={props.onRetry}>
            Réessayer
          </RetryButton>
        </ErrorBox>
      );
    case 'unavailable':
      return (
        <CenteredState>
          <StateText role="status">{view.message}</StateText>
          <RetryButton type="button" onClick={props.onRetry}>
            Réessayer
          </RetryButton>
        </CenteredState>
      );
    case 'empty':
      return (
        <CenteredState>
          <StateTitle>Aucune recette</StateTitle>
          <StateText>Crée une recette pour la mettre au menu</StateText>
        </CenteredState>
      );
    case 'loaded':
      return (
        <Choices slotLabel={view.slotLabel} recipes={view.recipes} onChoose={props.onChoose} />
      );
  }
}

export function SlotChoiceScreen(props: SlotChoiceScreenProps) {
  return (
    <Page>
      <BackToDraft to={props.back.href}>{props.back.label}</BackToDraft>
      <Title>Choisir une recette</Title>
      <Body {...props} />
    </Page>
  );
}
