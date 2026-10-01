import { getPaymentGateway } from "@/lib/payments";
import { PaymentGatewayNotConfiguredError } from "@/lib/payments/gateway";
import { handle } from "@/lib/payments/http";

/** Which gateway is active ("stub", "sandbox", "production", or "disabled" when it refuses to start); no secrets. */
export async function GET() {
  return handle(async () => {
    try {
      return { mode: getPaymentGateway().mode };
    } catch (error) {
      if (error instanceof PaymentGatewayNotConfiguredError) return { mode: "disabled" as const };
      throw error;
    }
  });
}
