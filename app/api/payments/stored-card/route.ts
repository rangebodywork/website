import { getPaymentGateway } from "@/lib/payments";
import { handle, readJson, requireString } from "@/lib/payments/http";

/**
 * Masked details (brand, last4) of the card the hosted form just saved. The
 * Authorize.net form doesn't tell the browser the new payment profile id, so
 * without one the profile's newest card is returned.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const body = await readJson(request);
    const paymentProfileId = body.paymentProfileId === undefined ? undefined : requireString(body, "paymentProfileId");
    return getPaymentGateway().getStoredCard(requireString(body, "customerProfileId"), paymentProfileId);
  });
}
