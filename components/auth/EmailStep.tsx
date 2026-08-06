import { FormEvent } from "react";
import { AuthError } from "./AuthError";

/** Controlled inputs and state transitions for {@link EmailStep}. */
export type EmailStepProps = {
  /** Current email input; it is normalized only after server validation succeeds. */
  email: string;
  /** Optional validation, rate-limit, or connectivity error. */
  error?: string;
  /** Prevents duplicate submissions while `/api/auth/check-email` is pending. */
  busy: boolean;
  /** Writes each input change into the parent modal state. */
  onEmail: (value: string) => void;
  /** Parent submission handler that validates the email against the database-backed route. */
  onSubmit: (event: FormEvent) => void;
};

/**
 * Renders the first modal step and collects the account email address.
 *
 * Submission does not infer account existence in the browser. It delegates to `AuthModal`, which
 * calls `/api/auth/check-email`; the returned `signin` or `signup` state determines the next screen.
 * The controlled input retains retry edits and uses email autocomplete and native keyboard hints.
 *
 * @param props - Controlled email value, request state, and callbacks supplied by `AuthModal`.
 * @returns An accessible email form; no network request is made by this component itself.
 */
export function EmailStep({ email, error, busy, onEmail, onSubmit }: EmailStepProps) {
  return (
    <>
      <p className="wordmark" aria-label="Demo wordmark">
        DEMO
      </p>
      <h2 className="auth-title" id="auth-title">
        Welcome
      </h2>
      <p className="auth-copy">Log in to the demo to continue.</p>
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <label className="field">
          <span className="sr-only">Email address</span>
          <input
            className="input"
            name="email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="Email address*"
            value={email}
            onChange={(e) => onEmail(e.target.value)}
            aria-invalid={Boolean(error)}
          />
        </label>
        <AuthError message={error} />
        <button className="primary-button wide" disabled={busy}>
          {busy ? "Checking…" : "Continue"}
        </button>
        <p className="switch-copy">
          Don&apos;t have an account? <button type="submit">Sign up</button>
        </p>
      </form>
    </>
  );
}
