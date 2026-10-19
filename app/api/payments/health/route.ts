import { handle } from "@/lib/payments/http";
import { cachedPaymentsHealth } from "@/lib/payments/health";

/**
 * Checks the Authorize.net credentials from outside (e.g. against a Vercel
 * deployment): `{ mode, credentialsOk, code, message }`, never any key. The
 * result is cached for 60 seconds so this public route can't be used to hammer
 * Authorize.net. It only talks to the configured environment; the
 * "keys for the other environment" hint is `npm run payments:check`'s job.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const { mode, credentialsOk, code, message } = await cachedPaymentsHealth();
    return { mode, credentialsOk, code, message };
  });
}
