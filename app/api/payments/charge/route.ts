import { getPaymentGateway } from "@/lib/payments";
import { unknownOutcome } from "@/lib/payments/authorize-net-gateway";
import { isValidAmount, type ChargeReason, type StoredCardCharge, type TransactionResult } from "@/lib/payments/gateway";
import { BadRequestError, handle, readJson, requireBoundProfile, requireString } from "@/lib/payments/http";

const REASONS: ChargeReason[] = ["session", "late-cancel-fee"];
/** Guard against a typo'd amount until the server owns booking records (see docs/payments.md). */
const MAX_CHARGE = 5000;

/**
 * Charges the card on file: the session total (admin) or a late-cancel fee.
 * A decline is a normal 200 response with `ok: false`; so is `code: "unknown"`,
 * when the processor may have charged but we can't tell.
 *
 * With `reconcile: true` (a retry after an unknown outcome) it first looks for
 * the earlier attempt by invoice number, and charges only if there is none. If
 * the lookup itself fails, the outcome stays unknown and nothing is charged.
 */
export async function POST(request: Request) {
  return handle(async (): Promise<TransactionResult> => {
    const body = await readJson(request);
    const reason = body.reason as ChargeReason;
    if (!REASONS.includes(reason)) throw new BadRequestError('"reason" must be "session" or "late-cancel-fee"');
    if (!isValidAmount(body.amount) || body.amount > MAX_CHARGE) throw new BadRequestError('"amount" is not a valid charge');
    const gateway = getPaymentGateway();
    const charge: StoredCardCharge = {
      customerProfileId: requireBoundProfile(body, gateway.mode),
      paymentProfileId: requireString(body, "paymentProfileId"),
      bookingId: requireString(body, "bookingId", 40),
      amount: body.amount,
      reason,
    };
    if (body.reconcile === true) {
      const found = await gateway.findCharge(charge).catch((error: unknown) => {
        console.error("[payments] reconciliation lookup failed", error instanceof Error ? error.message : error);
        return null;
      });
      if (!found) return unknownOutcome("reconciliation lookup failed; not retried");
      if (found.status === "charged") {
        return { ok: true, transactionId: found.transactionId, amount: found.amount || charge.amount, authCode: "", reconciled: true };
      }
      if (found.status === "pending") return unknownOutcome(`earlier attempt ${found.transactionId} still pending; not retried`);
    }
    return gateway.chargeStoredCard(charge);
  });
}
