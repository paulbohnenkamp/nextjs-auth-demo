import { FormEvent } from "react";
import { AuthError } from "./AuthError";

/**
 * Controlled values displayed by {@link ProfileStep}.
 *
 * These are deliberately strings because they mirror HTML input values. The client does not decide
 * whether they are valid and does not add `termsAcceptedAt`; `/api/auth/profile` parses them with
 * `profileSchema`, derives terms acceptance on the server, and associates them with the user from
 * the HTTP-only onboarding cookie.
 */
export type ProfileValues = {
  /** User's given name as typed; the server trims it and limits it to 80 characters. */
  firstName: string;
  /** User's family name as typed; the server trims it and limits it to 80 characters. */
  lastName: string;
  /** Two-letter country code used by the selector, initially `US`. */
  country: string;
  /** Phone value entered into the `tel` input; final validation happens on the server. */
  cellPhone: string;
  /** Native date-input value in `YYYY-MM-DD` form before Zod coerces it to a `Date`. */
  birthday: string;
  /** ZIP or postal code retained as text so leading zeroes are not lost. */
  zipCode: string;
};

/** Inputs and callbacks owned by the parent authentication state machine. */
export type ProfileStepProps = {
  /** Normalized account email displayed read-only; identity still comes from the secure cookie. */
  email: string;
  /** Current controlled field values. */
  values: ProfileValues;
  /** Optional server or validation message rendered through the accessible alert region. */
  error?: string;
  /** Disables repeat submission and changes the button label while the request is pending. */
  busy: boolean;
  /** Updates one field in `AuthModal` without giving this presentation component server authority. */
  onChange: (name: keyof ProfileValues, value: string) => void;
  /** Revokes onboarding and returns to email collection when the displayed email is wrong. */
  onEdit: () => void;
  /** Submits the controlled values through `AuthModal` to `/api/auth/profile`. */
  onSubmit: (event: FormEvent) => void;
  /** Abandons onboarding, revokes its cookie, and resets the modal. */
  onLogout: () => void;
};

/**
 * Renders the final account-creation form for a user with valid onboarding authorization.
 *
 * The component is intentionally presentational: it owns no identity, authorization, persistence,
 * or completion decision. `AuthModal` supplies controlled values and callbacks, while the profile
 * route derives the user from an HTTP-only cookie and validates every field again. Clicking Next is
 * the explicit terms-acceptance action; there is no client-supplied acceptance timestamp.
 *
 * Accessibility details include associated labels for native date/ZIP controls, autocomplete hints,
 * a read-only email field with an edit action, and an announced error region. CSS places names side
 * by side on wide screens and stacks the grid on narrow screens.
 *
 * @param props - Controlled values, request state, and transition callbacks from `AuthModal`.
 * @returns The profile-completion form. It does not issue network requests directly.
 */
export function ProfileStep({
  email,
  values,
  error,
  busy,
  onChange,
  onEdit,
  onSubmit,
  onLogout,
}: ProfileStepProps) {
  return (
    <>
      <h2 className="profile-title" id="auth-title">
        Let&apos;s finish creating your demo account
      </h2>
      <form onSubmit={onSubmit}>
        <div className="profile-grid">
          <input
            className="input"
            autoFocus
            name="firstName"
            autoComplete="given-name"
            placeholder="First Name"
            value={values.firstName}
            onChange={(e) => onChange("firstName", e.target.value)}
            required
          />
          <input
            className="input"
            name="lastName"
            autoComplete="family-name"
            placeholder="Last Name"
            value={values.lastName}
            onChange={(e) => onChange("lastName", e.target.value)}
            required
          />
          <div className="input country-phone full">
            <select
              aria-label="Country"
              value={values.country}
              onChange={(e) => onChange("country", e.target.value)}
            >
              <option value="US">US</option>
              <option value="CA">CA</option>
              <option value="GB">GB</option>
            </select>
            <input
              name="cellPhone"
              type="tel"
              autoComplete="tel"
              placeholder="Cell Phone"
              value={values.cellPhone}
              onChange={(e) => onChange("cellPhone", e.target.value)}
              required
            />
            <span className="field-action help" title="Include country or area code">
              ?
            </span>
          </div>
          <label className="field full">
            <span className="sr-only">Birthday</span>
            <input
              className="input"
              name="birthday"
              type="date"
              autoComplete="bday"
              value={values.birthday}
              onChange={(e) => onChange("birthday", e.target.value)}
              required
            />
          </label>
          <label className="field full">
            <span className="sr-only">ZIP Code</span>
            <input
              className="input"
              name="zipCode"
              autoComplete="postal-code"
              placeholder="ZIP Code"
              value={values.zipCode}
              onChange={(e) => onChange("zipCode", e.target.value)}
              required
            />
          </label>
          <div className="field full">
            <input className="input readonly" value={email} readOnly aria-label="Email address" />
            <button type="button" className="field-action" onClick={onEdit} aria-label="Edit email">
              ✎
            </button>
          </div>
        </div>
        <AuthError message={error} />
        <button className="primary-button wide" disabled={busy}>
          {busy ? "Saving…" : "Next"}
        </button>
        <p className="profile-terms">
          By clicking &apos;Next&apos; to create an account, I agree to the{" "}
          <a href="/terms">Demo Account Terms</a> and confirm that I have read the{" "}
          <a href="/privacy">Demo Privacy Policy</a>.
        </p>
        <p className="logout-wrap">
          Don&apos;t want to finish creating your account right now?{" "}
          <button className="logout-link" type="button" onClick={onLogout}>
            Log Out
          </button>
        </p>
      </form>
    </>
  );
}
