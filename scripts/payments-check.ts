/**
 * `npm run payments:check`: checks the Authorize.net credentials in .env.local
 * (or the shell) with authenticateTestRequest, which moves no money. Prints the
 * environment, a masked login ID and the result; never the keys.
 */
import { loadEnvConfig } from "@next/env";
import { checkPaymentsHealth, maskLoginId } from "../lib/payments/health";

loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error });

async function main() {
  const loginId = process.env.AUTHORIZE_NET_API_LOGIN_ID?.trim() ?? "";
  const health = await checkPaymentsHealth(process.env, undefined, { probeOtherEnv: true });

  console.log(`env:      ${process.env.AUTHORIZE_NET_ENV?.trim() || "sandbox (default)"}`);
  console.log(`mode:     ${health.mode}`);
  console.log(`login ID: ${loginId ? maskLoginId(loginId) : "(not set)"}`);
  console.log(`result:   ${health.credentialsOk === true ? "PASS" : health.credentialsOk === false ? "FAIL" : "NOT CHECKED"}`);
  console.log(`message:  ${health.code ? `${health.code} ` : ""}${health.message}`);

  process.exitCode = health.credentialsOk === true ? 0 : 1;
}

void main();
