import styled from 'styled-components';

import { tokens } from '../../theme/tokens';

const { colors, radii, space, fonts } = tokens;

export type LoginScreenProps = {
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  submitDisabled: boolean;
  submitLabel: string;
  errorMessage: string | null;
};

const Page = styled.div`
  min-height: 100dvh;
  background: ${colors.creme};
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: ${space.lg}px;
`;

const Title = styled.h1`
  font-family: ${fonts.serif};
  font-size: 28px;
  color: ${colors.ink};
  margin: 0 0 ${space.xs}px;
`;

const Subtitle = styled.p`
  font-family: ${fonts.body};
  font-size: 14px;
  color: ${colors.inkSecondary};
  margin: 0 0 ${space.xl}px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${space.md}px;
`;

const Label = styled.label`
  font-family: ${fonts.body};
  font-size: 13px;
  color: ${colors.inkSecondary};
  margin-bottom: ${space.xs}px;
  display: block;
`;

const Input = styled.input`
  width: 100%;
  box-sizing: border-box;
  background: ${colors.sand};
  border: none;
  border-radius: ${radii.sm};
  padding: ${space.md}px;
  font-family: ${fonts.body};
  font-size: 16px;
  color: ${colors.ink};
`;

const SubmitButton = styled.button`
  width: 100%;
  background: ${colors.terracotta};
  color: ${colors.white};
  border: none;
  border-radius: ${radii.sm};
  padding: ${space.md}px;
  font-family: ${fonts.body};
  font-size: 16px;
  margin-top: ${space.sm}px;

  &:disabled {
    opacity: 0.6;
  }
`;

const ErrorMessage = styled.p`
  font-family: ${fonts.body};
  font-size: 14px;
  color: ${colors.terracotta};
  margin: ${space.sm}px 0 0;
`;

const Field = styled.div``;

export function LoginScreen(props: LoginScreenProps) {
  return (
    <Page>
      <Title>Meal Planner</Title>
      <Subtitle>Le menu du foyer</Subtitle>

      <Form
        onSubmit={(event) => {
          event.preventDefault();
          props.onSubmit();
        }}
      >
        <Field>
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            value={props.email}
            onChange={(event) => props.onEmailChange(event.target.value)}
          />
        </Field>

        <Field>
          <Label htmlFor="login-password">Mot de passe</Label>
          <Input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={props.password}
            onChange={(event) => props.onPasswordChange(event.target.value)}
          />
        </Field>

        <SubmitButton type="submit" disabled={props.submitDisabled}>
          {props.submitLabel}
        </SubmitButton>

        {props.errorMessage !== null && (
          <ErrorMessage role="alert">{props.errorMessage}</ErrorMessage>
        )}
      </Form>
    </Page>
  );
}
