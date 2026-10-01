import {
  PaymentGatewayNotConfiguredError,
  type CustomerProfileInput,
  type HostedCardForm,
  type PaymentGateway,
  type PurchaseInput,
  type StoredCard,
  type StoredCardCharge,
  type TransactionResult,
} from "./gateway";

/**
 * Authorize.net over its JSON API (no SDK). Skeleton only: every method
 * throws until we have sandbox keys to build and test against.
 * Design and field mapping: docs/payments.md.
 */

export interface AuthorizeNetConfig {
  apiLoginId: string;
  transactionKey: string;
  /** For verifying webhook `X-ANET-Signature` (HMAC-SHA512). Optional until webhooks exist. */
  signatureKey?: string;
  env: "sandbox" | "production";
}

const ENDPOINTS = {
  sandbox: { api: "https://apitest.authorize.net/xml/v1/request.api", hosted: "https://test.authorize.net/customer/addPayment" },
  production: { api: "https://api.authorize.net/xml/v1/request.api", hosted: "https://accept.authorize.net/customer/addPayment" },
} as const;

export class AuthorizeNetGateway implements PaymentGateway {
  readonly mode: "sandbox" | "production";

  constructor(private readonly config: AuthorizeNetConfig) {
    this.mode = config.env;
  }

  /** Every JSON request carries `merchantAuthentication` as its first member. */
  protected get merchantAuthentication() {
    return { name: this.config.apiLoginId, transactionKey: this.config.transactionKey };
  }

  protected get endpoints() {
    return ENDPOINTS[this.config.env];
  }

  async createCustomerProfile(input: CustomerProfileInput): Promise<{ customerProfileId: string }> {
    // TODO(createCustomerProfileRequest): POST { createCustomerProfileRequest: { merchantAuthentication,
    //   profile: { merchantCustomerId, email, description } } } to this.endpoints.api; read customerProfileId.
    //   https://developer.authorize.net/api/reference/features/customer-profiles.html
    void input;
    throw new PaymentGatewayNotConfiguredError("createCustomerProfile");
  }

  async getHostedCardForm(customerProfileId: string): Promise<HostedCardForm> {
    // TODO(getHostedProfilePageRequest): request a token with hostedProfileSettings
    //   (hostedProfileIFrameCommunicatorUrl, hostedProfileCardCodeRequired, hostedProfileSaveButtonText),
    //   then return { token, formUrl: this.endpoints.hosted }. "Accept Customer" section of
    //   https://developer.authorize.net/api/reference/features/customer-profiles.html
    void customerProfileId;
    throw new PaymentGatewayNotConfiguredError("getHostedCardForm");
  }

  async getStoredCard(customerProfileId: string, paymentProfileId: string): Promise<StoredCard> {
    // TODO(getCustomerPaymentProfileRequest): read payment.creditCard.cardNumber ("XXXX1111") and cardType.
    //   https://developer.authorize.net/api/reference/index.html#customer-profiles-get-customer-payment-profile
    void customerProfileId;
    void paymentProfileId;
    throw new PaymentGatewayNotConfiguredError("getStoredCard");
  }

  async chargeStoredCard(charge: StoredCardCharge): Promise<TransactionResult> {
    // TODO(createTransactionRequest): transactionType "authCaptureTransaction", amount,
    //   profile { customerProfileId, paymentProfile { paymentProfileId } }, order { invoiceNumber: bookingId },
    //   processingOptions { isSubsequentAuth: true }, subsequentAuthInformation { reason: "delayedCharge" | "noShow" }.
    //   Map responseCode 1 -> ok, 2 -> declined, else error.
    //   https://developer.authorize.net/api/reference/index.html#payment-transactions-charge-a-customer-profile
    //   https://developer.authorize.net/api/reference/features/card-on-file.html
    void charge;
    throw new PaymentGatewayNotConfiguredError("chargeStoredCard");
  }

  async purchase(input: PurchaseInput): Promise<TransactionResult> {
    // TODO(packages): authCaptureTransaction with either a profile or opaqueData (Accept Hosted / Accept.js),
    //   processingOptions { isStoredCredentials } when charging a saved card the customer chose.
    //   https://developer.authorize.net/api/reference/features/accept-hosted.html
    void input;
    throw new PaymentGatewayNotConfiguredError("purchase");
  }

  async voidTransaction(transactionId: string): Promise<TransactionResult> {
    // TODO(voidTransaction): transactionType "voidTransaction", refTransId. Only before settlement.
    //   https://developer.authorize.net/api/reference/features/payment_transactions.html
    void transactionId;
    throw new PaymentGatewayNotConfiguredError("voidTransaction");
  }

  async refund(input: { transactionId: string; amount: number; customerProfileId: string; paymentProfileId: string }): Promise<TransactionResult> {
    // TODO(refundTransaction): transactionType "refundTransaction", refTransId, amount, profile. Settled only,
    //   up to the captured amount, within 180 days by default.
    //   https://developer.authorize.net/api/reference/features/payment_transactions.html
    void input;
    throw new PaymentGatewayNotConfiguredError("refund");
  }
}
