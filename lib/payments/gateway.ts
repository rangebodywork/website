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

/**
 * `unknown`: the request may have reached the processor but we don't know the
 * outcome (timeout, dropped connection, unreadable answer, or a duplicate-window
 * rejection of an earlier attempt). Never retry blindly: reconcile first.
 */
export type TransactionResult =
  | { ok: true; transactionId: string; amount: number; authCode: string; reconciled?: boolean }
  | { ok: false; code: "declined" | "unknown" | "error"; message: string };

/** What a reconciliation lookup found for a charge's invoice number. */
export type ChargeLookup =
  | { status: "none" }
  | { status: "charged"; transactionId: string; amount: number }
  /** A matching transaction exists but hasn't resolved (e.g. under review). */
  | { status: "pending"; transactionId: string };

export interface PaymentGateway {
  readonly mode: GatewayMode;

  createCustomerProfile(input: CustomerProfileInput): Promise<{ customerProfileId: string }>;
  /**
   * Token for the hosted add-payment form; card data goes from the browser straight to the processor.
   * `iframeCommunicatorUrl` is our page that relays the form's events (saved, cancelled, resized).
   */
  getHostedCardForm(customerProfileId: string, options?: { iframeCommunicatorUrl?: string }): Promise<HostedCardForm>;
  /**
   * Masked details of a payment profile the hosted form just created. Without a
   * `paymentProfileId`, the profile's newest payment profile (the hosted form
   * does not tell the browser which id it created).
   */
  getStoredCard(customerProfileId: string, paymentProfileId?: string): Promise<StoredCard>;

  /** Merchant-initiated charge of a card on file (session total or late-cancel fee). */
  chargeStoredCard(charge: StoredCardCharge): Promise<TransactionResult>;
  /** Looks for an earlier attempt at this charge (same invoice number) before a retry. */
  findCharge(charge: StoredCardCharge): Promise<ChargeLookup>;
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

/** What customers see for any processor failure; the detail goes to the server log only. */
export const GENERIC_PAYMENT_ERROR = "The payment service couldn't complete this. Please try again, or contact the studio.";

/**
 * The processor failed. `message` is the detail for server logs, the health
 * check and `payments:check` (it may name env vars or Authorize.net codes such
 * as E00007); `publicMessage` is all a browser ever sees.
 */
export class PaymentGatewayError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly publicMessage: string = GENERIC_PAYMENT_ERROR,
  ) {
    super(message);
    this.name = "PaymentGatewayError";
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
