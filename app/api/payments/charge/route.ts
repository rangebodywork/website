import { getPaymentGateway } from "@/lib/payments";
import { isValidAmount, type ChargeReason } from "@/lib/payments/gateway";
import { BadRequestError, handle, readJson, requireString } from "@/lib/payments/http";

const REASONS: ChargeReason[] = ["session", "late-cancel-fee"];
/** Guard against a typo'd amount until the server owns booking records (see docs/payments.md). */
const MAX_CHARGE = 5000;

/**
 * Charges the card on file: the session total (admin) or a late-cancel fee.
 * A decline is a normal 200 response with `ok: false`.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const body = await readJson(request);
    const reason = body.reason as ChargeReason;
    if (!REASONS.includes(reason)) throw new BadRequestError('"reason" must be "session" or "late-cancel-fee"');
    if (!isValidAmount(body.amount) || body.amount > MAX_CHARGE) throw new BadRequestError('"amount" is not a valid charge');
    return getPaymentGateway().chargeStoredCard({
      customerProfileId: requireString(body, "customerProfileId"),
      paymentProfileId: requireString(body, "paymentProfileId"),
      bookingId: requireString(body, "bookingId", 40),
      amount: body.amount,
      reason,
    });
  });
}
