import {
  confirmSignIn,
  confirmSignUp,
  fetchAuthSession,
  signIn,
  signOut,
  signUp
} from "@aws-amplify/auth";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  completeEmailChallenge,
  getIdToken,
  isAuthConfigured,
  type EmailSignInStep
} from "./auth";

interface Item {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
}

type AuthMode = "sign-in" | "sign-up";
type AuthStep = "email" | "sign-in-code" | "sign-up-code";

const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);
  const [authLoading, setAuthLoading] = useState(isAuthConfigured);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [authStep, setAuthStep] = useState<AuthStep>("email");

  const refreshAuth = useCallback(async () => {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken;
    setIsAuthenticated(Boolean(token));
    setEmail((current) =>
      typeof token?.payload.email === "string" ? token.payload.email : current
    );
    setAuthLoading(false);
  }, []);

  useEffect(() => {
    if (!isAuthConfigured) return;
    void refreshAuth().catch((reason: unknown) => {
      setAuthError(
        reason instanceof Error ? reason.message : "Unable to restore your session."
      );
      setAuthLoading(false);
    });
  }, [refreshAuth]);

  const loadItems = useCallback(async () => {
    if (!apiUrl) {
      setError("Set VITE_API_URL in packages/frontend/.env to connect the API.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const token = await getIdToken();
      const response = await fetch(`${apiUrl}/items`, {
        headers: { Authorization: token }
      });
      if (!response.ok) throw new Error(`Loading items failed (${response.status}).`);
      setItems((await response.json()) as Item[]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load items.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) void loadItems();
  }, [isAuthenticated, loadItems]);

  async function acceptEmailSignIn(nextStep: EmailSignInStep) {
    const result = await completeEmailChallenge(nextStep);
    if (result === "complete") {
      await refreshAuth();
    } else {
      setAuthStep("sign-in-code");
      setVerificationCode("");
    }
  }

  async function startEmailSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setAuthError("");
    try {
      const result = await signIn({
        username: email.trim(),
        options: {
          authFlowType: "USER_AUTH",
          preferredChallenge: "EMAIL_OTP"
        }
      });
      if (result.nextStep.signInStep === "CONFIRM_SIGN_UP") {
        throw new Error("Confirm your email address or create an account to continue.");
      }
      await acceptEmailSignIn(result.nextStep);
    } catch (reason) {
      setAuthError(authErrorMessage(reason, "Unable to start email sign-in."));
    } finally {
      setBusy(false);
    }
  }

  async function startEmailSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setAuthError("");
    try {
      const result = await signUp({
        username: email.trim(),
        options: {
          userAttributes: { email: email.trim() }
        }
      });
      if (result.nextStep.signUpStep !== "CONFIRM_SIGN_UP") {
        throw new Error(`Unsupported sign-up step: ${result.nextStep.signUpStep}.`);
      }
      setAuthStep("sign-up-code");
      setVerificationCode("");
    } catch (reason) {
      setAuthError(authErrorMessage(reason, "Unable to create your account."));
    } finally {
      setBusy(false);
    }
  }

  async function verifySignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setAuthError("");
    try {
      await confirmSignUp({
        username: email.trim(),
        confirmationCode: verificationCode.trim()
      });
      const result = await signIn({
        username: email.trim(),
        options: {
          authFlowType: "USER_AUTH",
          preferredChallenge: "EMAIL_OTP"
        }
      });
      await acceptEmailSignIn(result.nextStep);
    } catch (reason) {
      setAuthError(authErrorMessage(reason, "Unable to verify your email."));
    } finally {
      setBusy(false);
    }
  }

  async function verifyEmailSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setAuthError("");
    try {
      const result = await confirmSignIn({
        challengeResponse: verificationCode.trim()
      });
      await acceptEmailSignIn(result.nextStep);
    } catch (reason) {
      setAuthError(authErrorMessage(reason, "The sign-in code was not accepted."));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    setError("");
    try {
      await signOut();
      setIsAuthenticated(false);
      setItems([]);
      setAuthStep("email");
      setAuthMode("sign-in");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign out.");
    } finally {
      setBusy(false);
    }
  }

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!apiUrl) {
      setError("Set VITE_API_URL in packages/frontend/.env to connect the API.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const token = await getIdToken();
      const response = await fetch(`${apiUrl}/items`, {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title, description })
      });
      if (!response.ok) throw new Error(`Creating item failed (${response.status}).`);
      setTitle("");
      setDescription("");
      await loadItems();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create item.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(id: string) {
    if (!apiUrl) return;
    setBusy(true);
    setError("");
    try {
      const token = await getIdToken();
      const response = await fetch(`${apiUrl}/items/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: token }
      });
      if (!response.ok) throw new Error(`Deleting item failed (${response.status}).`);
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete item.");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) {
    return <main className="shell"><p className="message">Restoring your session...</p></main>;
  }

  if (!isAuthenticated) {
    return (
      <main className="shell">
        <header className="hero">
          <p className="eyebrow">APOCALIZE MAXIMALLY</p>
          <h1>A clear place to start.</h1>
          <p className="intro">
            Sign in securely with your email. Accounts use a one-time code;
            no password or extra profile details are needed.
          </p>
        </header>

        <section className="panel auth-panel" aria-labelledby="auth-heading">
          <h2 id="auth-heading">
            {authMode === "sign-up" ? "Create your account" : "Welcome back"}
          </h2>
          {!isAuthConfigured && (
            <p className="message error" role="alert">
              Cognito is not configured. Set the VITE_COGNITO_* values in
              packages/frontend/.env.
            </p>
          )}
          {authStep === "email" ? (
            <form onSubmit={authMode === "sign-up" ? startEmailSignUp : startEmailSignIn}>
              <label>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <button disabled={busy || !isAuthConfigured} type="submit">
                {authMode === "sign-up" ? "Create account" : "Email me a sign-in code"}
              </button>
            </form>
          ) : (
            <form onSubmit={authStep === "sign-up-code" ? verifySignUp : verifyEmailSignIn}>
              <p className="message">
                Enter the code sent to <strong>{email}</strong>.
              </p>
              <label>
                Email code
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value)}
                  required
                />
              </label>
              <button disabled={busy || !isAuthConfigured} type="submit">
                {authStep === "sign-up-code" ? "Verify email" : "Sign in"}
              </button>
              <button
                className="refresh"
                disabled={busy}
                onClick={() => {
                  setAuthStep("email");
                  setAuthError("");
                }}
                type="button"
              >
                Use a different email
              </button>
            </form>
          )}

          {authError && <p className="message error" role="alert">{authError}</p>}
          {authStep === "email" && (
            <p className="auth-switch">
              {authMode === "sign-up" ? "Already registered?" : "New here?"}{" "}
              <button
                className="text-button"
                onClick={() => {
                  setAuthMode(authMode === "sign-up" ? "sign-in" : "sign-up");
                  setAuthError("");
                }}
                disabled={busy}
                type="button"
              >
                {authMode === "sign-up" ? "Sign in" : "Create an account"}
              </button>
            </p>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="hero">
        <div className="account-bar">
          <p className="eyebrow">APOCALIZE MAXIMALLY</p>
          <button className="refresh" onClick={() => void handleSignOut()} disabled={busy}>
            Sign out
          </button>
        </div>
        <h1>A clear place to start.</h1>
        <p className="intro">
          Signed in{email ? ` as ${email}` : ""}. Your items are private to your account.
        </p>
      </header>

      <section className="panel" aria-labelledby="new-item-heading">
        <h2 id="new-item-heading">Create an item</h2>
        <form onSubmit={createItem}>
          <label>
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              required
            />
          </label>
          <label>
            Description <span className="optional">Optional</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </label>
          <button disabled={busy || !title.trim()} type="submit">
            Add item
          </button>
        </form>
      </section>

      <section className="items-section" aria-labelledby="items-heading">
        <div className="section-heading">
          <h2 id="items-heading">Items</h2>
          <button className="refresh" onClick={() => void loadItems()} disabled={busy}>
            Refresh
          </button>
        </div>
        {error && <p className="message error" role="alert">{error}</p>}
        {!error && !busy && items.length === 0 && (
          <p className="message">No items yet. Create one above to get started.</p>
        )}
        <ul className="item-list">
          {items.map((item) => (
            <li className="item" key={item.id}>
              <div>
                <h3>{item.title}</h3>
                {item.description && <p>{item.description}</p>}
                <time dateTime={item.createdAt}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </time>
              </div>
              <button
                className="delete"
                onClick={() => void deleteItem(item.id)}
                disabled={busy}
                aria-label={`Delete ${item.title}`}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function authErrorMessage(reason: unknown, fallback: string): string {
  if (reason instanceof Error) {
    if (reason.name === "UserNotFoundException") {
      return "No account was found for this email. Create an account to get started.";
    }
    if (reason.name === "UsernameExistsException") {
      return "An account already exists for this email. Sign in instead.";
    }
    return reason.message;
  }
  return fallback;
}
