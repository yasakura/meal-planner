import { useState } from 'react';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { LoginScreen } from './LoginScreen';
import { selectAuth, signIn } from './auth-slice';

export function LoginContainer() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { status } = useAppSelector(selectAuth);
  const dispatch = useAppDispatch();

  const submitDisabled = email === '' || password === '' || status === 'loading';
  const submitLabel = status === 'loading' ? 'Connexion…' : 'Se connecter';
  const errorMessage = status === 'error' ? 'Email ou mot de passe incorrect.' : null;

  return (
    <LoginScreen
      email={email}
      password={password}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={() => dispatch(signIn({ email, password }))}
      submitDisabled={submitDisabled}
      submitLabel={submitLabel}
      errorMessage={errorMessage}
    />
  );
}
