import { getPaymentGateway } from "@/lib/payments";
import { BadRequestError, handle, readJson, requireString } from "@/lib/payments/http";
import { StubPaymentGateway } from "@/lib/payments/stub-gateway";

/**
 * Test mode only: stands in for Authorize.net's hosted add-payment page. The
 * card number is validated and discarded; only the new payment profile id is
 * returned. With a real gateway configured this route does not exist (404).
 */
export async function POST(request: Request) {
  const gateway = getPaymentGateway();
  if (!(gateway instanceof StubPaymentGateway)) return Response.json({ error: "Not found" }, { status: 404 });
  return handle(async () => {
    const body = await readJson(request);
    const result = await gateway.submitHostedForm(requireString(body, "token"), {
      number: requireString(body, "number", 30),
      expiry: requireString(body, "expiry", 7),
      cvc: requireString(body, "cvc", 4),
    });
    if (!result.ok) throw new BadRequestError(result.message);
    return result;
  });
}
