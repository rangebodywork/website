import { expect, test, type Page } from "@playwright/test";
import { bodyText, dateFromToday, go, readDb } from "./helpers";

/*
 * One long journey in a single browser context: the admin changes the catalog, the customer books,
 * edits, reschedules and cancels, then the admin edits the schedule. Steps depend on each other.
 */

const SERVICE_CARD = "div.rounded-xl";

async function signIn(page: Page) {
  await page.getByLabel("Admin passcode").fill("0000");
  await page.getByRole("button", { name: "Enter" }).click();
}

test("customer and admin flows", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" || /hydrat/i.test(m.text())) consoleErrors.push(`[${m.type()}] ${m.text()}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`[pageerror] ${e.message}`));

  await test.step("builder default total is $235", async () => {
    await go(page, "/");
    expect(await bodyText(page)).toContain("$235");
  });

  await test.step("admin passcode gate opens the dashboard", async () => {
    await go(page, "/admin");
    await signIn(page);
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  });

  await test.step("reloading /admin while signed in has no hydration or console errors", async () => {
    consoleErrors.length = 0;
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    expect(consoleErrors).toEqual([]);
    await expect(page.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
  });

  await test.step("admin price edit reaches the builder total", async () => {
    await go(page, "/admin/services");
    const massage = page.locator(SERVICE_CARD, { hasText: "Massage & Bodywork" }).first();
    await massage.getByRole("button", { name: "Edit Pricing" }).click();
    await page.getByLabel("Price for 60 minutes").fill("200");
    await page.getByRole("button", { name: "Save pricing" }).click();
    await expect.poll(async () => (await readDb(page))?.modalities?.massage?.pricing?.["60"]).toBe(200);
    await go(page, "/");
    expect(await bodyText(page)).toContain("$325");
  });

  await test.step("disabled service disappears from builder, rituals and price", async () => {
    await go(page, "/admin/services");
    const training = page.locator(SERVICE_CARD, { hasText: "Personal & Resistance Training" }).first();
    await training.getByRole("button", { name: "Disable" }).click();
    await expect.poll(async () => (await readDb(page))?.modalities?.training?.disabled).toBe(true);
    await go(page, "/");
    const text = await bodyText(page);
    expect(text).not.toContain("Personal & Resistance Training");
    expect(text).not.toContain("Active Recovery");
    expect(text).toContain("$235"); // coaching 35 + massage 200
  });

  await test.step("intake → review omits the disabled service; confirm saves one booking", async () => {
    await go(page, "/intake");
    await page.getByRole("radiogroup", { name: "Session date" }).getByRole("radio").first().click();
    await page.locator("#full-name").fill("Test Client");
    await page.locator("#client-phone").fill("555 123 4567");
    await page.locator("#emergency-phone").fill("Partner 555 000 1111");
    const consents = page.locator("fieldset input[type=checkbox]");
    await consents.nth(0).check();
    await consents.nth(2).check();
    await go(page, "/review");
    const text = await bodyText(page);
    expect(text).not.toContain("Functional Resistance Training");
    expect(text).toContain("$235");
    await page.getByRole("button", { name: /Confirm & Reserve/ }).click();
    await expect(page.getByText(/Reference SOMA-/).first()).toBeVisible();
    const db = await readDb(page);
    expect(db.bookings).toHaveLength(1);
    expect(db.bookings[0].totalPrice).toBe(235);
    expect(db.profile.fullName).toBe("Test Client");
  });

  await test.step("editing the profile keeps the confirmation and adds no booking", async () => {
    await go(page, "/profile");
    await page.getByLabel("Full Name").fill("Test Client Renamed");
    await expect.poll(async () => (await readDb(page)).profile.fullName).toBe("Test Client Renamed");
    await go(page, "/review");
    await expect(page.getByText(/Reference SOMA-/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Confirm & Reserve/ })).toHaveCount(0);
    expect((await readDb(page)).bookings).toHaveLength(1);
  });

  await test.step("re-confirming an edited session updates the same booking", async () => {
    await go(page, "/intake");
    await page.locator("#client-phone").fill("555 999 8888");
    await go(page, "/review");
    await page.getByRole("button", { name: /Confirm & Reserve/ }).click();
    await expect(page.getByText(/Reference SOMA-/).first()).toBeVisible();
    const db = await readDb(page);
    expect(db.bookings).toHaveLength(1);
    expect(db.bookings[0].state.intake.phone).toBe("555 999 8888");
  });

  await test.step("My bookings: upcoming/past split, names not ids, reschedule", async () => {
    await go(page, "/bookings");
    await expect(page.getByRole("heading", { name: "Upcoming" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Past" })).toBeVisible();
    const text = await bodyText(page);
    expect(text).toContain("Health & Habit Coaching");
    expect(text).not.toMatch(/coaching, massage/);

    const target = await dateFromToday(page, 12);
    await page.getByRole("button", { name: "Reschedule" }).click();
    await page.getByLabel("New date").fill(target);
    await page.getByLabel("Time").selectOption("evening");
    await page.getByRole("button", { name: "Save new time" }).click();
    await expect.poll(async () => (await readDb(page)).bookings[0].state.intake).toMatchObject({ date: target, slot: "evening" });
  });

  await test.step("cancel asks first, then moves the booking to Past", async () => {
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByRole("button", { name: "Yes, cancel booking" })).toBeVisible();
    expect((await readDb(page)).bookings[0].status).toBe("upcoming");
    await page.getByRole("button", { name: "Yes, cancel booking" }).click();
    await expect.poll(async () => (await readDb(page)).bookings[0].status).toBe("cancelled");
    const past = page.locator("section", { has: page.getByRole("heading", { name: "Past" }) });
    expect((await past.innerText()).toLowerCase()).toContain("cancelled");
  });

  await test.step("a cancelled booking no longer shows as confirmed on /review", async () => {
    await go(page, "/review");
    await expect(page.getByText(/Reference SOMA-/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Confirm & Reserve/ })).toBeVisible();
  });

  await test.step("an admin status change shows on the customer's confirmation", async () => {
    await page.getByRole("button", { name: /Confirm & Reserve/ }).click();
    await expect(page.getByText(/Reference SOMA-/).first()).toBeVisible();
    const db = await readDb(page);
    expect(db.bookings).toHaveLength(2); // the cancelled one is history; this is a new booking
    const latest = db.bookings.find((b: { status: string }) => b.status === "upcoming");
    await go(page, "/admin/bookings");
    await page.getByRole("combobox", { name: /^Status for/ }).first().waitFor();
    const select = page.locator("table").getByRole("combobox", { name: /^Status for/ });
    const rows = page.locator("table tbody tr");
    const index = await rows.evaluateAll((trs, id) => trs.findIndex((tr) => tr.textContent?.includes(id)), latest.id);
    await select.nth(index).selectOption("completed");
    await go(page, "/review");
    await expect(page.getByRole("heading", { name: "This session is complete" })).toBeVisible();
  });

  await test.step("admin adds and edits a class", async () => {
    await go(page, "/admin/schedule");
    await page.getByRole("button", { name: "Add Class" }).click();
    await page.getByLabel("Title").fill("E2E Test Flow");
    await page.getByLabel("When", { exact: true }).fill("Mondays, 6:00 - 7:00 PM");
    await page.getByLabel("Location (short)").fill("Soma Loft");
    await page.getByLabel("Venue").fill("Soma Loft Studio");
    await page.getByLabel("Description").fill("A test class.");
    await page.getByLabel("Equinox Weekly Yoga").check();
    await page.getByRole("button", { name: "Save" }).click();
    await expect.poll(async () => (await readDb(page)).classes.some((c: { title: string }) => c.title === "E2E Test Flow")).toBe(true);

    await page.getByRole("button", { name: "Edit E2E Test Flow" }).click();
    await page.getByLabel("Title").fill("E2E Test Flow Edited");
    await page.getByRole("button", { name: "Save" }).click();
    await expect
      .poll(async () => (await readDb(page)).classes.filter((c: { title: string }) => c.title.startsWith("E2E Test Flow")).map((c: { title: string }) => c.title))
      .toEqual(["E2E Test Flow Edited"]);
  });

  await test.step("admin adds and edits a workshop", async () => {
    await page.getByRole("button", { name: "Add Workshop" }).click();
    await page.getByLabel("Title").fill("E2E Workshop");
    await page.getByLabel("Kicker").fill("Test Intensive");
    await page.getByLabel("Date").fill("2026-12-05");
    await page.getByLabel("Start time").fill("11:00");
    await page.getByLabel("Duration (minutes)").fill("90");
    await page.getByLabel("Price (USD)").fill("80");
    await page.getByLabel("Venue").fill("Soma Sanctuary");
    await page.getByLabel("Description").fill("A test workshop.");
    await page.getByLabel("Weekend Immersions").check();
    await page.getByRole("button", { name: "Save" }).click();
    const findWorkshop = async () =>
      (await readDb(page)).workshops.filter((w: { title: string }) => w.title === "E2E Workshop");
    await expect.poll(async () => (await findWorkshop())[0]?.when).toMatch(/Dec 5/);

    await page.getByRole("button", { name: "Edit E2E Workshop" }).click();
    await page.getByLabel("Price (USD)").fill("95");
    await page.getByRole("button", { name: "Save" }).click();
    await expect.poll(async () => (await findWorkshop()).map((w: { price: number }) => w.price)).toEqual([95]);

    // Moving the date regenerates the display text; typing in "When" overrides it.
    await page.getByRole("button", { name: "Edit E2E Workshop" }).click();
    await page.getByLabel("Date").fill("2026-12-12");
    await page.getByRole("button", { name: "Save" }).click();
    await expect.poll(async () => (await findWorkshop())[0]?.when).toMatch(/Dec 12/);
    await page.getByRole("button", { name: "Edit E2E Workshop" }).click();
    await page.getByLabel("Date").fill("2026-12-19");
    await page.getByLabel("When (display)").fill("Saturday mornings in December");
    await page.getByRole("button", { name: "Save" }).click();
    await expect.poll(async () => (await findWorkshop())[0]).toMatchObject({ date: "2026-12-19", when: "Saturday mornings in December" });
  });

  await test.step("/schedule shows the admin's classes and workshops", async () => {
    await go(page, "/schedule");
    const text = await bodyText(page);
    expect(text).toContain("E2E Test Flow Edited");
    expect(text).toContain("E2E Workshop");
    expect(text).toContain("Somatic Release & Breathwork Weekend Intensive");
  });

  await test.step("sign out, and the admin links back to the customer site", async () => {
    await go(page, "/admin");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByLabel("Admin passcode")).toBeVisible();
    await signIn(page);
    await page.getByRole("link", { name: "Customer site" }).click();
    await page.waitForURL("/");
  });

  expect(consoleErrors).toEqual([]);
});
