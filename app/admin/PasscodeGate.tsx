"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Icon } from "@/components/Icon";

/**
 * DEMO ONLY — NOT REAL SECURITY. The passcode ships in the client bundle and
 * the "session" is a sessionStorage flag anyone can set. A real admin needs
 * server-side authentication; do not use this gate in production.
 */
export const DEMO_ADMIN_PASSCODE = "0000";

const AUTH_KEY = "admin-auth";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readAuthed(): boolean {
  try {
    return window.sessionStorage.getItem(AUTH_KEY) === "true";
  } catch {
    return false;
  }
}

function setAuthed(authed: boolean) {
  try {
    if (authed) window.sessionStorage.setItem(AUTH_KEY, "true");
    else window.sessionStorage.removeItem(AUTH_KEY);
  } catch {
    // sessionStorage unavailable: the gate simply won't remember the session.
  }
  listeners.forEach((l) => l());
}

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => setAuthed(false)}
      className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-container text-on-surface-variant font-label-md text-left"
    >
      <Icon name="lock" className="text-lg" /> Sign out
    </button>
  );
}

/** Null until mounted: the server can't know the session, so it renders a neutral placeholder. */
function useAdminAuth(): boolean | null {
  return useSyncExternalStore(subscribe, readAuthed, () => null);
}

export function PasscodeGate({ children }: { children: ReactNode }) {
  const authed = useAdminAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // See DEMO_ADMIN_PASSCODE: a client-side check, not a security boundary.
    if (code === DEMO_ADMIN_PASSCODE) {
      setAuthed(true);
    } else {
      setError(true);
      setCode("");
    }
  };

  if (authed === null) return <div className="min-h-dvh bg-surface-container-lowest" aria-busy="true" />;
  if (authed) return <>{children}</>;

  return (
    <div className="flex h-screen w-full items-center justify-center bg-surface-container-lowest">
      <div className="w-full max-w-sm p-6 rounded-2xl border border-outline-variant/30 bg-surface-container shadow-ambient text-center">
        <Icon name="lock" className="text-4xl text-primary mb-4 mx-auto" />
        <h1 className="font-title-lg text-primary mb-2">Admin Access</h1>
        <p className="text-body-sm text-on-surface-variant mb-6">Demo environment, not real security. Use passcode {DEMO_ADMIN_PASSCODE}.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="admin-passcode" className="sr-only">
            Admin passcode
          </label>
          <input
            id="admin-passcode"
            type="password"
            aria-invalid={error}
            aria-describedby={error ? "admin-passcode-error" : undefined}
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(false);
            }}
            placeholder="Passcode"
            className="w-full rounded-lg border border-outline-variant bg-surface p-3 text-center tracking-widest text-on-surface outline-none focus:border-primary"
            autoFocus
          />
          {error && (
            <p id="admin-passcode-error" role="alert" className="text-error text-label-sm">
              Incorrect passcode
            </p>
          )}
          <button type="submit" className="w-full rounded-lg bg-primary py-3 font-label-md text-on-primary hover:bg-primary-container">
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
