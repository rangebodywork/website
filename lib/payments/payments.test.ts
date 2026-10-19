import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AuthorizeNetGateway, ENDPOINTS, invoiceNumber, parseTransaction } from "./authorize-net-gateway";
import { PaymentGatewayError, PaymentGatewayNotConfiguredError } from "./gateway";
import { checkPaymentsHealth, isValidSignatureKey, maskLoginId } from "./health";
import { selectPaymentGateway } from "./index";
import { StubPaymentGateway } from "./stub-gateway";

/** Unit tests: env selection, request shapes and response parsing, with a mocked fetch. */

const KEYS = { AUTHORIZE_NET_API_LOGIN_ID: "login1234", AUTHORIZE_NET_TRANSACTION_KEY: "txkey567890" };

type Call = { url: string; body: Record<string, Record<string, unknown>> };

/** A fetch that answers each request with the next queued body (as Authorize.net does: with a BOM). */
function mockFetch(...responses: Array<Record<string, unknown> | ((url: string) => Record<string, unknown>)>) {
  const calls: Call[] = [];
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    const next = responses.shift();
    if (!next) throw new Error("unexpected request");
    const body = typeof next === "function" ? next(String(url)) : next;
    return new Response(`﻿${JSON.stringify(body)}`, { status: 200 });
  }) as typeof fetch;
  return { impl, calls };
}

const ok = (extra: Record<string, unknown> = {}) => ({ messages: { resultCode: "Ok", message: [{ code: "I00001", text: "Successful." }] }, ...extra });
const err = (code: string, text: string, extra: Record<string, unknown> = {}) => ({
  messages: { resultCode: "Error", message: [{ code, text }] },
  ...extra,
});
const AUTH_FAILED = err("E00007", "User authentication failed due to invalid authentication values.");

function gateway(fetchImpl: typeof fetch, env: "sandbox" | "production" = "sandbox") {
  return new AuthorizeNetGateway({ apiLoginId: "login1234", transactionKey: "txkey567890", env, fetch: fetchImpl });
}

describe("selectPaymentGateway", () => {
  it("uses the stub without keys outside production", () => {
    assert.ok(selectPaymentGateway({}) instanceof StubPaymentGateway);
  });

  it("refuses the stub in production without keys", () => {
    assert.throws(() => selectPaymentGateway({ VERCEL_ENV: "production" }), PaymentGatewayNotConfiguredError);
  });

  it("defaults to the sandbox when keys are set", () => {
    const g = selectPaymentGateway(KEYS);
    assert.ok(g instanceof AuthorizeNetGateway);
    assert.equal(g.mode, "sandbox");
  });

  it("refuses AUTHORIZE_NET_ENV=production without AUTHORIZE_NET_ALLOW_PRODUCTION=1", () => {
    for (const allow of [undefined, "", "0", "true", "yes"]) {
      assert.throws(
        () => selectPaymentGateway({ ...KEYS, AUTHORIZE_NET_ENV: "production", AUTHORIZE_NET_ALLOW_PRODUCTION: allow }),
        (e: unknown) => e instanceof PaymentGatewayNotConfiguredError && /AUTHORIZE_NET_ALLOW_PRODUCTION=1/.test(e.message),
      );
    }
  });

  it("allows production only with the explicit flag", () => {
    const g = selectPaymentGateway({ ...KEYS, AUTHORIZE_NET_ENV: "production", AUTHORIZE_NET_ALLOW_PRODUCTION: "1" });
    assert.equal(g.mode, "production");
  });

  it("fails closed on an unknown AUTHORIZE_NET_ENV", () => {
    assert.throws(() => selectPaymentGateway({ ...KEYS, AUTHORIZE_NET_ENV: "live" }), PaymentGatewayNotConfiguredError);
  });
});

describe("AuthorizeNetGateway requests", () => {
  it("posts to the sandbox endpoint with merchantAuthentication first", async () => {
    const { impl, calls } = mockFetch(ok({ customerProfileId: "500123" }));
    assert.deepEqual(await gateway(impl).createCustomerProfile({ merchantCustomerId: "c123", email: "a@b.co" }), {
      customerProfileId: "500123",
    });
    assert.equal(calls[0].url, ENDPOINTS.sandbox.api);
    const req = calls[0].body.createCustomerProfileRequest;
    assert.deepEqual(Object.keys(req), ["merchantAuthentication", "profile"]);
    assert.deepEqual(req.merchantAuthentication, { name: "login1234", transactionKey: "txkey567890" });
  });

  it("uses the production endpoint and hosted page in production", async () => {
    const { impl, calls } = mockFetch(ok({ token: "tok" }));
    const form = await gateway(impl, "production").getHostedCardForm("500123");
    assert.equal(calls[0].url, ENDPOINTS.production.api);
    assert.equal(form.formUrl, "https://accept.authorize.net/customer/addPayment");
  });

  it("reuses the existing profile on a duplicate (E00039)", async () => {
    const { impl } = mockFetch(err("E00039", "A duplicate record with ID 987654 already exists."));
    assert.deepEqual(await gateway(impl).createCustomerProfile({ merchantCustomerId: "c1" }), { customerProfileId: "987654" });
  });

  it("asks for a liveMode hosted form token and only passes an https communicator", async () => {
    const { impl, calls } = mockFetch(ok({ token: "abc" }), ok({ token: "def" }));
    const form = await gateway(impl).getHostedCardForm("500123", { iframeCommunicatorUrl: "https://x.test/c.html" });
    assert.deepEqual(form, { token: "abc", formUrl: "https://test.authorize.net/customer/addPayment" });
    const settings = (calls[0].body.getHostedProfilePageRequest.hostedProfileSettings as { setting: Array<{ settingName: string; settingValue: string }> }).setting;
    assert.deepEqual(settings.find((s) => s.settingName === "hostedProfileValidationMode"), {
      settingName: "hostedProfileValidationMode",
      settingValue: "liveMode",
    });
    assert.equal(settings.find((s) => s.settingName === "hostedProfileIFrameCommunicatorUrl")?.settingValue, "https://x.test/c.html");

    await gateway(impl).getHostedCardForm("500123", { iframeCommunicatorUrl: "http://localhost:3000/c.html" });
    const plain = (calls[1].body.getHostedProfilePageRequest.hostedProfileSettings as { setting: Array<{ settingName: string }> }).setting;
    assert.equal(plain.some((s) => s.settingName === "hostedProfileIFrameCommunicatorUrl"), false);
  });

  it("reads the newest saved card when no payment profile id is given", async () => {
    const { impl, calls } = mockFetch(
      ok({
        profile: {
          paymentProfiles: [
            { customerPaymentProfileId: "900001", payment: { creditCard: { cardNumber: "XXXX1111", cardType: "Visa" } } },
            { customerPaymentProfileId: "900007", payment: { creditCard: { cardNumber: "XXXX0015", cardType: "MasterCard" } } },
          ],
        },
      }),
    );
    assert.deepEqual(await gateway(impl).getStoredCard("500123"), {
      customerProfileId: "500123",
      paymentProfileId: "900007",
      last4: "0015",
      brand: "Mastercard",
    });
    assert.ok("getCustomerProfileRequest" in calls[0].body);
  });

  it("builds a merchant-initiated card-on-file charge in schema order", async () => {
    const { impl, calls } = mockFetch(ok({ transactionResponse: { responseCode: "1", transId: "60001", authCode: "ABC123" } }));
    const result = await gateway(impl).chargeStoredCard({
      customerProfileId: "500123",
      paymentProfileId: "900007",
      amount: 120,
      reason: "session",
      bookingId: "bk_1",
    });
    assert.deepEqual(result, { ok: true, transactionId: "60001", amount: 120, authCode: "ABC123" });
    const req = calls[0].body.createTransactionRequest;
    assert.deepEqual(Object.keys(req), ["merchantAuthentication", "refId", "transactionRequest"]);
    const tx = req.transactionRequest as Record<string, unknown>;
    assert.deepEqual(Object.keys(tx), [
      "transactionType",
      "amount",
      "profile",
      "order",
      "transactionSettings",
      "processingOptions",
      "subsequentAuthInformation",
    ]);
    assert.equal(tx.transactionType, "authCaptureTransaction");
    assert.equal(tx.amount, "120.00");
    assert.deepEqual(tx.profile, { customerProfileId: "500123", paymentProfile: { paymentProfileId: "900007" } });
    assert.deepEqual(tx.processingOptions, { isSubsequentAuth: "true" });
    assert.deepEqual(tx.subsequentAuthInformation, { reason: "delayedCharge" });
    assert.deepEqual(tx.transactionSettings, { setting: [{ settingName: "duplicateWindow", settingValue: "120" }] });
  });

  it("flags a late-cancel fee as noShow with its own invoice number", () => {
    const g = gateway(mockFetch().impl);
    const base = { customerProfileId: "1", paymentProfileId: "2", amount: 35, bookingId: "bk_1" };
    const fee = g.chargeRequest({ ...base, reason: "late-cancel-fee" }).transactionRequest;
    const session = g.chargeRequest({ ...base, reason: "session" }).transactionRequest;
    assert.deepEqual((fee as Record<string, unknown>).subsequentAuthInformation, { reason: "noShow" });
    assert.notEqual(fee.order.invoiceNumber, session.order.invoiceNumber);
    assert.equal(fee.order.invoiceNumber, invoiceNumber("bk_1", "late-cancel-fee"));
    assert.ok(fee.order.invoiceNumber.length <= 20);
  });

  it("orders refund members per the schema", async () => {
    const { impl, calls } = mockFetch(ok({ transactionResponse: { responseCode: "1", transId: "7", authCode: "" } }));
    await gateway(impl).refund({ transactionId: "60001", amount: 10, customerProfileId: "1", paymentProfileId: "2" });
    const tx = calls[0].body.createTransactionRequest.transactionRequest as Record<string, unknown>;
    assert.deepEqual(Object.keys(tx), ["transactionType", "amount", "profile", "refTransId"]);
  });

  it("turns API errors into PaymentGatewayError with an environment hint, never echoing keys", async () => {
    const { impl } = mockFetch(AUTH_FAILED);
    await assert.rejects(gateway(impl).getHostedCardForm("1"), (e: unknown) => {
      assert.ok(e instanceof PaymentGatewayError);
      assert.equal(e.code, "E00007");
      assert.match(e.message, /AUTHORIZE_NET_ENV=sandbox/);
      assert.doesNotMatch(e.message, /txkey567890|login1234/);
      return true;
    });
  });

  it("reports an HTTP failure as a PaymentGatewayError", async () => {
    const impl = (async () => new Response("nope", { status: 503 })) as unknown as typeof fetch;
    await assert.rejects(gateway(impl).getStoredCard("1", "2"), PaymentGatewayError);
  });
});

describe("parseTransaction", () => {
  it("maps a decline (responseCode 2)", () => {
    const r = parseTransaction(
      err("E00027", "The transaction was unsuccessful.", {
        transactionResponse: { responseCode: "2", errors: { error: [{ errorCode: "2", errorText: "This transaction has been declined." }] } },
      }),
      10,
    );
    assert.deepEqual(r, { ok: false, code: "declined", message: "This transaction has been declined." });
  });

  it("maps a duplicate-window rejection (error 11)", () => {
    const r = parseTransaction(
      err("E00027", "The transaction was unsuccessful.", {
        transactionResponse: { responseCode: "3", errors: { error: [{ errorCode: "11", errorText: "A duplicate transaction has been submitted." }] } },
      }),
      10,
    );
    assert.equal(r.ok, false);
    assert.equal(!r.ok && r.code, "duplicate");
  });

  it("maps held-for-review and missing transaction responses to errors", () => {
    const held = parseTransaction(ok({ transactionResponse: { responseCode: "4", transId: "9" } }), 10);
    assert.equal(!held.ok && held.code, "error");
    const none = parseTransaction(err("E00003", "Invalid element."), 10);
    assert.deepEqual(none, { ok: false, code: "error", message: "Invalid element. (E00003)" });
  });
});

describe("authenticate / health", () => {
  it("passes on I00001", async () => {
    const { impl, calls } = mockFetch(ok());
    const health = await checkPaymentsHealth(KEYS, impl);
    assert.deepEqual(health, { mode: "sandbox", credentialsOk: true, code: "I00001", message: "Successful." });
    assert.deepEqual(Object.keys(calls[0].body.authenticateTestRequest), ["merchantAuthentication"]);
  });

  it("says when sandbox-configured keys belong to production", async () => {
    const { impl, calls } = mockFetch(AUTH_FAILED, ok());
    const health = await checkPaymentsHealth(KEYS, impl);
    assert.equal(health.credentialsOk, false);
    assert.match(health.message, /These look like production keys but AUTHORIZE_NET_ENV=sandbox/);
    assert.deepEqual(
      calls.map((c) => c.url),
      [ENDPOINTS.sandbox.api, ENDPOINTS.production.api],
    );
  });

  it("says when the keys are wrong in both environments", async () => {
    const { impl } = mockFetch(AUTH_FAILED, AUTH_FAILED);
    const health = await checkPaymentsHealth(KEYS, impl);
    assert.equal(health.credentialsOk, false);
    assert.match(health.message, /look wrong rather than swapped/);
  });

  it("reports production as disabled without calling Authorize.net", async () => {
    const { impl, calls } = mockFetch();
    const health = await checkPaymentsHealth({ ...KEYS, AUTHORIZE_NET_ENV: "production" }, impl);
    assert.equal(health.mode, "disabled");
    assert.equal(health.credentialsOk, null);
    assert.equal(calls.length, 0);
  });

  it("does not check the stub", async () => {
    assert.deepEqual((await checkPaymentsHealth({})).credentialsOk, null);
  });

  it("validates a set signature key", async () => {
    assert.equal(isValidSignatureKey("ab".repeat(64)), true);
    assert.equal(isValidSignatureKey("ab".repeat(63)), false);
    assert.equal(isValidSignatureKey("zz".repeat(64)), false);
    const { impl } = mockFetch(ok());
    const health = await checkPaymentsHealth({ ...KEYS, AUTHORIZE_NET_SIGNATURE_KEY: "not-hex" }, impl);
    assert.equal(health.credentialsOk, false);
    assert.match(health.message, /AUTHORIZE_NET_SIGNATURE_KEY/);
  });

  it("masks the login ID to its first and last two characters", () => {
    assert.equal(maskLoginId("5KP3u95bQpv"), "5K*******pv");
    assert.equal(maskLoginId("abcd"), "****");
  });
});
