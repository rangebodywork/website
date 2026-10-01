import { AuthorizeNetGateway } from "./authorize-net-gateway";
import { PaymentGatewayNotConfiguredError, type PaymentGateway } from "./gateway";
import { StubPaymentGateway } from "./stub-gateway";

/** A production build (`next start`, or a Vercel production deployment). */
export function isProductionRuntime(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV === "production" || env.VERCEL_ENV === "production";
}

/**
 * Server-only. Picks Authorize.net when its credentials are set, otherwise the
 * stub. Fails closed: in production without keys the stub is refused (every
 * payment route answers 503) unless PAYMENTS_ALLOW_STUB=1. Credentials are
 * plain (never NEXT_PUBLIC_) env vars, so they stay out of the client bundle.
 */
export function selectPaymentGateway(env: Record<string, string | undefined> = process.env): PaymentGateway {
  const apiLoginId = env.AUTHORIZE_NET_API_LOGIN_ID?.trim();
  const transactionKey = env.AUTHORIZE_NET_TRANSACTION_KEY?.trim();
  if (!apiLoginId || !transactionKey) {
    if (isProductionRuntime(env) && env.PAYMENTS_ALLOW_STUB?.trim() !== "1") {
      throw new PaymentGatewayNotConfiguredError(
        "selectPaymentGateway",
        "Refusing to use the stub payment gateway in production: set the AUTHORIZE_NET_* keys, " +
          "or PAYMENTS_ALLOW_STUB=1 for a demo deployment.",
      );
    }
    return new StubPaymentGateway();
  }
  const mode = env.AUTHORIZE_NET_ENV?.trim() || "sandbox";
  if (mode !== "sandbox" && mode !== "production") {
    throw new Error(`AUTHORIZE_NET_ENV must be "sandbox" or "production", got "${mode}"`);
  }
  return new AuthorizeNetGateway({
    apiLoginId,
    transactionKey,
    signatureKey: env.AUTHORIZE_NET_SIGNATURE_KEY?.trim() || undefined,
    env: mode,
  });
}

let gateway: PaymentGateway | null = null;

export function getPaymentGateway(): PaymentGateway {
  gateway ??= selectPaymentGateway();
  return gateway;
}
