import { confirmSignIn, fetchAuthSession, signIn } from '@aws-amplify/auth';
import { Amplify } from 'aws-amplify';

export type EmailSignInStep = Awaited<ReturnType<typeof signIn>>['nextStep'];

const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const userPoolClientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID;

export const isAuthConfigured = Boolean(userPoolId && userPoolClientId);

export function configureAuth(): void {
  if (!isAuthConfigured) return;

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: {
          email: true
        }
      }
    }
  });
}

export async function completeEmailChallenge(
  nextStep: EmailSignInStep
): Promise<'code-required' | 'complete'> {
  if (nextStep.signInStep === 'CONTINUE_SIGN_IN_WITH_FIRST_FACTOR_SELECTION') {
    const result = await confirmSignIn({ challengeResponse: 'EMAIL_OTP' });
    return completeEmailChallenge(result.nextStep);
  }

  if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE') {
    return 'code-required';
  }

  if (nextStep.signInStep === 'DONE') {
    return 'complete';
  }

  throw new Error(
    `Unsupported email sign-in step: ${nextStep.signInStep}.`
  );
}

export async function getIdToken(): Promise<string> {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (!token) throw new Error('Your session has expired. Please sign in again.');
  return token;
}
