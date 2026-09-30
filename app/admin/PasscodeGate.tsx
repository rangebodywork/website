"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/Icon";

export function PasscodeGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(() => {
    if (typeof window !== "undefined") {
      return window.sessionStorage.getItem("admin-auth") === "true";
    }
    return false;
  });
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // DEMO ONLY: Not real security. DO NOT USE IN PRODUCTION.
    if (code === "0000") {
      window.sessionStorage.setItem("admin-auth", "true");
      setAuthed(true);
    } else {
      setError(true);
      setCode("");
    }
  };

  if (authed) return <>{children}</>;

  return (
    <div className="flex h-screen w-full items-center justify-center bg-surface-container-lowest">
      <div className="w-full max-w-sm p-6 rounded-2xl border border-outline-variant/30 bg-surface-container shadow-ambient text-center">
        <Icon name="lock" className="text-4xl text-primary mb-4 mx-auto" />
        <h1 className="font-title-lg text-primary mb-2">Admin Access</h1>
        <p className="text-body-sm text-on-surface-variant mb-6">Demo environment. Use passcode 0000.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(false);
            }}
            placeholder="Passcode"
            className="w-full rounded-lg border border-outline-variant bg-surface p-3 text-center tracking-widest text-on-surface outline-none focus:border-primary"
            autoFocus
          />
          {error && <p className="text-error text-label-sm">Incorrect passcode</p>}
          <button type="submit" className="w-full rounded-lg bg-primary py-3 font-label-md text-on-primary hover:bg-primary-container">
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
