import styled from 'styled-components';

import { useAppDispatch } from '../../store/hooks';
import { tokens } from '../../theme/tokens';
import { signOut } from './auth-slice';

const { colors, radii, space, fonts } = tokens;

const Button = styled.button`
  align-self: flex-start;
  background: transparent;
  color: ${colors.inkSecondary};
  border: 1px solid ${colors.hairline};
  border-radius: ${radii.sm};
  padding: ${space.sm}px ${space.md}px;
  font-family: ${fonts.body};
  font-size: 13px;
`;

export function LogoutButton() {
  const dispatch = useAppDispatch();

  return (
    <Button type="button" onClick={() => dispatch(signOut())}>
      Se déconnecter
    </Button>
  );
}
