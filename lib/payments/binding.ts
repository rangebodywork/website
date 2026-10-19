import { createHmac, timingSafeEqual } from "node:crypto";
import { PaymentGatewayNotConfiguredError, type GatewayMode } from "./gateway";

/**
 * Server-signed proof that a browser may act on a customer profile.
 * Authorize.net profile ids are sequential numbers, so the routes never trust
 * a bare id from the browser: `card-form` returns `profileToken`, an HMAC of
 * the id keyed by PAYMENTS_SESSION_SECRET, and card-form reuse, `stored-card`
 * and `charge` require it to match.
 */

export const SECRET_ENV = "PAYMENTS_SESSION_SECRET";
const MIN_SECRET_LENGTH = 32;
/** Only the stub may run without a secret; nothing it signs protects real money. */
const STUB_DEV_SECRET = "stub-only-dev-secret-not-for-real-payments";

/** The signing secret for this mode. Throws (fail closed) for a real gateway without a usable secret. */
export function profileSecret(mode: GatewayMode, env: Record<string, string | undefined> = process.env): string {
  const secret = env[SECRET_ENV]?.trim() ?? "";
  if (secret.length >= MIN_SECRET_LENGTH) return secret;
  if (mode === "stub") return STUB_DEV_SECRET;
  throw new PaymentGatewayNotConfiguredError(
    "profileSecret",
    `${SECRET_ENV} is ${secret ? `shorter than ${MIN_SECRET_LENGTH} characters` : "not set"}; ` +
      "it is required with Authorize.net keys. Generate one with: openssl rand -hex 32",
  );
}

function mac(customerProfileId: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(`customer-profile:${customerProfileId}`).digest();
}

export function signProfile(customerProfileId: string, secret: string): string {
  return mac(customerProfileId, secret).toString("base64url");
}

export function verifyProfile(customerProfileId: string, token: unknown, secret: string): boolean {
  if (typeof token !== "string" || !token) return false;
  const expected = mac(customerProfileId, secret);
  const given = Buffer.from(token, "base64url");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
