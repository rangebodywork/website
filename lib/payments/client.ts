import { repository, type ConfirmedBooking } from "../repository";
import type { HostedCardForm, TransactionResult } from "./gateway";
import {
  sessionCharged,
  type CancellationQuote,
  type PaymentKind,
  type PaymentRecord,
  type SavedCard,
} from "./policy";

/** Browser-side calls to our own `/api/payments` routes; never to the processor. */

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Payment service error");
  return data;
}

export type CardForm = HostedCardForm & { mode: "stub" | "sandbox" | "production"; customerProfileId: string };

export const paymentsApi = {
  startCardForm: (input: { merchantCustomerId: string; name?: string; email?: string; customerProfileId?: string }) =>
    post<CardForm>("/api/payments/card-form", input),
  /** Test mode: the stub's stand-in for the processor's hosted form. */
  submitTestCard: (form: CardForm, card: { number: string; expiry: string; cvc: string }) =>
    post<{ customerProfileId: string; paymentProfileId: string }>(form.formUrl, { token: form.token, ...card }),
  status: () => fetch("/api/payments/status", { cache: "no-store" }).then((r) => r.json() as Promise<{ mode: CardForm["mode"] | "disabled" }>),
  storedCard: (customerProfileId: string, paymentProfileId?: string) =>
    post<SavedCard>("/api/payments/stored-card", { customerProfileId, paymentProfileId }),
  charge: (input: { card: SavedCard; amount: number; reason: PaymentKind; bookingId: string }) =>
    post<TransactionResult>("/api/payments/charge", {
      customerProfileId: input.card.customerProfileId,
      paymentProfileId: input.card.paymentProfileId,
      amount: input.amount,
      reason: input.reason,
      bookingId: input.bookingId,
    }),
};

/** Bookings with a charge in flight, so a double click or status change can't charge twice. */
const inFlight = new Set<string>();

/**
 * Charges the booking's card on file and records the attempt (success or
 * failure) on the booking. Returns null if a charge for it is already running,
 * or if nothing may be charged: a session already charged, or a fee once
 * the session or a fee has been charged.
 */
export async function chargeBooking(snapshot: ConfirmedBooking, kind: PaymentKind, amount: number): Promise<PaymentRecord | null> {
  // Decide on the latest stored record, not whatever the caller rendered.
  const booking = repository.listBookings().find((b) => b.id === snapshot.id) ?? snapshot;
  if (!booking.payment) throw new Error("No card on file for this booking");
  if (inFlight.has(booking.id)) return null;
  if (kind === "session" && sessionCharged(booking.payment)) return null;
  if (kind === "late-cancel-fee" && booking.payment.status !== "card-on-file" && booking.payment.status !== "failed") return null;
  inFlight.add(booking.id);
  try {
    return await attemptCharge(booking, kind, amount);
  } finally {
    inFlight.delete(booking.id);
  }
}

async function attemptCharge(booking: ConfirmedBooking, kind: PaymentKind, amount: number): Promise<PaymentRecord> {
  if (!booking.payment) throw new Error("No card on file for this booking");
  let record: PaymentRecord;
  try {
    const result = await paymentsApi.charge({ card: booking.payment.card, amount, reason: kind, bookingId: booking.id });
    record = result.ok
      ? { id: crypto.randomUUID(), kind, amount, at: new Date().toISOString(), ok: true, transactionId: result.transactionId }
      : { id: crypto.randomUUID(), kind, amount, at: new Date().toISOString(), ok: false, message: result.message };
  } catch (error) {
    record = {
      id: crypto.randomUUID(),
      kind,
      amount,
      at: new Date().toISOString(),
      ok: false,
      message: error instanceof Error ? error.message : "Payment service error",
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
