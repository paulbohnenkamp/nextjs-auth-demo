"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Revokes the browser's database-backed session and returns to the public landing page.
 *
 * The button disables itself before sending `POST /api/auth/logout`, preventing accidental duplicate
 * requests. After the route deletes stored token hashes and clears cookies, `replace` removes the
 * protected dashboard from browser history and `refresh` invalidates server-rendered session state.
 *
 * @returns A stateful logout button intended for authenticated pages.
 */
export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="primary-button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/");
        router.refresh();
      }}
    >
      {busy ? "Logging out…" : "Log Out"}
    </button>
  );
}
