import { AuthorizeNetGateway } from "./authorize-net-gateway";
import type { PaymentGateway } from "./gateway";
import { StubPaymentGateway } from "./stub-gateway";

/**
 * Server-only. Picks Authorize.net when its credentials are set, otherwise the
 * stub. Credentials are plain (never NEXT_PUBLIC_) env vars, so they stay out
 * of the client bundle.
 */
export function selectPaymentGateway(env: Record<string, string | undefined> = process.env): PaymentGateway {
  const apiLoginId = env.AUTHORIZE_NET_API_LOGIN_ID?.trim();
  const transactionKey = env.AUTHORIZE_NET_TRANSACTION_KEY?.trim();
  if (!apiLoginId || !transactionKey) return new StubPaymentGateway();
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
