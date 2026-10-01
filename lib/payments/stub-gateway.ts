import type {
  CustomerProfileInput,
  HostedCardForm,
  PaymentGateway,
  PurchaseInput,
  StoredCard,
  StoredCardCharge,
  TransactionResult,
} from "./gateway";

/**
 * Stand-in for Authorize.net until test keys arrive. Stateless and
 * deterministic, so it behaves the same across serverless instances:
 *
 * - Cards are "saved" by `submitHostedForm`, which plays the part of
 *   Authorize.net's hosted page. It validates the test card, then forgets the
 *   number; only brand and last4 survive, encoded in the payment profile id.
 * - Charges against a card ending in 0002 (4000 0000 0000 0002) are declined.
 * - Any charge or purchase whose amount ends in .13 is declined.
 */

export const STUB_DECLINE_CARD = "4000000000000002";
export const STUB_SUCCESS_CARD = "4111111111111111";
export const STUB_FORM_URL = "/api/payments/stub/hosted-form";

const TOKEN_PREFIX = "stub_tok_";
const PROFILE_PREFIX = "stub_cp_";
const PAYMENT_PREFIX = "stub_pp_";
const TX_PREFIX = "stub_tx_";

export interface StubCardInput {
  number: string;
  /** MM/YY */
  expiry: string;
  cvc: string;
}

function shortId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

function luhnValid(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

function brandOf(digits: string): string {
  if (/^4/.test(digits)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  if (/^6(011|5)/.test(digits)) return "Discover";
  return "Card";
}

function expired(expiry: string, now = new Date()): boolean {
  const match = /^(\d{2})\s*\/\s*(\d{2})$/.exec(expiry.trim());
  if (!match) return true;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return true;
  // Valid through the last day of the expiry month.
  return new Date(year, month, 1) <= now;
}

function cents(amount: number): number {
  return Math.round(amount * 100);
}

function log(method: string, details: Record<string, unknown>) {
  console.info(`[payments:stub] ${method}`, JSON.stringify(details));
}

function approved(amount: number): TransactionResult {
  return { ok: true, transactionId: `${TX_PREFIX}${shortId()}`, amount, authCode: "STUB00" };
}

function declined(message: string): TransactionResult {
  return { ok: false, code: "declined", message };
}

function parsePaymentProfile(paymentProfileId: string): { brand: string; last4: string } | null {
  const match = new RegExp(`^${PAYMENT_PREFIX}([A-Za-z]+)_(\\d{4})_[a-f0-9]+$`).exec(paymentProfileId);
  return match ? { brand: match[1], last4: match[2] } : null;
}

export class StubPaymentGateway implements PaymentGateway {
  readonly mode = "stub" as const;

  async createCustomerProfile(input: CustomerProfileInput): Promise<{ customerProfileId: string }> {
    const customerProfileId = `${PROFILE_PREFIX}${shortId()}`;
    log("createCustomerProfile", { merchantCustomerId: input.merchantCustomerId, customerProfileId });
    return { customerProfileId };
  }

  async getHostedCardForm(customerProfileId: string): Promise<HostedCardForm> {
    if (!customerProfileId.startsWith(PROFILE_PREFIX)) throw new Error("Unknown customer profile");
    log("getHostedCardForm", { customerProfileId });
    return { token: `${TOKEN_PREFIX}${customerProfileId}`, formUrl: STUB_FORM_URL };
  }

  /** Stub-only: what Authorize.net's hosted form would do with the card the customer typed. */
  async submitHostedForm(
    token: string,
    card: StubCardInput,
  ): Promise<{ ok: true; customerProfileId: string; paymentProfileId: string } | { ok: false; message: string }> {
    if (!token.startsWith(TOKEN_PREFIX + PROFILE_PREFIX)) return { ok: false, message: "This card form has expired. Please start again." };
    const digits = card.number.replace(/[\s-]/g, "");
    if (!/^\d{13,19}$/.test(digits) || !luhnValid(digits)) return { ok: false, message: "That card number is not valid." };
    if (expired(card.expiry)) return { ok: false, message: "That expiry date is not valid." };
    if (!/^\d{3,4}$/.test(card.cvc.trim())) return { ok: false, message: "That security code is not valid." };
    const customerProfileId = token.slice(TOKEN_PREFIX.length);
    const brand = brandOf(digits);
    const last4 = digits.slice(-4);
    const paymentProfileId = `${PAYMENT_PREFIX}${brand}_${last4}_${shortId()}`;
    log("submitHostedForm", { customerProfileId, paymentProfileId, brand, last4 });
    return { ok: true, customerProfileId, paymentProfileId };
  }

  async getStoredCard(customerProfileId: string, paymentProfileId: string): Promise<StoredCard> {
    const parsed = parsePaymentProfile(paymentProfileId);
    if (!customerProfileId.startsWith(PROFILE_PREFIX) || !parsed) throw new Error("Unknown payment profile");
    return { customerProfileId, paymentProfileId, ...parsed };
  }

  async chargeStoredCard(charge: StoredCardCharge): Promise<TransactionResult> {
    const card = parsePaymentProfile(charge.paymentProfileId);
    const result = !card
      ? ({ ok: false, code: "error", message: "Unknown payment profile" } as const)
      : card.last4 === STUB_DECLINE_CARD.slice(-4)
        ? declined("The card was declined (test decline card).")
        : cents(charge.amount) % 100 === 13
          ? declined("The card was declined (test decline amount).")
          : approved(charge.amount);
    log("chargeStoredCard", { bookingId: charge.bookingId, reason: charge.reason, amount: charge.amount, result });
    return result;
  }

  async purchase(input: PurchaseInput): Promise<TransactionResult> {
    const result =
      cents(input.amount) % 100 === 13 ? declined("The card was declined (test decline amount).") : approved(input.amount);
    log("purchase", { orderId: input.orderId, amount: input.amount, result });
    return result;
  }

  async voidTransaction(transactionId: string): Promise<TransactionResult> {
    const result: TransactionResult = transactionId.startsWith(TX_PREFIX)
      ? { ok: true, transactionId, amount: 0, authCode: "STUB00" }
      : { ok: false, code: "error", message: "Unknown transaction" };
    log("voidTransaction", { transactionId, result });
    return result;
  }

  async refund(input: { transactionId: string; amount: number }): Promise<TransactionResult> {
    const result = input.transactionId.startsWith(TX_PREFIX)
      ? approved(input.amount)
      : ({ ok: false, code: "error", message: "Unknown transaction" } as const);
    log("refund", { transactionId: input.transactionId, amount: input.amount, result });
    return result;
  }
}
