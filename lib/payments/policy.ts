import { TIME_SLOTS, type TimeSlotId } from "../catalog";
import { fromDateKey } from "../format";
import type { StoredCard } from "./gateway";

/**
 * Client-safe payment records and the cancellation rule. Nothing here talks to
 * the gateway; see `lib/payments/client.ts` for the calls to `/api/payments`.
 */

/**
 * Saved-card reference + display details. Never a card number. `profileToken`
 * is the server's signature over `customerProfileId` (lib/payments/binding.ts);
 * the payment routes refuse the profile without it. Empty on cards saved
 * before it existed, which must be saved again.
 */
export type SavedCard = StoredCard & { profileToken: string };

export type PaymentStatus = "card-on-file" | "charged" | "fee-charged" | "failed";
export type PaymentKind = "session" | "late-cancel-fee";

export interface PaymentRecord {
  id: string;
  kind: PaymentKind;
  amount: number;
  at: string;
  ok: boolean;
  transactionId?: string;
  message?: string;
}

export interface BookingPayment {
  card: SavedCard;
  status: PaymentStatus;
  transactions: PaymentRecord[];
}

export interface PaymentSettings {
  /** Charged to the card on file when a client cancels inside the window. */
  cancellationFee: number;
  cancellationWindowHours: number;
  /** Shown on /review before confirming and on the confirmation. */
  policyText: string;
}

/** PLACEHOLDER: the owner will supply the real wording, fee and window. */
export const PLACEHOLDER_POLICY_TEXT =
  "[Placeholder policy — final wording to come from the studio owner] " +
  "Your card is saved on file when you book and is not charged until your session. " +
  "Cancel more than 24 hours before your session start at no cost. Cancellations within 24 hours " +
  "incur a cancellation fee charged to the card on file. Rescheduling is free.";

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  cancellationFee: 50, // PLACEHOLDER amount, not confirmed by the owner.
  cancellationWindowHours: 24,
  policyText: PLACEHOLDER_POLICY_TEXT,
};

/** True while the policy text is still the shipped placeholder, so the UI can flag it. */
export function isPlaceholderPolicy(text: string): boolean {
  return text.startsWith("[Placeholder");
}

/**
 * Puts a (new) card on file, keeping any earlier charge history. Status follows
 * the last record, except that a decline on the previous card doesn't count
 * against the new one.
 */
export function newCardPayment(card: SavedCard, previous?: BookingPayment): BookingPayment {
  const transactions = previous?.transactions ?? [];
  const last = transactions.at(-1);
  return { card, status: last?.ok ? statusFor(last) : "card-on-file", transactions };
}

/** True once a session charge has gone through; a booking is never charged for its session twice. */
export function sessionCharged(payment: BookingPayment | undefined): boolean {
  return Boolean(payment?.transactions.some((t) => t.ok && t.kind === "session"));
}

/** Status after recording a transaction: the latest attempt wins. */
export function statusFor(record: PaymentRecord): PaymentStatus {
  if (!record.ok) return "failed";
  return record.kind === "session" ? "charged" : "fee-charged";
}

/** Local start of a booked session, or null while undated. */
export function sessionStart(intake: { date: string | null; slot: TimeSlotId }): Date | null {
  if (!intake.date) return null;
  const slot = TIME_SLOTS.find((s) => s.id === intake.slot) ?? TIME_SLOTS[0];
  const start = fromDateKey(intake.date);
  start.setMinutes(slot.startMinutes);
  return start;
}

export interface CancellationQuote {
  /** Inside the late-cancel window. */
  late: boolean;
  fee: number;
  /** Whether the fee can be charged: there is a card on file and nothing has been charged to it yet. */
  chargeable: boolean;
  /** The session or a fee was already charged, so no (further) fee is taken. */
  alreadyPaid: boolean;
}

export function cancellationQuote(
  intake: { date: string | null; slot: TimeSlotId },
  payment: BookingPayment | undefined,
  settings: PaymentSettings,
  now: Date = new Date(),
): CancellationQuote {
  const alreadyPaid = payment?.status === "charged" || payment?.status === "fee-charged";
  const start = sessionStart(intake);
  const late =
    !alreadyPaid &&
    settings.cancellationFee > 0 &&
    start !== null &&
    start.getTime() - now.getTime() < settings.cancellationWindowHours * 60 * 60 * 1000;
  return { late, fee: late ? settings.cancellationFee : 0, chargeable: late && Boolean(payment), alreadyPaid };
}
