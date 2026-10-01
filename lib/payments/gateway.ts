/**
 * Server-side payment gateway contract. Route handlers in `app/api/payments`
 * are the only callers; the browser never sees credentials or talks to the
 * processor directly. See docs/payments.md for the Authorize.net mapping.
 *
 * Amounts are US dollars with at most two decimals.
 */

export type GatewayMode = "stub" | "sandbox" | "production";

/** Why money moved; maps to the processor's order description and card-on-file reason. */
export type ChargeReason = "session" | "late-cancel-fee" | "package";

export interface CustomerProfileInput {
  /** Our own stable customer id (Authorize.net `merchantCustomerId`, max 20 chars). */
  merchantCustomerId: string;
  email?: string;
  description?: string;
}

/** A token the browser uses to open the processor's hosted "save a card" form. */
export interface HostedCardForm {
  token: string;
  /** Where the browser posts the token (an Authorize.net URL, or our stub route). */
  formUrl: string;
}

/** What we may keep about a saved card: references and display details only, never the number. */
export interface StoredCard {
  customerProfileId: string;
  paymentProfileId: string;
  last4: string;
  brand: string;
}

export interface StoredCardCharge {
  customerProfileId: string;
  paymentProfileId: string;
  amount: number;
  reason: ChargeReason;
  bookingId: string;
}

/** Immediate purchase (future packages): against a saved card or a one-time hosted-form nonce. */
export interface PurchaseInput {
  amount: number;
  description: string;
  orderId: string;
  payment: { customerProfileId: string; paymentProfileId: string } | { opaqueDataDescriptor: string; opaqueDataValue: string };
}

export type TransactionResult =
  | { ok: true; transactionId: string; amount: number; authCode: string }
  | { ok: false; code: "declined" | "error"; message: string };

export interface PaymentGateway {
  readonly mode: GatewayMode;

  createCustomerProfile(input: CustomerProfileInput): Promise<{ customerProfileId: string }>;
  /** Token for the hosted add-payment form; card data goes from the browser straight to the processor. */
  getHostedCardForm(customerProfileId: string): Promise<HostedCardForm>;
  /** Masked details of a payment profile the hosted form just created. */
  getStoredCard(customerProfileId: string, paymentProfileId: string): Promise<StoredCard>;

  /** Merchant-initiated charge of a card on file (session total or late-cancel fee). */
  chargeStoredCard(charge: StoredCardCharge): Promise<TransactionResult>;
  /** Customer-initiated immediate charge. Not used yet; packages will need it. */
  purchase(input: PurchaseInput): Promise<TransactionResult>;

  /** Cancels an unsettled transaction. */
  voidTransaction(transactionId: string): Promise<TransactionResult>;
  /** Returns money from a settled transaction (up to the captured amount). */
  refund(input: { transactionId: string; amount: number; customerProfileId: string; paymentProfileId: string }): Promise<TransactionResult>;
}

export class PaymentGatewayNotConfiguredError extends Error {
  constructor(method: string, message?: string) {
    super(
      message ??
        `Authorize.net gateway is not configured: ${method}() is not implemented yet. ` +
          "Unset AUTHORIZE_NET_* env vars to use the stub, or finish lib/payments/authorize-net-gateway.ts.",
    );
    this.name = "PaymentGatewayNotConfiguredError";
  }
}

/** Rejects NaN, negatives, zero and sub-cent precision. */
export function isValidAmount(amount: unknown): amount is number {
  return (
    typeof amount === "number" &&
    Number.isFinite(amount) &&
    amount > 0 &&
    Math.abs(Math.round(amount * 100) - amount * 100) < 1e-6
  );
}
