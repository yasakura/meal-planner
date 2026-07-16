import { styled } from 'styled-components';

import { tokens } from './theme/tokens';

const { colors, space, fonts } = tokens;

export type TopBarProps = {
  onAccountClick: () => void;
};

const Bar = styled.header`
  height: 52px;
  background: ${colors.white};
  border-bottom: 1px solid ${colors.hairline};
  padding: 0 ${space.lg}px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Brand = styled.span`
  font-family: ${fonts.serif};
  font-size: 22px;
  color: ${colors.ink};
`;

const AccountButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  margin-right: -${space.md}px;
  background: none;
  border: none;
  color: ${colors.inkSecondary};
  cursor: pointer;
`;

export function TopBar({ onAccountClick }: TopBarProps) {
  return (
    <Bar>
      <Brand>Meal Planner</Brand>
      <AccountButton type="button" aria-label="Compte" onClick={onAccountClick}>
        <svg
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx={12} cy={8} r={4} />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      </AccountButton>
    </Bar>
  );
}
