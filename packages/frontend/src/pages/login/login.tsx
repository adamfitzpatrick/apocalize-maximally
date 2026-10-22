import {
  confirmSignIn,
  confirmSignUp,
  signIn,
  signUp
} from '@aws-amplify/auth';
import { Alert, Button, Card, Input, Space, Spin, Typography } from 'antd';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  completeEmailChallenge,
  isAuthConfigured,
  type EmailSignInStep
} from '../../auth';
import { useAuth } from '../../contexts/auth-context';

type AuthMode = 'sign-in' | 'sign-up';
type AuthStep = 'email' | 'sign-in-code' | 'sign-up-code';

export default function LoginPage() {
  const navigate = useNavigate();
  const {
    email,
    setEmail,
    isAuthenticated,
    isLoading,
    busy,
    setBusy,
    error,
    setError,
    refreshAuth
  } = useAuth();
  const [verificationCode, setVerificationCode] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in');
  const [authStep, setAuthStep] = useState<AuthStep>('email');

  if (isLoading) {
    return (
      <div className="auth-page auth-state">
        <Spin size="large" />
        <Typography.Text>Restoring your session...</Typography.Text>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function acceptEmailSignIn(nextStep: EmailSignInStep) {
    const result = await completeEmailChallenge(nextStep);
    if (result === 'complete') {
      await refreshAuth();
      navigate('/', { replace: true });
    } else {
      setAuthStep('sign-in-code');
      setVerificationCode('');
    }
  }

  async function startEmailSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await signIn({
        username: email.trim(),
        options: {
          authFlowType: 'USER_AUTH',
          preferredChallenge: 'EMAIL_OTP'
        }
      });
      if (result.nextStep.signInStep === 'CONFIRM_SIGN_UP') {
        throw new Error('Confirm your email address or create an account to continue.');
      }
      await acceptEmailSignIn(result.nextStep);
    } catch (reason) {
      setError(authErrorMessage(reason, 'Unable to start email sign-in.'));
    } finally {
      setBusy(false);
    }
  }

  async function startEmailSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await signUp({
        username: email.trim(),
        options: {
          userAttributes: { email: email.trim() }
        }
      });
      if (result.nextStep.signUpStep !== 'CONFIRM_SIGN_UP') {
        throw new Error(`Unsupported sign-up step: ${result.nextStep.signUpStep}.`);
      }
      setAuthStep('sign-up-code');
      setVerificationCode('');
    } catch (reason) {
      setError(authErrorMessage(reason, 'Unable to create your account.'));
    } finally {
      setBusy(false);
    }
  }

  async function verifySignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await confirmSignUp({
        username: email.trim(),
        confirmationCode: verificationCode.trim()
      });
      const result = await signIn({
        username: email.trim(),
        options: {
          authFlowType: 'USER_AUTH',
          preferredChallenge: 'EMAIL_OTP'
        }
      });
      await acceptEmailSignIn(result.nextStep);
    } catch (reason) {
      setError(authErrorMessage(reason, 'Unable to verify your email.'));
    } finally {
      setBusy(false);
    }
  }

  async function verifyEmailSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    let stage = 'confirming the verification code';
    try {
      const result = await confirmSignIn({
        challengeResponse: verificationCode.trim()
      });
      stage = 'finishing sign-in';
      await acceptEmailSignIn(result.nextStep);
    } catch (reason) {
      setError(
        `${stage === 'confirming the verification code' ? 'Code confirmation' : 'Sign-in completion'} failed: ${
          reason instanceof Error
            ? reason.message
            : 'The sign-in code was not accepted.'
        }`
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="hero">
          <Typography.Paragraph className="intro">
            Sign in securely with your email. Accounts use a one-time code;
            no password or extra profile details are needed.
          </Typography.Paragraph>
        </section>

        <Card className="auth-panel">
          <Typography.Title level={2} id="auth-heading">
            {authMode === 'sign-up' ? 'Create your account' : 'Welcome back'}
          </Typography.Title>
          {!isAuthConfigured && (
            <Alert
              description="Cognito is not configured. Set the VITE_COGNITO_* values in packages/frontend/.env."
              type="warning"
              showIcon
            />
          )}
          {authStep === 'email' ? (
            <form
              className="app-form"
              onSubmit={authMode === 'sign-up' ? startEmailSignUp : startEmailSignIn}
            >
              <label htmlFor="email">Email</label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <Button
                disabled={busy || !isAuthConfigured}
                loading={busy}
                htmlType="submit"
                type="primary"
              >
                {authMode === 'sign-up' ? 'Create account' : 'Email me a sign-in code'}
              </Button>
            </form>
          ) : (
            <form
              className="app-form"
              onSubmit={authStep === 'sign-up-code' ? verifySignUp : verifyEmailSignIn}
            >
              <Typography.Paragraph className="auth-code-help">
                Enter the code sent to <Typography.Text strong>{email}</Typography.Text>.
              </Typography.Paragraph>
              <label htmlFor="verification-code">Email code</label>
              <Input
                id="verification-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value)}
                required
              />
              <Space wrap>
                <Button
                  disabled={busy || !isAuthConfigured}
                  loading={busy}
                  htmlType="submit"
                  type="primary"
                >
                  {authStep === 'sign-up-code' ? 'Verify email' : 'Sign in'}
                </Button>
                <Button
                  disabled={busy}
                  onClick={() => {
                    setAuthStep('email');
                    setError('');
                  }}
                  htmlType="button"
                  type="default"
                >
                  Use a different email
                </Button>
              </Space>
            </form>
          )}

          {error && <Alert message={error} type="error" showIcon />}
          {authStep === 'email' && (
            <Typography.Paragraph className="auth-switch">
              {authMode === 'sign-up' ? 'Already registered?' : 'New here?'}{' '}
              <Button
                className="auth-switch-button"
                onClick={() => {
                  setAuthMode(authMode === 'sign-up' ? 'sign-in' : 'sign-up');
                  setError('');
                }}
                disabled={busy}
                htmlType="button"
                type="link"
              >
                {authMode === 'sign-up' ? 'Sign in' : 'Create an account'}
              </Button>
            </Typography.Paragraph>
          )}
        </Card>
    </div>
  );
}

function authErrorMessage(reason: unknown, fallback: string): string {
  if (reason instanceof Error) {
    if (reason.name === 'UserNotFoundException') {
      return 'No account was found for this email. Create an account to get started.';
    }
    if (reason.name === 'UsernameExistsException') {
      return 'An account already exists for this email. Sign in instead.';
    }
    return reason.message;
  }
  return fallback;
}
