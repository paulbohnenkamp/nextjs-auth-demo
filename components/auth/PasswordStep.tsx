import { FormEvent, useState } from "react";
import { AuthError } from "./AuthError";

/** Controlled account context and transitions for {@link PasswordStep}. */
export type PasswordStepProps = {
  /** Chooses copy, autocomplete behavior, reset visibility, and the parent API endpoint. */
  mode: "signin" | "signup";
  /** Server-normalized email displayed read-only alongside the Edit action. */
  email: string;
  /** Optional password-policy, credential, rate-limit, or connectivity error. */
  error?: string;
  /** Disables duplicate submissions while login or signup is pending. */
  busy: boolean;
  /** Returns to email entry; during onboarding the parent also revokes scoped authorization. */
  onEdit: () => void;
  /** Gives the locally held password to the parent for transport to the appropriate route. */
  onSubmit: (password: string) => void;
};

/**
 * Renders the shared password step for both existing-user login and new-account creation.
 *
 * Password text stays in this component's local state and is never stored in the modal state machine,
 * logged, or sent anywhere except the parent's submission callback. The visibility button only
 * switches the input type. Sign-in uses `current-password`; signup uses `new-password`. The reset
 * action is deliberately a demo placeholder because reset-token delivery is outside this repository.
 *
 * @param props - Mode, normalized email, request state, and callbacks supplied by `AuthModal`.
 * @returns The password form appropriate to `mode`.
 */
export function PasswordStep({ mode, email, error, busy, onEdit, onSubmit }: PasswordStepProps) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(password);
  };
  return (
    <>
      <p className="wordmark" aria-label="Demo wordmark">
        DEMO
      </p>
      <h2 className="auth-title" id="auth-title">
        {mode === "signin" ? "Enter Your Password" : "Create Your Password"}
      </h2>
      <p className="auth-copy">
        {mode === "signin"
          ? "Enter your password to log in to the demo"
          : "Use 12+ characters with upper, lower, number, and symbol."}
      </p>
      <form className="auth-form" onSubmit={submit}>
        <div className="field">
          <input className="input readonly" value={email} readOnly aria-label="Email address" />
          <button className="field-action" type="button" onClick={onEdit}>
            Edit
          </button>
        </div>
        <div className="field">
          <label className="sr-only" htmlFor="auth-password">
            Password
          </label>
          <input
            id="auth-password"
            className="input password-input"
            name="password"
            type={show ? "text" : "password"}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            autoFocus
            placeholder="Password*"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(error)}
          />
          <button
            className="field-action eye"
            type="button"
            onClick={() => setShow((value) => !value)}
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? "◉" : "◎"}
          </button>
        </div>
        <AuthError message={error} />
        {mode === "signin" && (
          <button
            className="form-link"
            type="button"
            onClick={() =>
              window.alert("Password reset email delivery is not included in this demo.")
            }
          >
            Reset password
          </button>
        )}
        <button className="primary-button wide" disabled={busy}>
          {busy ? "Please wait…" : "Continue"}
        </button>
        <p className="switch-copy">
          Don&apos;t have an account?{" "}
          <button type="button" onClick={onEdit}>
            Sign up
          </button>
        </p>
      </form>
    </>
  );
}
