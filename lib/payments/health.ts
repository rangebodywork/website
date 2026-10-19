import { AuthorizeNetGateway } from "./authorize-net-gateway";
import { PaymentGatewayError, PaymentGatewayNotConfiguredError, type GatewayMode } from "./gateway";
import { selectPaymentGateway } from "./index";

/**
 * Server-only credential check shared by `GET /api/payments/health` and
 * `npm run payments:check`. Calls authenticateTestRequest (moves no money) and
 * reports only the mode, pass/fail and Authorize.net's own result message.
 */

export interface PaymentsHealth {
  mode: GatewayMode | "disabled";
  /** null when there is nothing to check (stub, or payments disabled). */
  credentialsOk: boolean | null;
  /** Authorize.net result code (e.g. "I00001", "E00007"), when it answered. */
  code?: string;
  message: string;
}

/** The webhook Signature Key is 128 hex characters (a 64-byte HMAC-SHA512 key). */
export function isValidSignatureKey(key: string): boolean {
  return /^[0-9a-fA-F]{128}$/.test(key);
}

/** "ab****yz": first 2 and last 2 characters only. */
export function maskLoginId(id: string): string {
  return id.length <= 4 ? "*".repeat(id.length) : `${id.slice(0, 2)}${"*".repeat(id.length - 4)}${id.slice(-2)}`;
}

/**
 * `probeOtherEnv`: on an authentication failure, also try the other
 * environment to say "these look like production keys". Only `payments:check`
 * does this; the public health route talks to the configured environment only.
 */
export async function checkPaymentsHealth(
  env: Record<string, string | undefined> = process.env,
  fetchImpl?: typeof fetch,
  options: { probeOtherEnv?: boolean } = {},
): Promise<PaymentsHealth> {
  let gateway;
  try {
    gateway = selectPaymentGateway(env, { fetch: fetchImpl });
  } catch (error) {
    if (error instanceof PaymentGatewayNotConfiguredError) return { mode: "disabled", credentialsOk: null, message: error.message };
    throw error;
  }
  if (!(gateway instanceof AuthorizeNetGateway)) {
    return { mode: gateway.mode, credentialsOk: null, message: "Stub gateway: no Authorize.net credentials to check." };
  }
  let auth;
  try {
    auth = await gateway.authenticate({ probeOtherEnv: options.probeOtherEnv ?? false });
  } catch (error) {
    if (error instanceof PaymentGatewayError) return { mode: gateway.mode, credentialsOk: false, message: error.message };
    throw error;
  }
  const signatureKey = env.AUTHORIZE_NET_SIGNATURE_KEY?.trim();
  if (auth.ok && signatureKey && !isValidSignatureKey(signatureKey)) {
    return {
      mode: gateway.mode,
      credentialsOk: false,
      code: auth.code,
      message: `${auth.message} But AUTHORIZE_NET_SIGNATURE_KEY is not a 128-character hex string.`,
    };
  }
  return { mode: gateway.mode, credentialsOk: auth.ok, code: auth.code, message: auth.message };
}

const CACHE_MS = 60_000;
let cached: { at: number; result: Promise<PaymentsHealth> } | null = null;

/**
 * At most one Authorize.net call per minute per server instance, however often
 * the public health route is hit. Failures are cached too.
 */
export function cachedPaymentsHealth(now = Date.now()): Promise<PaymentsHealth> {
  if (!cached || now - cached.at >= CACHE_MS) {
    cached = { at: now, result: checkPaymentsHealth() };
  }
  return cached.result;
}
