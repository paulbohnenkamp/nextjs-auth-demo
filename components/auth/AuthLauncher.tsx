"use client";

import { useRef, useState } from "react";
import { AuthModal } from "./AuthModal";

/**
 * Provides the public Sign In trigger and owns the modal's mounted state.
 *
 * The modal is created only while open, which guarantees a fresh authentication state on each launch.
 * Closing schedules focus restoration for the next animation frame, after React has removed the dialog,
 * so keyboard users return to the control that opened it.
 *
 * @returns A Sign In button and, while active, the authentication dialog.
 */
export function AuthLauncher() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    window.requestAnimationFrame(() => buttonRef.current?.focus());
  };
  return (
    <>
      <button ref={buttonRef} className="primary-button" onClick={() => setOpen(true)}>
        Sign In
      </button>
      {open && <AuthModal onClose={close} />}
    </>
  );
}
