import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
const password = "Local test account password 2026";
async function register(page: any, email: string) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Create a local account", exact: true })
    .click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Finance overview." }),
  ).toBeVisible();
}
test("local accounts persist private records and a second account starts empty", async ({
  page,
  browser,
}, info) => {
  const email = `browser-${randomUUID()}@example.com`;
  await register(page, email);
  await expect(
    page.getByRole("article", { name: "Expenses", exact: true }),
  ).toContainText("$0.00");
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Transaction name").fill("Private account lunch");
  await d.getByLabel("Amount (USD)").fill("12.34");
  await d.getByRole("button", { name: "Add transaction", exact: true }).click();
  await expect(d).not.toBeVisible();
  await expect(
    page.getByRole("article", { name: "Expenses", exact: true }),
  ).toContainText("$12.34");
  await page.reload();
  await expect(
    page.getByRole("article", { name: "Expenses", exact: true }),
  ).toContainText("$12.34");
  expect(
    await page.evaluate(() =>
      localStorage.getItem("finance-account-preferences"),
    ),
  ).not.toContain("Private account lunch");
  const other = await browser.newContext();
  const p = await other.newPage();
  await register(p, `other-${randomUUID()}@example.com`);
  await expect(
    p.getByRole("article", { name: "Expenses", exact: true }),
  ).toContainText("$0.00");
  await other.close();
  await page.screenshot({
    path: info.outputPath("finance-account.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("article", { name: "Expenses", exact: true }),
  ).toContainText("$12.34");
});
test("a failed API save keeps the form and its values until a successful retry", async ({
  page,
}) => {
  await register(page, `failure-${randomUUID()}@example.com`);
  await page.route("**/api/transactions", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Server unavailable. Try again." }),
        })
      : route.continue(),
  );
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Transaction name").fill("Retry this expense");
  await d.getByLabel("Amount (USD)").fill("4.50");
  await d.getByRole("button", { name: "Add transaction", exact: true }).click();
  await expect(d.getByRole("alert")).toHaveText(
    "Server unavailable. Try again.",
  );
  await expect(d.getByLabel("Transaction name")).toHaveValue(
    "Retry this expense",
  );
  await page.unroute("**/api/transactions");
  await d.getByRole("button", { name: "Add transaction", exact: true }).click();
  await expect(d).not.toBeVisible();
  await expect(
    page.getByRole("article", { name: "Expenses", exact: true }),
  ).toContainText("$4.50");
});
