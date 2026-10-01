import type { Page } from "@playwright/test";

/** The shared store as persisted by lib/repository.ts. */
export function readDb(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("soma-studio:db") ?? "null"));
}

export async function go(page: Page, path: string) {
  await page.goto(path, { waitUntil: "networkidle" });
}

export function bodyText(page: Page) {
  return page.locator("body").innerText();
}

/** Local YYYY-MM-DD `days` from today, computed in the browser. */
export function dateFromToday(page: Page, days: number) {
  return page.evaluate((n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, days);
}

export async function signIn(page: Page) {
  await page.getByLabel("Admin passcode").fill("0000");
  await page.getByRole("button", { name: "Enter" }).click();
}

export const TEST_CARD = "4111 1111 1111 1111";
export const DECLINE_CARD = "4000 0000 0000 0002";

/** On /review: consent, open the test-mode card form and save a card on file. */
export async function saveTestCard(page: Page, number = TEST_CARD) {
  await page.getByLabel(/I authorize Soma Studio/).check();
  await page.getByRole("button", { name: "Save card on file" }).click();
  await page.getByLabel("Card number").fill(number);
  await page.getByLabel("Expiry (MM/YY)").fill("12/34");
  await page.getByLabel("Security code").fill("123");
  await page.getByRole("button", { name: "Save test card" }).click();
  await page.getByText(`ending ${number.replace(/\s/g, "").slice(-4)} saved`).waitFor();
}
