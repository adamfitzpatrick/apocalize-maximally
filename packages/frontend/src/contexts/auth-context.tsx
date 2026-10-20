import { fetchAuthSession, signOut as amplifySignOut } from '@aws-amplify/auth';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { isAuthConfigured } from '../auth';

interface AuthContextValue {
  userId: string;
  email: string;
  setEmail: (email: string) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  error: string;
  setError: (error: string) => void;
  refreshAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(isAuthConfigured);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refreshAuth = useCallback(async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken;
      const subject = token?.payload.sub;
      if (token && typeof subject !== 'string') {
        throw new Error('The authenticated session does not include a user ID.');
      }
      setIsAuthenticated(Boolean(token));
      setUserId(typeof subject === 'string' ? subject : '');
      if (typeof token?.payload.email === 'string') {
        setEmail(token.payload.email);
      }
      setError('');
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Unable to restore your session.'
      );
      throw reason;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthConfigured) return;
    void refreshAuth().catch(() => undefined);
  }, [refreshAuth]);

  const signOut = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      await amplifySignOut();
      setIsAuthenticated(false);
      setUserId('');
      setEmail('');
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : 'Unable to sign out.';
      setError(message);
      throw reason;
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        userId,
        email,
        setEmail,
        isAuthenticated,
        isLoading,
        busy,
        setBusy,
        error,
        setError,
        refreshAuth,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
}
