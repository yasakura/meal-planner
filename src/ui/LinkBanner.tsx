import { styled } from 'styled-components';

import { useAppDispatch, useAppSelector } from './store/hooks';
import { tokens } from './theme/tokens';
import { LINK_LOST_NOTICE } from './link-lost-notice';
import { catalogueRetried, selectCatalogueLinkLost } from './features/catalogue/catalogue-slice';
import { convivesRetried, selectConvivesLinkLost } from './features/convives/convives-slice';
import {
  WRITE_REJECTED_NOTICE,
  selectWriteRejected,
  writeRejectionDismissed,
} from './features/writes/write-rejections-slice';

const { colors, fonts, radii, space } = tokens;

const Banner = styled.div`
  position: sticky;
  top: var(--topbar-h);
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: ${space.xs}px;
  padding: ${space.sm}px ${space.lg}px;
  background: ${colors.ink};
`;

const Line = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${space.md}px;
`;

const Message = styled.p`
  margin: 0;
  font-family: ${fonts.body};
  font-size: 13px;
  color: ${colors.creme};
`;

const LineButton = styled.button`
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
  const writeRejected = useAppSelector(selectWriteRejected);
  const dispatch = useAppDispatch();

  const linkLost = catalogueLost || convivesLost;
  if (!linkLost && !writeRejected) return null;

  const retry = () => {
    dispatch(catalogueRetried());
    dispatch(convivesRetried());
  };

  return (
    <Banner role="status">
      {linkLost && (
        <Line>
          <Message>{LINK_LOST_NOTICE}</Message>
          <LineButton type="button" onClick={retry}>
            Réessayer
          </LineButton>
        </Line>
      )}
      {writeRejected && (
        <Line>
          <Message>{WRITE_REJECTED_NOTICE}</Message>
          <LineButton type="button" onClick={() => dispatch(writeRejectionDismissed())}>
            Fermer
          </LineButton>
        </Line>
      )}
    </Banner>
  );
}
