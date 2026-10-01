import { expect, test } from "@playwright/test";
import { go } from "./helpers";

test("an admin change in one tab updates an open builder in another", async ({ context }) => {
  const builder = await context.newPage();
  const admin = await context.newPage();
  await go(builder, "/");
  await expect(builder.getByText("Personal & Resistance Training").first()).toBeVisible();

  await go(admin, "/admin/services");
  await admin.getByLabel("Admin passcode").fill("0000");
  await admin.getByRole("button", { name: "Enter" }).click();
  await admin
    .locator("div.rounded-xl", { hasText: "Personal & Resistance Training" })
    .first()
    .getByRole("button", { name: "Disable" })
    .click();

  // No reload: the builder hears the storage event and drops the service and its price.
  await expect(builder.getByText("Personal & Resistance Training")).toHaveCount(0);
  await expect(builder.getByText("$145").first()).toBeVisible(); // coaching 35 + massage 110
});
