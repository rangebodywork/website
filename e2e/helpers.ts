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
