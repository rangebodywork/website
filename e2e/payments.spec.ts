import { expect, test, type Page } from "@playwright/test";
import { DECLINE_CARD, TEST_CARD, bodyText, dateFromToday, go, readDb, saveTestCard, signIn } from "./helpers";

/*
 * Stub-gateway payment flows. Each test starts from empty storage and books the
 * default session through the UI, so the card-on-file references are real stub ids.
 */

interface Booking {
  id: string;
  status: string;
  totalPrice: number;
  payment?: {
    status: string;
    card: { last4: string; brand: string; paymentProfileId: string };
    transactions: Array<{ kind: string; amount: number; ok: boolean; transactionId?: string; message?: string }>;
  };
}

async function onlyBooking(page: Page): Promise<Booking> {
  const db = await readDb(page);
  expect(db.bookings).toHaveLength(1);
  return db.bookings[0];
}

/** Records every call the browser makes to the charge route. */
function trackCharges(page: Page) {
  const calls: unknown[] = [];
  page.on("request", (req) => {
    if (req.url().endsWith("/api/payments/charge")) calls.push(req.postDataJSON());
  });
  return calls;
}

async function bookWithCard(page: Page, card = TEST_CARD) {
  await go(page, "/intake");
  await page.getByRole("radiogroup", { name: "Session date" }).getByRole("radio").first().click();
  await page.locator("#full-name").fill("Pay Client");
  await page.locator("#client-phone").fill("555 222 3333");
  await page.locator("#emergency-phone").fill("Friend 555 444 5555");
  const consents = page.locator("fieldset input[type=checkbox]");
  await consents.nth(0).check();
  await consents.nth(2).check();
  await go(page, "/review");
  await saveTestCard(page, card);
  await page.getByRole("button", { name: /Confirm & Reserve/ }).click();
  await expect(page.getByText(/Reference SOMA-/).first()).toBeVisible();
  return onlyBooking(page);
}

/** Moves the stored booking to a given day and slot, as if it had been booked for then. */
async function setSessionTime(page: Page, date: string, slot: "morning" | "afternoon" | "evening") {
  await page.evaluate(
    ({ date, slot }) => {
      const db = JSON.parse(localStorage.getItem("soma-studio:db")!);
      db.bookings[0].state.intake = { ...db.bookings[0].state.intake, date, slot };
      localStorage.setItem("soma-studio:db", JSON.stringify(db));
    },
    { date, slot },
  );
}

test.beforeEach(async ({ page }) => {
  await go(page, "/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test("booking saves a card on file without charging it", async ({ page }) => {
  const charges = trackCharges(page);
  await go(page, "/intake");
  await page.getByRole("radiogroup", { name: "Session date" }).getByRole("radio").first().click();
  await page.locator("#full-name").fill("Pay Client");
  await page.locator("#client-phone").fill("555 222 3333");
  await page.locator("#emergency-phone").fill("Friend 555 444 5555");
  const consents = page.locator("fieldset input[type=checkbox]");
  await consents.nth(0).check();
  await consents.nth(2).check();
  await go(page, "/review");

  await test.step("review shows the placeholder policy and needs a card before confirming", async () => {
    await expect(page.getByText("Placeholder wording")).toBeVisible();
    await expect(page.getByText("No charge happens now.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save a card on file to reserve" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Save card on file" })).toBeDisabled(); // consent first
  });

  await test.step("an invalid card is rejected by the test-mode form", async () => {
    await page.getByLabel(/I authorize Soma Studio/).check();
    await page.getByRole("button", { name: "Save card on file" }).click();
    await expect(page.getByText(/Test mode · no real card is processed/i)).toBeVisible();
    await page.getByLabel("Card number").fill("4111 1111 1111 1112");
    await page.getByLabel("Expiry (MM/YY)").fill("12/34");
    await page.getByLabel("Security code").fill("123");
    await page.getByRole("button", { name: "Save test card" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "That card number is not valid." })).toBeVisible();
  });

  await test.step("a valid card is saved and the booking confirms with no charge", async () => {
    await page.getByLabel("Card number").fill(TEST_CARD);
    await page.getByRole("button", { name: "Save test card" }).click();
    await expect(page.getByText("Visa ending 1111 saved")).toBeVisible();
    await page.getByRole("button", { name: /Confirm & Reserve/ }).click();
    await expect(page.getByText(/Reference SOMA-/).first()).toBeVisible();
    await expect(page.getByText("Visa ending 1111 on file · not charged yet")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cancellation policy" })).toBeVisible();

    const booking = await onlyBooking(page);
    expect(booking.payment).toMatchObject({ status: "card-on-file", transactions: [], card: { brand: "Visa", last4: "1111" } });
    expect(booking.payment!.card.paymentProfileId).toMatch(/^stub_pp_/);
    const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(storage).not.toContain("4111111111111111");
    expect(storage).not.toContain("4111 1111");
    expect(charges).toEqual([]);
  });
});

test("cancelling more than 24 hours ahead is free", async ({ page }) => {
  await bookWithCard(page);
  await setSessionTime(page, await dateFromToday(page, 5), "morning");
  const charges = trackCharges(page);
  await go(page, "/bookings");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByTestId("cancel-fee-notice")).toContainText("No cancellation fee applies");
  await page.getByRole("button", { name: "Yes, cancel booking" }).click();
  await expect.poll(async () => (await onlyBooking(page)).status).toBe("cancelled");
  const booking = await onlyBooking(page);
  expect(booking.payment).toMatchObject({ status: "card-on-file", transactions: [] });
  expect(charges).toEqual([]);
});

test("cancelling within the window charges the admin-set fee to the card on file", async ({ page }) => {
  await test.step("admin replaces the placeholder fee and policy text", async () => {
    await go(page, "/admin/payments");
    await signIn(page);
    await expect(page.getByText("Test mode (stub gateway, no real charges)")).toBeVisible();
    await page.getByLabel("Late-cancellation fee (USD)").fill("35");
    await page.getByLabel("Window before session start (hours)").fill("24");
    await page.getByLabel(/Policy text/).fill("Owner wording: please give us a day's notice.");
    await page.getByRole("button", { name: "Save policy" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved.");
    expect((await readDb(page)).paymentSettings).toEqual({
      cancellationFee: 35,
      cancellationWindowHours: 24,
      policyText: "Owner wording: please give us a day's notice.",
    });
  });

  await test.step("review shows the owner's policy and fee", async () => {
    await go(page, "/review");
    const text = await bodyText(page);
    expect(text).toContain("Owner wording: please give us a day's notice.");
    expect(text).toContain("$35.00 fee");
    expect(text).not.toContain("Placeholder wording");
  });

  await bookWithCard(page);
  // Today's evening slot always starts less than 24 hours from now (or has just started).
  await setSessionTime(page, await dateFromToday(page, 0), "evening");
  const charges = trackCharges(page);
  await go(page, "/bookings");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByTestId("cancel-fee-notice")).toContainText(
    "a $35.00 cancellation fee will be charged to Visa ending 1111",
  );
  await page.getByRole("button", { name: "Cancel and pay $35.00 fee" }).click();
  await expect.poll(async () => (await onlyBooking(page)).status).toBe("cancelled");

  const booking = await onlyBooking(page);
  expect(booking.payment!.status).toBe("fee-charged");
  expect(booking.payment!.transactions).toHaveLength(1);
  expect(booking.payment!.transactions[0]).toMatchObject({ kind: "late-cancel-fee", amount: 35, ok: true });
  expect(booking.payment!.transactions[0].transactionId).toMatch(/^stub_tx_/);
  expect(charges).toEqual([expect.objectContaining({ reason: "late-cancel-fee", amount: 35, bookingId: booking.id })]);
  await expect(page.getByTestId("payment-line")).toHaveText("Cancellation fee of $35.00 charged to Visa ending 1111");
});

test("admin charges a session to the card on file", async ({ page }) => {
  const booked = await bookWithCard(page);
  await go(page, "/admin/bookings");
  await signIn(page);
  const row = page.locator("table tbody tr", { hasText: booked.id });
  await expect(row.getByText("Card on file")).toBeVisible();
  await row.getByRole("button", { name: /^Charge session/ }).click();
  await expect(row.getByText("Charged", { exact: true })).toBeVisible();
  await expect(row.getByRole("button", { name: /^Charge session/ })).toHaveCount(0);

  const booking = await onlyBooking(page);
  expect(booking.payment!.status).toBe("charged");
  expect(booking.payment!.transactions).toEqual([
    expect.objectContaining({ kind: "session", amount: booking.totalPrice, ok: true }),
  ]);

  // Marking it completed afterwards does not charge again.
  await row.getByRole("combobox", { name: /^Status for/ }).selectOption("completed");
  await expect.poll(async () => (await onlyBooking(page)).status).toBe("completed");
  expect((await onlyBooking(page)).payment!.transactions).toHaveLength(1);
});

test("a declined charge is recorded as failed and can be retried", async ({ page }) => {
  const booked = await bookWithCard(page, DECLINE_CARD);
  await go(page, "/admin/bookings");
  await signIn(page);
  const row = page.locator("table tbody tr", { hasText: booked.id });
  await row.getByRole("button", { name: /^Charge session/ }).click();
  await expect(row.getByText("Failed", { exact: true })).toBeVisible();
  await expect(row.getByText(/declined/)).toBeVisible();
  await expect(row.getByRole("button", { name: /^Charge session/ })).toBeVisible();

  const booking = await onlyBooking(page);
  expect(booking.payment!.status).toBe("failed");
  expect(booking.payment!.transactions[0]).toMatchObject({ kind: "session", ok: false });

  await go(page, "/bookings");
  await expect(page.getByTestId("payment-line")).toContainText("did not go through");
});
