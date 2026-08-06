"use client";

/**
 * Provides the root recoverable error boundary for failures below the application layout.
 *
 * Next.js supplies `reset`, which retries rendering the failed segment without forcing a browser reload.
 * The error object is accepted by the required boundary contract but deliberately not displayed, avoiding
 * accidental exposure of stack traces or sensitive server details.
 *
 * @param props - App Router error-boundary object containing the captured error and retry callback.
 * @returns A neutral error message and retry control.
 */
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="home">
      <div className="home-card">
        <h1>Something went wrong</h1>
        <button className="primary-button" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
