import { getPaymentGateway } from "@/lib/payments";
import { handle, readJson, requireString } from "@/lib/payments/http";

/** Masked details (brand, last4) of the card the hosted form just saved. */
export async function POST(request: Request) {
  return handle(async () => {
    const body = await readJson(request);
    return getPaymentGateway().getStoredCard(requireString(body, "customerProfileId"), requireString(body, "paymentProfileId"));
  });
}
