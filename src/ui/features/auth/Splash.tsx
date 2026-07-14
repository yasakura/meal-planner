import styled from 'styled-components';

import { tokens } from '../../theme/tokens';

const { colors, fonts } = tokens;

const Page = styled.div`
  min-height: 100dvh;
  background: ${colors.creme};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Title = styled.h1`
  font-family: ${fonts.serif};
  font-size: 28px;
  color: ${colors.ink};
  margin: 0;
`;

export function Splash() {
  return (
    <Page role="status" aria-live="polite" aria-label="Chargement">
      <Title>Meal Planner</Title>
    </Page>
  );
}
