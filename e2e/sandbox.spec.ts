import { expect, test, type Page } from "@playwright/test";
import { dateFromToday, go, readDb, signIn } from "./helpers";

/*
 * Authorize.net SANDBOX flow: save a card through the hosted profile page,
 * confirm a booking (no charge), admin charges the session, then a second
 * booking is cancelled late and the fee is charged. Runs only when sandbox
 * keys are set (see playwright.config.ts); otherwise every test is skipped.
 *
 * The hosted form is Authorize.net's page, so its field selectors below are
 * best guesses (id or label) until this has run against the sandbox once.
 * Test card: https://developer.authorize.net/hello_world/testing_guide.html
 */

const hasKeys =
  !!process.env.AUTHORIZE_NET_API_LOGIN_ID?.trim() &&
  !!process.env.AUTHORIZE_NET_TRANSACTION_KEY?.trim() &&
  (process.env.AUTHORIZE_NET_ENV?.trim() || "sandbox") === "sandbox";

test.skip(!hasKeys, "Authorize.net sandbox keys are not set (AUTHORIZE_NET_API_LOGIN_ID / AUTHORIZE_NET_TRANSACTION_KEY)");
test.describe.configure({ timeout: 180_000 });

const SANDBOX_VISA = "4111111111111111";

interface Booking {
  id: string;
  status: string;
  payment?: {
    status: string;
    card: { last4: string; brand: string; paymentProfileId: string };
    transactions: Array<{ kind: string; amount: number; ok: boolean; transactionId?: string; message?: string }>;
  };
}

async function bookings(page: Page): Promise<Booking[]> {
  return (await readDb(page))?.bookings ?? [];
}

/** Fills Authorize.net's hosted add-payment form inside our iframe. */
async function saveSandboxCard(page: Page) {
  await page.getByLabel(/I authorize Soma Studio/).check();
  await page.getByRole("button", { name: "Save card on file" }).click();
  await expect(page.getByText(/Sandbox · Authorize.net test account/)).toBeVisible();
  const frame = page.frameLocator('iframe[name="anet-add-payment"]');
  const field = (id: string, label: RegExp) => frame.locator(`#${id}`).or(frame.getByLabel(label)).first();
  await field("cardNum", /card number/i).fill(SANDBOX_VISA);
  const nextYear = String((new Date().getFullYear() + 2) % 100).padStart(2, "0");
  await field("expiryDate", /expiration/i).fill(`12${nextYear}`);
  await field("cvv", /card code|cvv|security/i).fill("123");
  await frame.getByRole("button", { name: /save/i }).click();
  // On an http dev server Authorize.net can't reach our communicator, so confirm by hand.
  const savedLine = page.getByText(/ending 1111 saved/);
  await page.waitForTimeout(5_000);
  if (!(await savedLine.isVisible())) await page.getByRole("button", { name: "I've saved my card" }).click();
  await expect(savedLine).toBeVisible({ timeout: 30_000 });
}

async function bookWithSandboxCard(page: Page): Promise<Booking> {
  const before = (await bookings(page)).length;
  await go(page, "/intake");
  await page.getByRole("radiogroup", { name: "Session date" }).getByRole("radio").first().click();
  await page.locator("#full-name").fill("Sandbox Client");
  await page.locator("#client-phone").fill("555 222 3333");
  await page.locator("#emergency-phone").fill("Friend 555 444 5555");
  const consents = page.locator("fieldset input[type=checkbox]");
  await consents.nth(0).check();
  await consents.nth(2).check();
  await go(page, "/review");
  await saveSandboxCard(page);
  await page.getByRole("button", { name: /Confirm & Reserve/ }).click();
  await expect(page.getByText(/Reference SOMA-/).first()).toBeVisible();
  const all = await bookings(page);
  expect(all).toHaveLength(before + 1);
  return all[all.length - 1];
}

test.beforeEach(async ({ page }) => {
  await go(page, "/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test("sandbox: save card, book with no charge, charge the session, charge a late-cancel fee", async ({ page }) => {
  const status = await (await page.request.get("/api/payments/status")).json();
  expect(status).toEqual({ mode: "sandbox" });
  const health = await (await page.request.get("/api/payments/health")).json();
  expect(health).toMatchObject({ mode: "sandbox", credentialsOk: true });

  const first = await test.step("save a card via the hosted form and confirm with no charge", async () => {
    const booking = await bookWithSandboxCard(page);
    expect(booking.payment).toMatchObject({ status: "card-on-file", transactions: [], card: { last4: "1111" } });
    expect(booking.payment!.card.paymentProfileId).toMatch(/^\d+$/);
    return booking;
  });

  await test.step("admin charges the session to the card on file", async () => {
    await go(page, "/admin/bookings");
    await signIn(page);
    const row = page.locator("table tbody tr", { hasText: first.id });
    await row.getByRole("button", { name: /^Charge session/ }).click();
    await expect(row.getByText("Charged", { exact: true })).toBeVisible({ timeout: 30_000 });
    const charged = (await bookings(page)).find((b) => b.id === first.id)!;
    expect(charged.payment!.status).toBe("charged");
    expect(charged.payment!.transactions[0]).toMatchObject({ kind: "session", ok: true });
    expect(charged.payment!.transactions[0].transactionId).toMatch(/^\d+$/);
  });

  await test.step("a late cancellation charges the fee", async () => {
    await go(page, "/admin/payments");
    await page.getByLabel("Late-cancellation fee (USD)").fill("35");
    await page.getByLabel("Window before session start (hours)").fill("24");
    await page.getByRole("button", { name: "Save policy" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved.");

    const second = await bookWithSandboxCard(page);
    // Move it to this evening, inside the 24h window.
    const today = await dateFromToday(page, 0);
    await page.evaluate(
      ({ id, date }) => {
        const db = JSON.parse(localStorage.getItem("soma-studio:db")!);
        const b = db.bookings.find((x: { id: string }) => x.id === id);
        b.state.intake = { ...b.state.intake, date, slot: "evening" };
        localStorage.setItem("soma-studio:db", JSON.stringify(db));
      },
      { id: second.id, date: today },
    );
    await go(page, "/bookings");
    await page.getByRole("button", { name: "Cancel", exact: true }).last().click();
    await page.getByRole("button", { name: "Cancel and pay $35.00 fee" }).click();
    await expect
      .poll(async () => (await bookings(page)).find((b) => b.id === second.id)?.payment?.status, { timeout: 30_000 })
      .toBe("fee-charged");
    const cancelled = (await bookings(page)).find((b) => b.id === second.id)!;
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.payment!.transactions[0]).toMatchObject({ kind: "late-cancel-fee", amount: 35, ok: true });
  });
});
