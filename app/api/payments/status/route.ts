import { getPaymentGateway } from "@/lib/payments";
import { handle } from "@/lib/payments/http";

/** Which gateway is active ("stub", "sandbox" or "production"); no secrets. */
export async function GET() {
  return handle(async () => ({ mode: getPaymentGateway().mode }));
}
