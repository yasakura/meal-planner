import { styled } from 'styled-components';

import { useAppDispatch, useAppSelector } from './store/hooks';
import { tokens } from './theme/tokens';
import { LINK_LOST_NOTICE } from './link-lost-notice';
import { catalogueRetried, selectCatalogueLinkLost } from './features/catalogue/catalogue-slice';
import { convivesRetried, selectConvivesLinkLost } from './features/convives/convives-slice';

const { colors, fonts, radii, space } = tokens;

const Banner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space.md}px;
  padding: ${space.sm}px ${space.lg}px;
  background: ${colors.ink};
`;

const Message = styled.p`
  margin: 0;
  font-family: ${fonts.body};
  font-size: 13px;
  color: ${colors.creme};
`;

const RetryButton = styled.button`
  flex-shrink: 0;
  min-height: 32px;
  padding: ${space.xs}px ${space.md}px;
  background: transparent;
  border: 1px solid ${colors.creme};
  border-radius: ${radii.full};
  color: ${colors.creme};
  font-family: ${fonts.body};
  font-size: 13px;
`;

export function LinkBanner() {
  const catalogueLost = useAppSelector(selectCatalogueLinkLost);
  const convivesLost = useAppSelector(selectConvivesLinkLost);
  const dispatch = useAppDispatch();

  if (!catalogueLost && !convivesLost) return null;

  const retry = () => {
    dispatch(catalogueRetried());
    dispatch(convivesRetried());
  };

  return (
    <Banner role="status">
      <Message>{LINK_LOST_NOTICE}</Message>
      <RetryButton type="button" onClick={retry}>
        Réessayer
      </RetryButton>
    </Banner>
  );
}
