import { profileSecret, verifyProfile } from "./binding";
import { PaymentGatewayError, PaymentGatewayNotConfiguredError, type GatewayMode } from "./gateway";

/** Shared plumbing for the `app/api/payments` route handlers. */

export class BadRequestError extends Error {}
export class NotFoundError extends Error {}
export class ForbiddenError extends Error {}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    if (typeof body === "object" && body !== null && !Array.isArray(body)) return body as Record<string, unknown>;
  } catch {
    // Fall through.
  }
  throw new BadRequestError("Expected a JSON object body");
}

export function requireString(body: Record<string, unknown>, key: string, maxLength = 200): string {
  const value = body[key];
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new BadRequestError(`"${key}" is required`);
  }
  return value.trim();
}

/**
 * The body's `customerProfileId`, after checking the `profileToken` that
 * card-form signed for it. A bare (guessable) profile id is never enough.
 */
export function requireBoundProfile(body: Record<string, unknown>, mode: GatewayMode): string {
  const customerProfileId = requireString(body, "customerProfileId");
  if (!verifyProfile(customerProfileId, body.profileToken, profileSecret(mode))) {
    throw new ForbiddenError("profileToken does not match customerProfileId");
  }
  return customerProfileId;
}

/** Runs a handler and turns known failures into JSON errors; never echoes request bodies. */
export async function handle(run: () => Promise<unknown>): Promise<Response> {
  try {
    return Response.json(await run(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof BadRequestError) return Response.json({ error: error.message }, { status: 400 });
    if (error instanceof NotFoundError) return Response.json({ error: "Not found" }, { status: 404 });
    if (error instanceof ForbiddenError) {
      console.error("[payments]", error.message);
      return Response.json({ error: "This card isn't linked to your booking. Please save your card again." }, { status: 403 });
    }
    if (error instanceof PaymentGatewayNotConfiguredError) {
      console.error("[payments]", error.message);
      return Response.json({ error: "Payments are not set up yet. Please contact the studio." }, { status: 503 });
    }
    if (error instanceof PaymentGatewayError) {
      console.error("[payments]", error.code ?? "", error.message);
      return Response.json({ error: error.publicMessage }, { status: 502 });
    }
    console.error("[payments] unexpected error", error);
    return Response.json({ error: "Payment service error" }, { status: 502 });
  }
}
