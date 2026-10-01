import { getPaymentGateway } from "@/lib/payments";
import { handle, readJson, requireString } from "@/lib/payments/http";

/**
 * Starts "save a card on file": creates (or reuses) the customer profile and
 * returns a hosted-form token. No charge happens here.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const body = await readJson(request);
    const gateway = getPaymentGateway();
    const existing = typeof body.customerProfileId === "string" ? body.customerProfileId : "";
    const customerProfileId =
      existing ||
      (
        await gateway.createCustomerProfile({
          merchantCustomerId: requireString(body, "merchantCustomerId", 20),
          email: typeof body.email === "string" ? body.email.slice(0, 255) : undefined,
          description: typeof body.name === "string" ? body.name.slice(0, 255) : undefined,
        })
      ).customerProfileId;
    const form = await gateway.getHostedCardForm(customerProfileId);
    return { mode: gateway.mode, customerProfileId, ...form };
  });
}
