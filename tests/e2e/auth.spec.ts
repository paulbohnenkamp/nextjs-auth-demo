import { expect, test } from "@playwright/test";

test("new user completes profile, stays signed in, and logs out", async ({ page }) => {
  const email = `new-${Date.now()}@example.com`;
  await page.goto("/");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Create Your Password" })).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill("StrongPassword1!");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: /finish creating/i })).toBeVisible();
  await page.getByPlaceholder("First Name").fill("New");
  await page.getByPlaceholder("Last Name").fill("User");
  await page.getByPlaceholder("Cell Phone").fill("3035550100");
  await page.getByLabel("Birthday").fill("1992-03-04");
  await page.getByPlaceholder("ZIP Code").fill("80202");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.reload();
  await expect(page.getByText(email)).toBeVisible();
  await page.getByRole("button", { name: "Log Out" }).click();
  await expect(page).toHaveURL("/");
  expect((await page.request.get("/api/session")).status()).toBe(401);
});

test("existing user recovers from an invalid password and logs in", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.getByLabel("Email address").fill("complete@example.com");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Password", { exact: true }).fill("WrongPassword1!");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Email or password is incorrect")).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill("DemoPassword1!");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});
