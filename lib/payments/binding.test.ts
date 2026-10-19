import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { POST as charge } from "../../app/api/payments/charge/route";
import { POST as storedCard } from "../../app/api/payments/stored-card/route";
import { POST as cardForm } from "../../app/api/payments/card-form/route";
import { profileSecret, signProfile, verifyProfile } from "./binding";
import { PaymentGatewayNotConfiguredError } from "./gateway";
import { selectPaymentGateway } from "./index";

/** Item: customer profile ids are bound to the browser by a server-signed token. */

const SECRET = "f".repeat(64);
const KEYS = { AUTHORIZE_NET_API_LOGIN_ID: "login1234", AUTHORIZE_NET_TRANSACTION_KEY: "txkey567890" };

const post = (body: unknown) =>
  new Request("http://localhost/api/payments/x", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

describe("profile binding", () => {
  it("verifies only the token signed for that profile id and secret", () => {
    const token = signProfile("500123", SECRET);
    assert.equal(verifyProfile("500123", token, SECRET), true);
    assert.equal(verifyProfile("500124", token, SECRET), false);
    assert.equal(verifyProfile("500123", token, "e".repeat(64)), false);
    assert.equal(verifyProfile("500123", undefined, SECRET), false);
    assert.equal(verifyProfile("500123", "", SECRET), false);
    assert.equal(verifyProfile("500123", token.slice(0, -2), SECRET), false);
  });

  it("fails closed for a real gateway without a usable secret, with the openssl hint", () => {
    for (const secret of [undefined, "", "too-short"]) {
      assert.throws(
        () => profileSecret("sandbox", { PAYMENTS_SESSION_SECRET: secret }),
        (e: unknown) => e instanceof PaymentGatewayNotConfiguredError && /openssl rand -hex 32/.test(e.message),
      );
      assert.throws(() => selectPaymentGateway({ ...KEYS, PAYMENTS_SESSION_SECRET: secret }), PaymentGatewayNotConfiguredError);
    }
    assert.equal(selectPaymentGateway({ ...KEYS, PAYMENTS_SESSION_SECRET: SECRET }).mode, "sandbox");
  });

  it("lets the stub use a dev default secret", () => {
    assert.ok(profileSecret("stub", {}).length >= 32);
    assert.equal(profileSecret("stub", { PAYMENTS_SESSION_SECRET: SECRET }), SECRET);
  });
});

// These run against the stub gateway (no AUTHORIZE_NET_* keys in the test env).
describe("payment routes require the binding", () => {
  const stubToken = (id: string) => signProfile(id, profileSecret("stub", process.env));
  const chargeBody = { customerProfileId: "stub_cp_1", paymentProfileId: "stub_pp_Visa_1111_ab", amount: 10, reason: "session", bookingId: "b1" };

  it("card-form returns a profileToken for the profile it created", async () => {
    const res = await cardForm(post({ merchantCustomerId: "c1" }));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(verifyProfile(body.customerProfileId, body.profileToken, profileSecret("stub", process.env)), true);
  });

  it("card-form refuses to reuse a profile without its token", async () => {
    const res = await cardForm(post({ merchantCustomerId: "c1", customerProfileId: "stub_cp_1" }));
    assert.equal(res.status, 403);
  });

  it("stored-card refuses a missing or forged token", async () => {
    for (const profileToken of [undefined, "forged", stubToken("stub_cp_2")]) {
      const res = await storedCard(post({ customerProfileId: "stub_cp_1", paymentProfileId: "stub_pp_Visa_1111_ab", profileToken }));
      assert.equal(res.status, 403);
    }
  });

  it("charge refuses a missing or forged token and accepts the signed one", async () => {
    assert.equal((await charge(post(chargeBody))).status, 403);
    assert.equal((await charge(post({ ...chargeBody, profileToken: stubToken("stub_cp_2") }))).status, 403);
    const ok = await charge(post({ ...chargeBody, profileToken: stubToken("stub_cp_1") }));
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).ok, true);
  });
});
