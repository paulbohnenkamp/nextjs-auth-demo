"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EmailStep } from "./EmailStep";
import { PasswordStep } from "./PasswordStep";
import { ProfileStep, ProfileValues } from "./ProfileStep";

type AuthStep =
  | { kind: "email" }
  | { kind: "password"; email: string; mode: "signin" | "signup" }
  | { kind: "profile"; email: string };

type ApiResult = {
  ok: boolean;
  error?: string;
  nextStep?: "signin" | "signup" | "profile" | "dashboard";
  fieldErrors?: Record<string, string[]>;
};

/** Parent-controlled lifecycle hook for the modal dialog. */
export type AuthModalProps = {
  /** Unmounts the dialog and restores the launcher state. */
  onClose: () => void;
};
const initialProfile: ProfileValues = {
  firstName: "",
  lastName: "",
  country: "US",
  cellPhone: "",
  birthday: "",
  zipCode: "",
};

/**
 * Sends a same-origin JSON request to an authentication Route Handler.
 *
 * @param url - Internal API path such as `/api/auth/login`.
 * @param body - Serializable request payload; omitted for logout.
 * @returns The parsed response with `ok` requiring both a successful HTTP status and payload flag.
 */
async function post(url: string, body?: unknown): Promise<ApiResult> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json()) as ApiResult;
  return { ...data, ok: response.ok && data.ok };
}

/**
 * Coordinates the complete authentication dialog as an explicit state machine.
 *
 * It owns API transitions, loading/error state, focus trapping, Escape handling, onboarding reset,
 * and dashboard navigation. Individual step components remain presentation-focused.
 * Passwords remain inside `PasswordStep` until submission, while identity and authorization are always
 * derived again by server routes. Closing or editing during profile completion revokes onboarding.
 *
 * @param props - Modal lifecycle callback owned by `AuthLauncher`.
 * @returns A focus-contained, ARIA-labelled dialog displaying the active authentication step.
 */
export function AuthModal({ onClose }: AuthModalProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<AuthStep>({ kind: "email" });
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState(initialProfile);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, []);

  const handleKeys = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      "button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]",
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const checkEmail = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const result = await post("/api/auth/check-email", { email });
      if (!result.ok) setError(result.fieldErrors?.email?.[0] ?? result.error);
      else
        setStep({
          kind: "password",
          email: email.trim().toLowerCase(),
          mode: result.nextStep === "signin" ? "signin" : "signup",
        });
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = async (password: string) => {
    if (step.kind !== "password") return;
    setBusy(true);
    setError(undefined);
    try {
      const result = await post(`/api/auth/${step.mode === "signin" ? "login" : "signup"}`, {
        email: step.email,
        password,
      });
      if (!result.ok) {
        setError(result.fieldErrors?.password?.[0] ?? result.error);
        return;
      }
      if (result.nextStep === "profile") setStep({ kind: "profile", email: step.email });
      else {
        onClose();
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const submitProfile = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const result = await post("/api/auth/profile", profile);
      if (!result.ok) {
        const firstFieldError = result.fieldErrors && Object.values(result.fieldErrors).flat()[0];
        setError(firstFieldError ?? result.error);
        return;
      }
      onClose();
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (step.kind === "profile") await post("/api/auth/logout").catch(() => undefined);
    setStep({ kind: "email" });
    setEmail("");
    setProfile(initialProfile);
    setError(undefined);
  };

  return (
    <div
      className="backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={`auth-modal ${step.kind === "profile" ? "profile-modal" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onKeyDown={handleKeys}
      >
        <div className={step.kind === "profile" ? "profile-content" : "auth-content"}>
          {step.kind === "email" && (
            <EmailStep
              email={email}
              error={error}
              busy={busy}
              onEmail={setEmail}
              onSubmit={checkEmail}
            />
          )}
          {step.kind === "password" && (
            <PasswordStep
              key={step.mode + step.email}
              mode={step.mode}
              email={step.email}
              error={error}
              busy={busy}
              onEdit={reset}
              onSubmit={submitPassword}
            />
          )}
          {step.kind === "profile" && (
            <ProfileStep
              email={step.email}
              values={profile}
              error={error}
              busy={busy}
              onChange={(name, value) => setProfile((current) => ({ ...current, [name]: value }))}
              onEdit={reset}
              onSubmit={submitProfile}
              onLogout={reset}
            />
          )}
        </div>
      </div>
    </div>
  );
}
