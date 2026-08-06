/**
 * Produces the shared inline error treatment for authentication steps.
 *
 * `role="alert"` causes newly mounted messages to be announced by assistive technology. Returning
 * `null` for an absent message avoids an empty live region and keeps form spacing compact.
 *
 * @param props - Object containing the optional human-readable server, validation, or connectivity error.
 * @returns An announced error paragraph, or `null` when no error exists.
 */
export function AuthError({ message }: { message?: string }) {
  return message ? (
    <p className="error" role="alert">
      {message}
    </p>
  ) : null;
}
