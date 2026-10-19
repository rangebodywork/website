import { repository, type ConfirmedBooking } from "../repository";
import type { HostedCardForm, TransactionResult } from "./gateway";
import {
  chargePlan,
  type CancellationQuote,
  type PaymentKind,
  type PaymentRecord,
  type SavedCard,
} from "./policy";

/** Browser-side calls to our own `/api/payments` routes; never to the processor. */

/** A non-2xx answer from our payment routes. `status` 0: no answer at all (network). */
export class PaymentApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new PaymentApiError("Payment service error", 0);
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new PaymentApiError(data.error ?? "Payment service error", res.status);
  return data;
}

/**
 * A charge request that failed without a clear answer may still have charged
 * the card: no response, a gateway/server error or an unreadable body. Only a
 * 4xx or a 503 (payments not configured) means nothing was sent.
 */
function outcomeUnknown(error: unknown): boolean {
  if (!(error instanceof PaymentApiError)) return true;
  return error.status === 0 || (error.status >= 500 && error.status !== 503);
}

export type CardForm = HostedCardForm & { mode: "stub" | "sandbox" | "production"; customerProfileId: string; profileToken: string };

export const paymentsApi = {
  startCardForm: (input: { merchantCustomerId: string; name?: string; email?: string; customerProfileId?: string; profileToken?: string }) =>
    post<CardForm>("/api/payments/card-form", input),
  /** Test mode: the stub's stand-in for the processor's hosted form. */
  submitTestCard: (form: CardForm, card: { number: string; expiry: string; cvc: string }) =>
    post<{ customerProfileId: string; paymentProfileId: string }>(form.formUrl, { token: form.token, ...card }),
  status: () => fetch("/api/payments/status", { cache: "no-store" }).then((r) => r.json() as Promise<{ mode: CardForm["mode"] | "disabled" }>),
  storedCard: (form: Pick<CardForm, "customerProfileId" | "profileToken">, paymentProfileId?: string) =>
    post<SavedCard>("/api/payments/stored-card", {
      customerProfileId: form.customerProfileId,
      profileToken: form.profileToken,
      paymentProfileId,
    }),
  charge: (input: { card: SavedCard; amount: number; reason: PaymentKind; bookingId: string; reconcile?: boolean }) =>
    post<TransactionResult>("/api/payments/charge", {
      customerProfileId: input.card.customerProfileId,
      profileToken: input.card.profileToken,
      paymentProfileId: input.card.paymentProfileId,
      amount: input.amount,
      reason: input.reason,
      bookingId: input.bookingId,
      reconcile: input.reconcile || undefined,
    }),
};

/** Bookings with a charge in flight, so a double click or status change can't charge twice. */
const inFlight = new Set<string>();

/**
 * Charges the booking's card on file and records the attempt (success,
 * failure or unknown outcome) on the booking. Returns null if a charge for it
 * is already running, or if nothing may be charged (see `chargePlan`): a
 * session already charged, a fee once the session or a fee has been charged,
 * or a different charge while one's outcome is unknown. Retrying a charge
 * whose outcome is unknown asks the server to reconcile first.
 */
export async function chargeBooking(snapshot: ConfirmedBooking, kind: PaymentKind, amount: number): Promise<PaymentRecord | null> {
  // Decide on the latest stored record, not whatever the caller rendered.
  const booking = repository.listBookings().find((b) => b.id === snapshot.id) ?? snapshot;
  if (!booking.payment) throw new Error("No card on file for this booking");
  if (inFlight.has(booking.id)) return null;
  const plan = chargePlan(booking.payment, kind);
  if (!plan.allowed) return null;
  inFlight.add(booking.id);
  try {
    return await attemptCharge(booking, kind, amount, plan.reconcile);
  } finally {
    inFlight.delete(booking.id);
  }
}

async function attemptCharge(booking: ConfirmedBooking, kind: PaymentKind, amount: number, reconcile: boolean): Promise<PaymentRecord> {
  if (!booking.payment) throw new Error("No card on file for this booking");
  const base = { id: crypto.randomUUID(), kind, amount, at: new Date().toISOString() };
  let record: PaymentRecord;
  try {
    const result = await paymentsApi.charge({ card: booking.payment.card, amount, reason: kind, bookingId: booking.id, reconcile });
    record = result.ok
      ? { ...base, ok: true, transactionId: result.transactionId }
      : { ...base, ok: false, message: result.message, ...(result.code === "unknown" ? { outcome: "unknown" as const } : {}) };
  } catch (error) {
    record = {
      ...base,
      ok: false,
      message: error instanceof Error ? error.message : "Payment service error",
      ...(outcomeUnknown(error) ? { outcome: "unknown" as const } : {}),
    };
  }
  await repository.recordPayment(booking.id, record);
  return record;
}

/**
 * Cancels a booking with the quote the customer was shown: inside the window
 * that fee is charged to the card on file first. The booking is cancelled
 * either way; a failed fee charge is left on the booking for the studio to retry.
 */
export async function cancelBooking(booking: ConfirmedBooking, quote: CancellationQuote): Promise<PaymentRecord | null> {
  const fee = quote.chargeable ? await chargeBooking(booking, "late-cancel-fee", quote.fee) : null;
  await repository.setBookingStatus(booking.id, "cancelled");
  return fee;
}
