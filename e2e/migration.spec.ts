import { expect, test } from "@playwright/test";
import { bodyText, go, readDb } from "./helpers";

/** Data written before My bookings existed: a confirmed session only under the old key, plus a malformed DB. */
const LEGACY_SESSION = {
  version: 1,
  modalities: { coaching: { enabled: true, duration: 15 }, massage: { enabled: true, duration: 60, option: "Deep Tissue" } },
  sequence: ["coaching", "massage"],
  intake: {
    date: "2026-10-20",
    slot: "morning",
    fullName: "Legacy Client",
    phone: "5551234567",
    emergencyContact: "",
    consents: { noAcuteIllness: true, pregnant: false, bodyworkConsent: true },
  },
  confirmation: { reference: "SOMA-OLD01", confirmedAt: "2026-09-01T10:00:00.000Z" },
};
const MALFORMED_DB = { version: 1, modalities: { massage: { pricing: "oops" } }, classes: "bad", bookings: [{ id: 3 }] };

test("legacy confirmed booking migrates once; malformed data is ignored", async ({ page }) => {
  await go(page, "/schedule");
  await page.evaluate(
    ([session, db]) => {
      localStorage.clear();
      localStorage.setItem("soma-studio:booking", JSON.stringify(session));
      localStorage.setItem("soma-studio:db", JSON.stringify(db));
    },
    [LEGACY_SESSION, MALFORMED_DB] as const,
  );

  await test.step("legacy booking shows on /bookings", async () => {
    await go(page, "/bookings");
    await expect(page.getByText(/SOMA-OLD01/)).toBeVisible();
  });

  await test.step("migrated into the v2 DB; the malformed booking is dropped", async () => {
    const db = await readDb(page);
    expect(db.version).toBe(2);
    expect(db.bookings.map((b: { id: string }) => b.id)).toEqual(["SOMA-OLD01"]);
  });

  await test.step("reload does not migrate it again", async () => {
    await page.reload({ waitUntil: "networkidle" });
    expect((await readDb(page)).bookings).toHaveLength(1);
  });

  await test.step("editing and re-confirming the legacy session updates the migrated booking", async () => {
    await go(page, "/intake");
    await page.locator("#client-phone").fill("555 777 6666");
    await go(page, "/review");
    await page.getByRole("button", { name: /Confirm & Reserve/ }).click();
    await expect(page.getByText(/Reference SOMA-OLD01/).first()).toBeVisible();
    const db = await readDb(page);
    expect(db.bookings).toHaveLength(1);
    expect(db.bookings[0].state.intake.phone).toBe("555 777 6666");
  });

  await test.step("malformed pricing falls back to the catalog", async () => {
    expect((await readDb(page)).modalities.massage.pricing["60"]).toBe(110);
    await go(page, "/");
    expect(await bodyText(page)).toContain("$145"); // coaching 35 + massage 110
  });
});
