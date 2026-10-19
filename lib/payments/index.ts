import { AuthorizeNetGateway } from "./authorize-net-gateway";
import { profileSecret } from "./binding";
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
 * AUTHORIZE_NET_ENV defaults to sandbox; production is refused (routes answer
 * 503, status says "disabled") unless AUTHORIZE_NET_ALLOW_PRODUCTION=1.
 */
export function selectPaymentGateway(
  env: Record<string, string | undefined> = process.env,
  options: { fetch?: typeof fetch } = {},
): PaymentGateway {
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
    throw new PaymentGatewayNotConfiguredError(
      "selectPaymentGateway",
      `AUTHORIZE_NET_ENV must be "sandbox" or "production", got "${mode}"`,
    );
  }
  if (mode === "production" && env.AUTHORIZE_NET_ALLOW_PRODUCTION?.trim() !== "1") {
    throw new PaymentGatewayNotConfiguredError(
      "selectPaymentGateway",
      "Refusing AUTHORIZE_NET_ENV=production: real charges stay off until the go-live checklist in " +
        "docs/payments.md is done (server-side bookings and amounts, real admin auth), then " +
        "AUTHORIZE_NET_ALLOW_PRODUCTION=1 is set.",
    );
  }
  // Fail closed without the secret that binds customer profiles to the browser (see binding.ts).
  profileSecret(mode, env);
  return new AuthorizeNetGateway({
    apiLoginId,
    transactionKey,
    signatureKey: env.AUTHORIZE_NET_SIGNATURE_KEY?.trim() || undefined,
    env: mode,
    fetch: options.fetch,
  });
}

let gateway: PaymentGateway | null = null;

export function getPaymentGateway(): PaymentGateway {
  gateway ??= selectPaymentGateway();
  return gateway;
}
