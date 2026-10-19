import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { POST as charge } from "../../app/api/payments/charge/route";
import { AuthorizeNetGateway, invoiceNumber, matchCharge } from "./authorize-net-gateway";
import { profileSecret, signProfile } from "./binding";
import { PaymentGatewayError } from "./gateway";
import { chargePlan, statusFor, type BookingPayment, type PaymentRecord } from "./policy";

/** Item: unknown charge outcomes are never retried blindly; a retry reconciles by invoice number first. */

const CHARGE = { customerProfileId: "500123", paymentProfileId: "900007", amount: 120, reason: "session" as const, bookingId: "bk_1" };
const INVOICE = invoiceNumber("bk_1", "session");

function gateway(fetchImpl: typeof fetch) {
  return new AuthorizeNetGateway({ apiLoginId: "login1234", transactionKey: "txkey567890", env: "sandbox", fetch: fetchImpl, timeoutMs: 50 });
}

/** Answers by request root name; records the bodies. */
function byRoot(answers: Record<string, unknown>) {
  const calls: Array<Record<string, Record<string, unknown>>> = [];
  const impl = (async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    calls.push(body);
    const answer = answers[Object.keys(body)[0]];
    if (answer instanceof Error) throw answer;
    return new Response(`﻿${JSON.stringify(answer)}`, { status: 200 });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const listOk = (transaction: unknown[]) => ({
  transactions: { transaction },
  messages: { resultCode: "Ok", message: [{ code: "I00001", text: "Successful." }] },
});

describe("unknown outcomes from the gateway", () => {
  it("treats a timeout or dropped connection after sending as unknown, not failed", async () => {
    // What fetch rejects with when AbortSignal.timeout fires mid-request.
    const timedOut = (async () => {
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    }) as unknown as typeof fetch;
    const r = await gateway(timedOut).chargeStoredCard(CHARGE);
    assert.deepEqual(r, { ok: false, code: "unknown", message: "Outcome unknown. Check Authorize.net before retrying." });

    const reset = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    assert.equal(((await gateway(reset).chargeStoredCard(CHARGE)) as { code: string }).code, "unknown");
  });

  it("treats an HTTP 5xx or unreadable answer as unknown", async () => {
    const http500 = (async () => new Response("oops", { status: 500 })) as unknown as typeof fetch;
    assert.equal(((await gateway(http500).chargeStoredCard(CHARGE)) as { code: string }).code, "unknown");
    const garbage = (async () => new Response("<html>", { status: 200 })) as unknown as typeof fetch;
    assert.equal(((await gateway(garbage).purchase({ amount: 5, description: "x", orderId: "o1", payment: { customerProfileId: "1", paymentProfileId: "2" } })) as { code: string }).code, "unknown");
  });
});

describe("findCharge (reconciliation)", () => {
  it("queries the customer's transactions and the unsettled list, in schema order", async () => {
    const { impl, calls } = byRoot({ getTransactionListForCustomerRequest: listOk([]), getUnsettledTransactionListRequest: listOk([]) });
    assert.deepEqual(await gateway(impl).findCharge(CHARGE), { status: "none" });
    const roots = calls.map((c) => Object.keys(c)[0]).sort();
    assert.deepEqual(roots, ["getTransactionListForCustomerRequest", "getUnsettledTransactionListRequest"]);
    const customer = calls.find((c) => "getTransactionListForCustomerRequest" in c)!.getTransactionListForCustomerRequest;
    assert.deepEqual(Object.keys(customer), ["merchantAuthentication", "customerProfileId", "customerPaymentProfileId", "sorting", "paging"]);
    const unsettled = calls.find((c) => "getUnsettledTransactionListRequest" in c)!.getUnsettledTransactionListRequest;
    assert.deepEqual(Object.keys(unsettled), ["merchantAuthentication", "sorting", "paging"]);
  });

  it("finds an earlier successful attempt by invoice number", async () => {
    const { impl } = byRoot({
      getTransactionListForCustomerRequest: listOk([{ transId: "1", invoiceNumber: "other", transactionStatus: "settledSuccessfully", settleAmount: 9 }]),
      getUnsettledTransactionListRequest: listOk([
        { transId: "60001", invoiceNumber: INVOICE, transactionStatus: "capturedPendingSettlement", settleAmount: 120 },
      ]),
    });
    assert.deepEqual(await gateway(impl).findCharge(CHARGE), { status: "charged", transactionId: "60001", amount: 120 });
  });

  it("throws when a lookup fails, so the caller keeps the outcome unknown", async () => {
    const { impl } = byRoot({ getTransactionListForCustomerRequest: listOk([]), getUnsettledTransactionListRequest: new TypeError("fetch failed") });
    await assert.rejects(gateway(impl).findCharge(CHARGE), PaymentGatewayError);
  });

  it("classifies matches: charged, pending, or nothing that moved money", () => {
    assert.equal(matchCharge([{ transId: "1", invoiceNumber: INVOICE, transactionStatus: "declined" }], INVOICE).status, "none");
    assert.equal(matchCharge([{ transId: "1", invoiceNumber: INVOICE, transactionStatus: "voided" }], INVOICE).status, "none");
    assert.equal(matchCharge([{ transId: "1", invoiceNumber: INVOICE, transactionStatus: "FDSPendingReview" }], INVOICE).status, "pending");
    assert.equal(
      matchCharge(
        [
          { transId: "1", invoiceNumber: INVOICE, transactionStatus: "declined" },
          { transId: "2", invoiceNumber: INVOICE, transactionStatus: "settledSuccessfully", settleAmount: "120.00" },
        ],
        INVOICE,
      ).status,
      "charged",
    );
  });
});

describe("charge route reconcile (stub gateway)", () => {
  it("charges after reconciling finds no earlier attempt", async () => {
    const body = { ...CHARGE, customerProfileId: "stub_cp_1", paymentProfileId: "stub_pp_Visa_1111_ab", reconcile: true };
    const res = await charge(
      new Request("http://localhost/api/payments/charge", {
        method: "POST",
        body: JSON.stringify({ ...body, profileToken: signProfile("stub_cp_1", profileSecret("stub", process.env)) }),
      }),
    );
    assert.equal(res.status, 200);
    assert.equal((await res.json()).ok, true);
  });
});

describe("client-side policy", () => {
  const record = (r: Partial<PaymentRecord>): PaymentRecord => ({ id: "r", kind: "session", amount: 120, at: "", ok: false, ...r });
  const payment = (transactions: PaymentRecord[]): BookingPayment => ({
    card: { customerProfileId: "1", paymentProfileId: "2", last4: "1111", brand: "Visa", profileToken: "t" },
    status: transactions.length ? statusFor(transactions.at(-1)!) : "card-on-file",
    transactions,
  });

  it("records an unknown outcome as its own status, not failed", () => {
    assert.equal(statusFor(record({ outcome: "unknown" })), "unknown");
    assert.equal(statusFor(record({})), "failed");
  });

  it("after an unknown outcome only the same charge may run, and only with reconciliation", () => {
    const p = payment([record({ kind: "session", outcome: "unknown" })]);
    assert.deepEqual(chargePlan(p, "session"), { allowed: true, reconcile: true });
    assert.deepEqual(chargePlan(p, "late-cancel-fee"), { allowed: false, reconcile: true });
  });

  it("plain failures retry without reconciliation; a charged session is never charged again", () => {
    assert.deepEqual(chargePlan(payment([record({ kind: "session" })]), "session"), { allowed: true, reconcile: false });
    assert.deepEqual(chargePlan(payment([record({ kind: "session", ok: true })]), "session"), { allowed: false, reconcile: false });
    assert.deepEqual(chargePlan(payment([]), "late-cancel-fee"), { allowed: true, reconcile: false });
  });
});
