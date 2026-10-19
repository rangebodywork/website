import { createHash } from "node:crypto";
import {
  PaymentGatewayError,
  type ChargeLookup,
  type ChargeReason,
  type CustomerProfileInput,
  type HostedCardForm,
  type PaymentGateway,
  type PurchaseInput,
  type StoredCard,
  type StoredCardCharge,
  type TransactionResult,
} from "./gateway";

/**
 * Authorize.net over its JSON API (no SDK). Server only: the credentials go in
 * `merchantAuthentication` on each request and are never logged or returned.
 * Design and field mapping: docs/payments.md. Field names and element order
 * follow https://api.authorize.net/xml/v1/schema/AnetApiSchema.xsd: the JSON
 * API is converted to XML, so members must appear in schema order.
 */

export type AuthorizeNetEnv = "sandbox" | "production";

export interface AuthorizeNetConfig {
  apiLoginId: string;
  transactionKey: string;
  /** For verifying webhook `X-ANET-Signature` (HMAC-SHA512). Optional until webhooks exist. */
  signatureKey?: string;
  env: AuthorizeNetEnv;
  /** Injected in unit tests. */
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export const ENDPOINTS = {
  sandbox: { api: "https://apitest.authorize.net/xml/v1/request.api", hosted: "https://test.authorize.net/customer/addPayment" },
  production: { api: "https://api.authorize.net/xml/v1/request.api", hosted: "https://accept.authorize.net/customer/addPayment" },
} as const;

/** Seconds within which Authorize.net rejects an identical charge (double click, retried request). */
export const DUPLICATE_WINDOW_SECONDS = 120;

/** Authentication failures: wrong keys, or keys from the other environment. */
const AUTH_FAILURE_CODES = new Set(["E00007", "E00008"]);
/** createCustomerProfile: a profile with this merchantCustomerId/email already exists. */
const DUPLICATE_PROFILE = "E00039";
/** transactionResponse error code for a resubmission inside the duplicate window. */
const DUPLICATE_TRANSACTION = "11";

/** Transaction Reporting statuses where money moved (or will at settlement). */
const CHARGED_STATUSES = new Set(["capturedPendingSettlement", "settledSuccessfully", "authorizedPendingCapture", "approvedReview"]);
/** Statuses that may still turn into a charge: don't charge again while one exists. */
const PENDING_STATUSES = new Set(["underReview", "FDSPendingReview", "FDSAuthorizedPendingReview", "communicationError"]);

const KIND_CODE: Record<ChargeReason, string> = { session: "S", "late-cancel-fee": "F", package: "P" };
const DESCRIPTION: Record<ChargeReason, string> = { session: "Session", "late-cancel-fee": "Late cancellation fee", package: "Package" };

interface ApiResponse {
  messages?: { resultCode?: string; message?: Array<{ code?: string; text?: string }> };
  [key: string]: unknown;
}

interface TransactionResponse {
  responseCode?: string;
  authCode?: string;
  transId?: string;
  errors?: { error?: Array<{ errorCode?: string; errorText?: string }> };
}

interface TransactionSummary {
  transId?: string;
  transactionStatus?: string;
  invoiceNumber?: string;
  settleAmount?: number | string;
}

interface MaskedPaymentProfile {
  customerPaymentProfileId?: string;
  payment?: { creditCard?: { cardNumber?: string; cardType?: string } };
}

export interface AuthenticateResult {
  ok: boolean;
  env: AuthorizeNetEnv;
  /** Authorize.net result code, e.g. "I00001" or "E00007". */
  code: string;
  message: string;
}

export function firstMessage(data: ApiResponse): { code: string; text: string } {
  const m = data.messages?.message?.[0];
  return { code: m?.code ?? "unknown", text: m?.text ?? "No message from Authorize.net" };
}

/** Authorize.net card types to the display names the stub (and the UI) use. */
export function brandName(cardType: string | undefined): string {
  const names: Record<string, string> = {
    Visa: "Visa",
    MasterCard: "Mastercard",
    AmericanExpress: "American Express",
    Discover: "Discover",
    JCB: "JCB",
    DinersClub: "Diners Club",
  };
  return (cardType && names[cardType]) || cardType || "Card";
}

/**
 * A deterministic invoice number (max 20 chars) per booking and charge kind,
 * so a resubmitted charge matches the first one inside the duplicate window.
 */
export function invoiceNumber(bookingId: string, reason: ChargeReason): string {
  return `${createHash("sha256").update(bookingId).digest("hex").slice(0, 18)}-${KIND_CODE[reason]}`;
}

const money = (amount: number) => amount.toFixed(2);

/** The answer when a charge request may have reached Authorize.net but we can't tell what happened. */
export function unknownOutcome(detail: string): TransactionResult {
  console.error("[payments] charge outcome unknown:", detail);
  return { ok: false, code: "unknown", message: "Outcome unknown. Check Authorize.net before retrying." };
}

/** Picks the earlier attempt at `invoice` out of transaction-list responses. */
export function matchCharge(transactions: TransactionSummary[], invoice: string): ChargeLookup {
  const matches = transactions.filter((t) => t.invoiceNumber === invoice && t.transId);
  const charged = matches.find((t) => CHARGED_STATUSES.has(t.transactionStatus ?? ""));
  if (charged) return { status: "charged", transactionId: charged.transId!, amount: Number(charged.settleAmount ?? 0) };
  const pending = matches.find((t) => PENDING_STATUSES.has(t.transactionStatus ?? ""));
  if (pending) return { status: "pending", transactionId: pending.transId! };
  // Declined, voided, expired or errored attempts moved no money.
  return { status: "none" };
}
const duplicateWindow = { setting: [{ settingName: "duplicateWindow", settingValue: String(DUPLICATE_WINDOW_SECONDS) }] };

/** Maps a createTransactionResponse to our result; declines are results, not errors. */
export function parseTransaction(data: ApiResponse, amount: number): TransactionResult {
  const tr = data.transactionResponse as TransactionResponse | undefined;
  const error = tr?.errors?.error?.[0];
  if (!tr?.responseCode) {
    const m = firstMessage(data);
    return { ok: false, code: "error", message: `${m.text} (${m.code})` };
  }
  switch (tr.responseCode) {
    case "1":
      return { ok: true, transactionId: tr.transId ?? "", amount, authCode: tr.authCode ?? "" };
    case "2":
      return { ok: false, code: "declined", message: error?.errorText ?? "The card was declined." };
    case "4":
      return {
        ok: false,
        code: "error",
        message: `Held for review by Authorize.net (transaction ${tr.transId}). Check the Merchant Interface before retrying.`,
      };
    default:
      if (error?.errorCode === DUPLICATE_TRANSACTION) {
        // An identical charge went in within the duplicate window; it may well have succeeded.
        return unknownOutcome(`duplicate within ${DUPLICATE_WINDOW_SECONDS}s window`);
      }
      return { ok: false, code: "error", message: error?.errorText ?? firstMessage(data).text };
  }
}

export class AuthorizeNetGateway implements PaymentGateway {
  readonly mode: AuthorizeNetEnv;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: AuthorizeNetConfig) {
    this.mode = config.env;
    this.fetchImpl = config.fetch ?? fetch;
  }

  /** Every JSON request carries `merchantAuthentication` as its first member. */
  protected get merchantAuthentication() {
    return { name: this.config.apiLoginId, transactionKey: this.config.transactionKey };
  }

  protected get endpoints() {
    return ENDPOINTS[this.config.env];
  }

  /** POSTs `{ [root]: { merchantAuthentication, ...body } }` and returns the parsed response. */
  private async call(root: string, body: Record<string, unknown> = {}, env: AuthorizeNetEnv = this.config.env): Promise<ApiResponse> {
    let res: Response;
    try {
      res = await this.fetchImpl(ENDPOINTS[env].api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [root]: { merchantAuthentication: this.merchantAuthentication, ...body } }),
        cache: "no-store",
        signal: AbortSignal.timeout(this.config.timeoutMs ?? 20_000),
      });
    } catch {
      throw new PaymentGatewayError("Could not reach Authorize.net. Please try again.", "network");
    }
    if (!res.ok) throw new PaymentGatewayError(`Authorize.net answered HTTP ${res.status}`, "http");
    // The JSON API prefixes its responses with a UTF-8 byte order mark.
    const text = (await res.text()).replace(/^﻿/, "");
    try {
      return JSON.parse(text) as ApiResponse;
    } catch {
      throw new PaymentGatewayError("Authorize.net sent a response we could not read", "parse");
    }
  }

  /** Throws a PaymentGatewayError unless `resultCode` is "Ok". */
  private expectOk(data: ApiResponse): ApiResponse {
    if (data.messages?.resultCode === "Ok") return data;
    const m = firstMessage(data);
    throw new PaymentGatewayError(`${m.text} (${m.code})${this.authHint(m.code)}`, m.code);
  }

  private authHint(code: string): string {
    if (!AUTH_FAILURE_CODES.has(code)) return "";
    const env = this.config.env;
    return ` Check AUTHORIZE_NET_API_LOGIN_ID and AUTHORIZE_NET_TRANSACTION_KEY, and that they are ${env} keys (AUTHORIZE_NET_ENV=${env}).`;
  }

  /**
   * `authenticateTestRequest`: checks the credentials without moving money.
   * With `probeOtherEnv`, an authentication failure is retried against the
   * other environment to tell "wrong keys" from "keys for the other environment".
   */
  async authenticate(options: { probeOtherEnv?: boolean } = {}): Promise<AuthenticateResult> {
    const env = this.config.env;
    const m = firstMessage(await this.call("authenticateTestRequest"));
    if (m.code === "I00001") return { ok: true, env, code: m.code, message: m.text };
    if (!AUTH_FAILURE_CODES.has(m.code) || !options.probeOtherEnv) {
      return { ok: false, env, code: m.code, message: `${m.text}${this.authHint(m.code)}` };
    }
    const other: AuthorizeNetEnv = env === "sandbox" ? "production" : "sandbox";
    const otherCode = await this.call("authenticateTestRequest", {}, other).then(
      (d) => firstMessage(d).code,
      () => "unknown",
    );
    const message =
      otherCode === "I00001"
        ? `These look like ${other} keys but AUTHORIZE_NET_ENV=${env}. ${m.text}`
        : `${m.text} The ${other} environment rejected them too, so the keys look wrong rather than swapped.`;
    return { ok: false, env, code: m.code, message };
  }

  async createCustomerProfile(input: CustomerProfileInput): Promise<{ customerProfileId: string }> {
    const data = await this.call("createCustomerProfileRequest", {
      profile: { merchantCustomerId: input.merchantCustomerId.slice(0, 20), description: input.description, email: input.email },
    });
    const m = firstMessage(data);
    if (data.messages?.resultCode !== "Ok" && m.code === DUPLICATE_PROFILE) {
      // "A duplicate record with ID 123456 already exists." Reuse that profile.
      const existing = /ID (\d+)/.exec(m.text)?.[1];
      if (existing) return { customerProfileId: existing };
    }
    this.expectOk(data);
    if (typeof data.customerProfileId !== "string" || !data.customerProfileId) {
      throw new PaymentGatewayError("Authorize.net did not return a customer profile id", "profile");
    }
    return { customerProfileId: data.customerProfileId };
  }

  async getHostedCardForm(customerProfileId: string, options: { iframeCommunicatorUrl?: string } = {}): Promise<HostedCardForm> {
    const settings: Array<[string, string]> = [
      // The issuer verifies the card when it is saved, so a bad card fails now, not on the day.
      ["hostedProfileValidationMode", "liveMode"],
      ["hostedProfilePaymentOptions", "showCreditCard"],
      ["hostedProfileCardCodeRequired", "true"],
      ["hostedProfileSaveButtonText", "Save card"],
    ];
    // The communicator page must be https; without it the browser falls back to a "Done" button.
    if (options.iframeCommunicatorUrl?.startsWith("https://")) {
      settings.push(["hostedProfileIFrameCommunicatorUrl", options.iframeCommunicatorUrl]);
    }
    const data = this.expectOk(
      await this.call("getHostedProfilePageRequest", {
        customerProfileId,
        hostedProfileSettings: { setting: settings.map(([settingName, settingValue]) => ({ settingName, settingValue })) },
      }),
    );
    if (typeof data.token !== "string" || !data.token) throw new PaymentGatewayError("Authorize.net did not return a form token", "token");
    return { token: data.token, formUrl: this.endpoints.hosted };
  }

  async getStoredCard(customerProfileId: string, paymentProfileId?: string): Promise<StoredCard> {
    let profile: MaskedPaymentProfile | undefined;
    if (paymentProfileId) {
      const data = this.expectOk(
        await this.call("getCustomerPaymentProfileRequest", { customerProfileId, customerPaymentProfileId: paymentProfileId }),
      );
      profile = data.paymentProfile as MaskedPaymentProfile | undefined;
    } else {
      const data = this.expectOk(await this.call("getCustomerProfileRequest", { customerProfileId }));
      const all = (data.profile as { paymentProfiles?: MaskedPaymentProfile[] } | undefined)?.paymentProfiles ?? [];
      // Ids are assigned in increasing order, so the largest is the card just saved.
      profile = all
        .filter((p) => p.payment?.creditCard)
        .sort((a, b) => Number(b.customerPaymentProfileId) - Number(a.customerPaymentProfileId))[0];
    }
    const card = profile?.payment?.creditCard;
    if (!profile?.customerPaymentProfileId || !card?.cardNumber) {
      throw new PaymentGatewayError("No saved card was found. Please save your card again.", "no-card");
    }
    return {
      customerProfileId,
      paymentProfileId: profile.customerPaymentProfileId,
      last4: card.cardNumber.slice(-4),
      brand: brandName(card.cardType),
    };
  }

  /** The createTransactionRequest body for a charge of a stored card (members in schema order). */
  chargeRequest(charge: StoredCardCharge) {
    // Session totals and late-cancel fees are merchant-initiated charges of a stored
    // credential. For customer profiles Authorize.net fills in the original network
    // transaction id itself (card-on-file guide), so we only flag the charge.
    const merchantInitiated = charge.reason !== "package";
    return {
      refId: `${charge.bookingId.slice(0, 40)}:${KIND_CODE[charge.reason]}`,
      transactionRequest: {
        transactionType: "authCaptureTransaction",
        amount: money(charge.amount),
        profile: { customerProfileId: charge.customerProfileId, paymentProfile: { paymentProfileId: charge.paymentProfileId } },
        order: { invoiceNumber: invoiceNumber(charge.bookingId, charge.reason), description: DESCRIPTION[charge.reason] },
        transactionSettings: duplicateWindow,
        ...(merchantInitiated
          ? {
              processingOptions: { isSubsequentAuth: "true" },
              subsequentAuthInformation: { reason: charge.reason === "session" ? "delayedCharge" : "noShow" },
            }
          : { processingOptions: { isStoredCredentials: "true" } }),
      },
    };
  }

  /** Sends a createTransactionRequest; a failure after sending means the outcome is unknown, not "failed". */
  private async transact(body: Record<string, unknown>, amount: number): Promise<TransactionResult> {
    let data: ApiResponse;
    try {
      data = await this.call("createTransactionRequest", body);
    } catch (error) {
      if (error instanceof PaymentGatewayError) return unknownOutcome(`${error.code}: ${error.message}`);
      throw error;
    }
    return parseTransaction(data, amount);
  }

  async chargeStoredCard(charge: StoredCardCharge): Promise<TransactionResult> {
    return this.transact(this.chargeRequest(charge), charge.amount);
  }

  /**
   * Reconciliation before a retry: looks for this charge's invoice number among
   * the customer profile's transactions (settled and unsettled) and the
   * account's unsettled ones. Throws if either lookup fails, so the caller
   * keeps the outcome unknown rather than charging.
   */
  async findCharge(charge: StoredCardCharge): Promise<ChargeLookup> {
    const newestFirst = { orderBy: "submitTimeUTC", orderDescending: "true" };
    const [forCustomer, unsettled] = await Promise.all([
      this.call("getTransactionListForCustomerRequest", {
        customerProfileId: charge.customerProfileId,
        customerPaymentProfileId: charge.paymentProfileId,
        sorting: newestFirst,
        paging: { limit: "100", offset: "1" },
      }),
      this.call("getUnsettledTransactionListRequest", { sorting: newestFirst, paging: { limit: "1000", offset: "1" } }),
    ]);
    const list = (d: ApiResponse) => (d.transactions as { transaction?: TransactionSummary[] } | undefined)?.transaction ?? [];
    // An empty list comes back as I00004 "No records found" with resultCode Ok.
    return matchCharge([...list(this.expectOk(forCustomer)), ...list(this.expectOk(unsettled))], invoiceNumber(charge.bookingId, charge.reason));
  }

  async purchase(input: PurchaseInput): Promise<TransactionResult> {
    const { payment } = input;
    return this.transact(
      {
        refId: input.orderId.slice(0, 50),
        transactionRequest: {
          transactionType: "authCaptureTransaction",
          amount: money(input.amount),
          ...("customerProfileId" in payment
            ? { profile: { customerProfileId: payment.customerProfileId, paymentProfile: { paymentProfileId: payment.paymentProfileId } } }
            : { payment: { opaqueData: { dataDescriptor: payment.opaqueDataDescriptor, dataValue: payment.opaqueDataValue } } }),
          order: { invoiceNumber: input.orderId.slice(0, 20), description: input.description.slice(0, 255) },
          transactionSettings: duplicateWindow,
          // The customer chose to pay with a card they saved earlier: a customer-initiated stored-credential charge.
          ...("customerProfileId" in payment ? { processingOptions: { isStoredCredentials: "true" } } : {}),
        },
      },
      input.amount,
    );
  }

  async voidTransaction(transactionId: string): Promise<TransactionResult> {
    const data = await this.call("createTransactionRequest", {
      transactionRequest: { transactionType: "voidTransaction", refTransId: transactionId },
    });
    return parseTransaction(data, 0);
  }

  async refund(input: { transactionId: string; amount: number; customerProfileId: string; paymentProfileId: string }): Promise<TransactionResult> {
    const data = await this.call("createTransactionRequest", {
      transactionRequest: {
        transactionType: "refundTransaction",
        amount: money(input.amount),
        profile: { customerProfileId: input.customerProfileId, paymentProfile: { paymentProfileId: input.paymentProfileId } },
        refTransId: input.transactionId,
      },
    });
    return parseTransaction(data, input.amount);
  }
}
