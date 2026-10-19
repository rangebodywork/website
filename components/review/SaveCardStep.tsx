"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useBooking } from "@/lib/booking-context";
import { paymentsApi, type CardForm } from "@/lib/payments/client";
import { Icon } from "../Icon";
import { Card } from "../ui/Card";

const inputClass =
  "mt-1 block w-full rounded-md border border-outline-variant bg-surface px-3 py-2 font-body-sm text-body-sm text-on-surface";

/**
 * "Save card on file" step before confirming. Only a payment-profile reference
 * and brand/last4 come back to the browser. With Authorize.net configured the
 * card is typed into its hosted form (an iframe); in stub mode the form below
 * plays that part and the number goes only to the stub.
 */
export function SaveCardStep() {
  const { state, actions } = useBooking();
  const [consent, setConsent] = useState(false);
  const [form, setForm] = useState<CardForm | null>(null);
  const [card, setCard] = useState({ number: "", expiry: "", cvc: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saved = state.savedCard;

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const openForm = () =>
    run(async () => {
      setForm(
        await paymentsApi.startCardForm({
          merchantCustomerId: `c${crypto.randomUUID().replace(/-/g, "").slice(0, 19)}`,
          name: state.intake.fullName,
        }),
      );
    });

  const hostedSaved = () =>
    run(async () => {
      if (!form) return;
      actions.setSavedCard(await paymentsApi.storedCard(form));
      setForm(null);
    });

  const submitCard = () =>
    run(async () => {
      if (!form) return;
      const { customerProfileId, paymentProfileId } = await paymentsApi.submitTestCard(form, card);
      actions.setSavedCard(await paymentsApi.storedCard({ customerProfileId, profileToken: form.profileToken }, paymentProfileId));
      setForm(null);
      setCard({ number: "", expiry: "", cvc: "" });
    });

  return (
    <Card className="space-y-3" aria-labelledby="save-card-title">
      <div className="flex items-baseline justify-between gap-3 border-b border-surface-variant/50 pb-2">
        <h2 id="save-card-title" className="font-headline-md text-headline-md text-primary">
          Card on file
        </h2>
      </div>
      <p className="flex items-start gap-2 font-body-sm text-body-sm text-on-surface-variant">
        <Icon name="lock" className="mt-0.5 text-[16px] text-primary" />
        <span>
          <strong className="text-on-surface">No charge happens now.</strong> Your card is saved securely with our payment
          processor and charged after your session, or for a late cancellation as described in the policy.
        </span>
      </p>

      {saved ? (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low p-3" role="status">
          <span className="flex items-center gap-2 font-title-md text-title-md text-on-surface">
            <Icon name="check_circle" filled className="text-[20px] text-primary" />
            {saved.brand} ending {saved.last4} saved
          </span>
          <button
            type="button"
            onClick={() => actions.setSavedCard(null)}
            className="font-label-md text-label-md text-primary underline"
          >
            Use a different card
          </button>
        </div>
      ) : form && form.mode !== "stub" ? (
        <HostedCardForm form={form} busy={busy} onSaved={() => void hostedSaved()} onCancel={() => setForm(null)} />
      ) : form ? (
        <form
          aria-label="Test-mode card form"
          className="space-y-3 rounded-lg border-2 border-dashed border-tertiary/60 bg-tertiary-fixed/30 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submitCard();
          }}
        >
          <p className="font-label-md text-label-md uppercase tracking-wider text-on-tertiary-fixed">
            Test mode · no real card is processed
          </p>
          <p className="font-body-sm text-body-sm text-on-tertiary-fixed-variant">
            Stands in for Authorize.net&apos;s hosted card form until the studio&apos;s keys are set up. Use 4111 1111 1111
            1111 (approves) or 4000 0000 0000 0002 (declines when charged), any future expiry and any 3-digit code.
          </p>
          <div>
            <label htmlFor="card-number" className="block font-label-md text-label-md text-on-surface-variant">
              Card number
            </label>
            <input
              id="card-number"
              inputMode="numeric"
              autoComplete="off"
              required
              value={card.number}
              onChange={(e) => setCard({ ...card, number: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="card-expiry" className="block font-label-md text-label-md text-on-surface-variant">
                Expiry (MM/YY)
              </label>
              <input
                id="card-expiry"
                autoComplete="off"
                required
                placeholder="MM/YY"
                value={card.expiry}
                onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="card-cvc" className="block font-label-md text-label-md text-on-surface-variant">
                Security code
              </label>
              <input
                id="card-cvc"
                inputMode="numeric"
                autoComplete="off"
                required
                value={card.cvc}
                onChange={(e) => setCard({ ...card, cvc: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-on-primary disabled:opacity-60">
              Save test card
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="rounded-lg border border-outline-variant px-4 py-2 text-on-surface"
            >
              Back
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-2 font-body-sm text-body-sm text-on-surface">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-5 w-5 rounded-sm border-outline text-primary focus:ring-0"
            />
            <span>
              I authorize Soma Studio to keep my card on file and charge it for this session after it takes place, and
              for a late-cancellation fee under the cancellation policy.
            </span>
          </label>
          <button
            type="button"
            disabled={!consent || busy}
            onClick={() => void openForm()}
            className="rounded-lg border border-primary/50 px-4 py-2 font-label-md text-label-md text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            Save card on file
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="font-label-sm text-label-sm text-error">
          {error}
        </p>
      )}
    </Card>
  );
}

const FRAME_NAME = "anet-add-payment";

const noSubscribe = () => () => {};
/**
 * Authorize.net only uses an https communicator page, so on a plain-http
 * server (local dev, the e2e build) its events never arrive. False during SSR.
 */
const useInsecureOrigin = () =>
  useSyncExternalStore(
    noSubscribe,
    () => window.location.protocol === "http:",
    () => false,
  );

/**
 * Authorize.net's hosted "add payment" page in an iframe: the form token is
 * POSTed into the frame, and public/payments/iframe-communicator.html relays
 * its events (saved, cancelled, resized) back here. Only on plain http, where
 * the communicator can't be used, does "I've saved my card" stand in for it.
 */
function HostedCardForm({
  form,
  busy,
  onSaved,
  onCancel,
}: {
  form: CardForm;
  busy: boolean;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const post = useRef<HTMLFormElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(560);
  const manualConfirm = useInsecureOrigin();

  useEffect(() => {
    post.current?.submit();
  }, [form.token]);

  useEffect(() => {
    const listen = (event: MessageEvent) => {
      const data = event.data as { source?: string; qstr?: string } | null;
      if (event.origin !== window.location.origin || data?.source !== "anet-iframe-communicator" || !data.qstr) return;
      // The sender must be the communicator nested in *our* card iframe: its parent is
      // the Authorize.net page in that iframe. (The communicator is same-origin, so
      // reading its .parent is allowed; any other same-origin window is ignored.)
      const sender = event.source as Window | null;
      if (!sender || !frame.current?.contentWindow || sender.parent !== frame.current.contentWindow) return;
      const params = new URLSearchParams(data.qstr);
      const action = params.get("action");
      if (action === "successfulSave") onSaved();
      else if (action === "cancel") onCancel();
      else if (action === "resizeWindow") {
        const h = Number(params.get("height"));
        if (h > 0) setHeight(Math.min(Math.max(h, 300), 1200));
      }
    };
    window.addEventListener("message", listen);
    return () => window.removeEventListener("message", listen);
  }, [onSaved, onCancel]);

  return (
    <div className="space-y-3">
      {form.mode === "sandbox" && (
        <p className="font-label-md text-label-md uppercase tracking-wider text-on-tertiary-fixed">
          Sandbox · Authorize.net test account, no real money moves
        </p>
      )}
      <form ref={post} method="post" action={form.formUrl} target={FRAME_NAME} hidden>
        <input type="hidden" name="token" value={form.token} />
      </form>
      <iframe
        ref={frame}
        name={FRAME_NAME}
        title="Secure card form (Authorize.net)"
        className="w-full rounded-lg border border-outline-variant bg-white"
        style={{ height }}
      />
      <div className="flex gap-2">
        {manualConfirm && (
          <button type="button" disabled={busy} onClick={onSaved} className="rounded-lg bg-primary px-4 py-2 text-on-primary disabled:opacity-60">
            I&apos;ve saved my card
          </button>
        )}
        <button type="button" onClick={onCancel} className="rounded-lg border border-outline-variant px-4 py-2 text-on-surface">
          Back
        </button>
      </div>
    </div>
  );
}
