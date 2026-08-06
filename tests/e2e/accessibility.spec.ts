import { expect, test } from "@playwright/test";

test("modal supports keyboard close and responsive profile layout", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("button", { name: "Sign In" })).toBeFocused();
});

test("documentation portal renders authored and generated pages", async ({ page }) => {
  await page.goto("/docs");
  await expect(
    page.getByRole("heading", { name: "Next.js authentication demo documentation" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Auth flow" }).click();
  await expect(page.getByRole("heading", { name: "Authentication code flow" })).toBeVisible();
  await page.getByRole("link", { name: "API reference" }).click();
  await expect(page.getByRole("heading", { name: "nextjs-auth" })).toBeVisible();
});
