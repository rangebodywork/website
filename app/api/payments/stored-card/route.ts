import { getPaymentGateway } from "@/lib/payments";
import { profileSecret, signProfile } from "@/lib/payments/binding";
import { handle, readJson, requireBoundProfile, requireString } from "@/lib/payments/http";

/**
 * Masked details (brand, last4) of the card the hosted form just saved. The
 * Authorize.net form doesn't tell the browser the new payment profile id, so
 * without one the profile's newest card is returned.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const body = await readJson(request);
    const gateway = getPaymentGateway();
    const customerProfileId = requireBoundProfile(body, gateway.mode);
    const paymentProfileId = body.paymentProfileId === undefined ? undefined : requireString(body, "paymentProfileId");
    const card = await gateway.getStoredCard(customerProfileId, paymentProfileId);
    return { ...card, profileToken: signProfile(customerProfileId, profileSecret(gateway.mode)) };
  });
}
