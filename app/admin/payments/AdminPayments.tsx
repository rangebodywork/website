"use client";

import { useEffect, useState } from "react";
import { useDatabase } from "@/lib/db-context";
import { repository } from "@/lib/repository";
import { paymentsApi } from "@/lib/payments/client";
import { DEFAULT_PAYMENT_SETTINGS, isPlaceholderPolicy, type PaymentSettings } from "@/lib/payments/policy";

const MODE_LABELS = {
  stub: "Test mode (stub gateway, no real charges)",
  sandbox: "Authorize.net sandbox",
  production: "Authorize.net production",
  disabled: "Disabled: no Authorize.net keys in production, or production not allowed yet",
} as const;

export function AdminPayments() {
  const { paymentSettings } = useDatabase();
  const [saved, setSaved] = useState(false);
  return (
    <div className="space-y-6">
      <h1 className="text-headline-sm text-primary mb-6">Payments</h1>
      <GatewayStatus />
      {/* Remount when the stored settings change (e.g. another tab), so the form starts from them. */}
      <SettingsForm key={JSON.stringify(paymentSettings)} settings={paymentSettings} saved={saved} onSaved={setSaved} />
    </div>
  );
}

function GatewayStatus() {
  const [mode, setMode] = useState<keyof typeof MODE_LABELS | "error" | null>(null);
  useEffect(() => {
    paymentsApi.status().then(
      (s) => setMode(s.mode),
      () => setMode("error"),
    );
  }, []);
  return (
    <div className="space-y-3">
      {mode === "stub" && (
        <p role="alert" className="rounded-xl bg-error p-4 text-body-sm font-semibold text-on-error">
          Stub mode: payments are simulated. Cards are not really saved and no money moves. Set the AUTHORIZE_NET_*
          keys before taking real bookings.
        </p>
      )}
      {mode === "disabled" && (
        <p role="alert" className="rounded-xl bg-error p-4 text-body-sm font-semibold text-on-error">
          Payments are disabled: this production deployment has no Authorize.net keys (or has production keys that are
          not allowed yet), so customers cannot save a card. See docs/payments.md; /api/payments/health says why.
        </p>
      )}
      <p className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 text-body-sm text-on-surface">
        <span className="font-semibold">Payment processor: </span>
        {mode === null ? "Checking…" : mode === "error" ? "Unavailable" : MODE_LABELS[mode]}
      </p>
    </div>
  );
}

function SettingsForm({
  settings,
  saved,
  onSaved,
}: {
  settings: PaymentSettings;
  saved: boolean;
  onSaved: (saved: boolean) => void;
}) {
  const [fee, setFee] = useState(String(settings.cancellationFee));
  const [hours, setHours] = useState(String(settings.cancellationWindowHours));
  const [text, setText] = useState(settings.policyText);

  const feeValue = Number(fee);
  const hoursValue = Number(hours);
  const errors = [
    !(fee.trim() && Number.isFinite(feeValue) && feeValue >= 0 && Math.round(feeValue * 100) / 100 === feeValue) &&
      "Fee must be a dollar amount (0 or more, up to 2 decimals).",
    !(hours.trim() && Number.isInteger(hoursValue) && hoursValue >= 0 && hoursValue <= 168) &&
      "Window must be whole hours between 0 and 168.",
    !text.trim() && "Policy text is required.",
  ].filter(Boolean) as string[];

  return (
    <form
      aria-label="Cancellation policy settings"
      className="space-y-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (errors.length) return;
        void repository
          .savePaymentSettings({ cancellationFee: feeValue, cancellationWindowHours: hoursValue, policyText: text.trim() })
          .then(() => onSaved(true));
      }}
    >
      <h2 className="font-title-lg text-title-lg text-on-surface">Cancellation policy</h2>
      {isPlaceholderPolicy(settings.policyText) && (
        <p className="rounded-lg bg-tertiary-fixed/50 p-3 text-body-sm text-on-tertiary-fixed">
          Placeholder: the policy wording and the default fee ({DEFAULT_PAYMENT_SETTINGS.cancellationFee} USD) are
          stand-ins awaiting the owner&apos;s final terms. Replace the text below to remove this notice.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cancellation-fee" className="block text-label-md text-on-surface-variant">
            Late-cancellation fee (USD)
          </label>
          <input
            id="cancellation-fee"
            type="number"
            min={0}
            step="0.01"
            value={fee}
            onChange={(e) => {
              onSaved(false);
              setFee(e.target.value);
            }}
            className="mt-1 block w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-on-surface"
          />
        </div>
        <div>
          <label htmlFor="cancellation-window" className="block text-label-md text-on-surface-variant">
            Window before session start (hours)
          </label>
          <input
            id="cancellation-window"
            type="number"
            min={0}
            max={168}
            step="1"
            value={hours}
            onChange={(e) => {
              onSaved(false);
              setHours(e.target.value);
            }}
            className="mt-1 block w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-on-surface"
          />
        </div>
      </div>
      <div>
        <label htmlFor="policy-text" className="block text-label-md text-on-surface-variant">
          Policy text (shown on review and confirmation)
        </label>
        <textarea
          id="policy-text"
          rows={5}
          value={text}
          onChange={(e) => {
            onSaved(false);
            setText(e.target.value);
          }}
          className="mt-1 block w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-body-sm text-on-surface"
        />
      </div>
      {errors.length > 0 && (
        <ul role="alert" className="list-disc pl-5 text-label-sm text-error">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={errors.length > 0} className="rounded-lg bg-primary px-4 py-2 text-on-primary disabled:opacity-60">
          Save policy
        </button>
        <button
          type="button"
          onClick={() => setText(DEFAULT_PAYMENT_SETTINGS.policyText)}
          className="rounded-lg border border-outline-variant px-4 py-2 text-on-surface"
        >
          Restore placeholder text
        </button>
        {saved && (
          <span role="status" className="text-label-sm text-primary">
            Saved.
          </span>
        )}
      </div>
    </form>
  );
}
