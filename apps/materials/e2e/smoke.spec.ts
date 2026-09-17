import { expect, test } from "@playwright/test";

// ============================================================================
// E2E SMOKE — runs without any environment configuration (demo/unconfigured
// mode). Verifies public surfaces render, auth is never faked, and protected
// routes bounce to login.
// ============================================================================

test.describe("Public surfaces", () => {
  test("landing page renders marketing content", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toContainText("Ecosystem Realty", { ignoreCase: true });
    // Primary CTA present
    await expect(page.getByRole("link", { name: /start|get|demo|login|sign/i }).first()).toBeVisible();
  });

  test("health probe returns structured envelope", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBeDefined();
    expect(body.meta.requestId).toMatch(/^req_/);
  });

  test("unauthenticated API access is rejected", async ({ request }) => {
    const leads = await request.get("/api/leads");
    expect([401, 403]).toContain(leads.status());

    const resurrect = await request.post("/api/agent/resurrect", { data: {} });
    expect([401, 403]).toContain(resurrect.status());
  });
});

test.describe("Auth gating", () => {
  test("protected route bounces to login when unconfigured/unauthenticated", async ({ page }) => {
    await page.goto("/leads");
    // Middleware handles it when env is set; client-side gate otherwise.
    await page.waitForURL(/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("login page renders and never fake-logs-in without backend", async ({ page }) => {
    // /login defaults to signup mode; the explicit login form lives at ?mode=login
    await page.goto("/login?mode=login");
    const email = page.locator('input[type="email"]').first();
    await email.fill("attacker@example.com");
    await page.locator('input[type="password"]').first().fill("wrong-password");
    await page.getByRole("button", { name: /sign in to cockpit/i }).click();

    // Must surface an error — never navigate into the app
    await expect(page.locator("body")).toContainText(
      /authentication backend is not configured|invalid/i,
      { timeout: 5000 }
    );
    expect(page.url()).not.toMatch(/dashboard|leads/);
  });

  test("404 page renders for unknown routes", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page.locator("body")).toContainText("404");
  });
});
