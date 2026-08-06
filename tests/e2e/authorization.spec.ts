import { expect, test } from "@playwright/test";

test("public pages and account-entry API are available without a session", async ({ page }) => {
  await page.goto("/docs/security");
  await expect(page.getByRole("heading", { name: "Security architecture" })).toBeVisible();

  const response = await page.request.post("/api/auth/check-email", {
    data: { email: "complete@example.com" },
  });
  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toMatchObject({ ok: true, nextStep: "signin" });
});

test("anonymous callers cannot access normal-session or onboarding resources", async ({ page }) => {
  const session = await page.request.get("/api/session");
  expect(session.status()).toBe(401);
  await expect(session.json()).resolves.toEqual({ authenticated: false });

  const profile = await page.request.post("/api/auth/profile", { data: {} });
  expect(profile.status()).toBe(401);

  await page.goto("/dashboard");
  await expect(page).toHaveURL("/");
});

test("onboarding authorization cannot access normal-session resources", async ({ page }) => {
  const email = `onboarding-boundary-${Date.now()}@example.com`;
  await page.goto("/");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Password", { exact: true }).fill("StrongPassword1!");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: /finish creating/i })).toBeVisible();

  expect((await page.request.get("/api/session")).status()).toBe(401);
  expect((await page.request.post("/api/auth/profile", { data: {} })).status()).toBe(400);

  await page.goto("/dashboard");
  await expect(page).toHaveURL("/");
});

test("state-changing authentication routes reject a foreign browser origin", async ({ page }) => {
  const response = await page.request.post("/api/auth/logout", {
    headers: { Origin: "https://attacker.example" },
  });
  expect(response.status()).toBe(403);
  await expect(response.json()).resolves.toMatchObject({ ok: false, error: "Invalid origin" });
});
