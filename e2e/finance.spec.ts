import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { Transaction } from "../src/types/finance";
const seed: Transaction[] = JSON.parse(
  readFileSync(
    new URL("../src/data/mockTransactions.json", import.meta.url),
    "utf8",
  ),
);
const fixedDate = new Date("2026-11-16T12:00:00Z");
const metric = (page: Page, name: string) =>
  page.getByRole("article", { name, exact: true }).locator(".metric-value");

test("an expense updates all views, supports edit/delete/undo and persists", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.clock.install({ time: fixedDate });
  await page.goto(process.env.FINANCE_TEST_PATH || "/");
  await expect(page.getByLabel("Reporting month")).toHaveValue("2026-11");
  await expect(metric(page, "Expenses")).toHaveText("$1,620.00");
  await expect(page.locator(".recharts-area-curve").first()).toBeVisible();
  expect(
    await page
      .locator(".recharts-area-curve")
      .first()
      .evaluate((el) => getComputedStyle(el).stroke),
  ).toBe("rgb(69, 115, 91)");
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Transaction name")).toBeFocused();
  await dialog.getByLabel("Transaction name").fill("Portfolio test groceries");
  await dialog.getByLabel("Amount (USD)").fill("2000.25");
  await dialog
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(metric(page, "Expenses")).toHaveText("$3,620.25");
  await expect(metric(page, "Net balance")).toHaveText("$21,929.75");
  await expect(page.getByLabel("Monthly insights")).toContainText("Food");
  await expect(page.locator(".category-list")).toContainText("$2,109.25");
  await page.locator(".chart-data summary").click();
  await expect(
    page.locator(".chart-data tr").filter({ hasText: "November 2026" }),
  ).toContainText("$3,620.25");
  await page.reload();
  await expect(metric(page, "Expenses")).toHaveText("$3,620.25");
  await page
    .getByRole("button", { name: "Edit Portfolio test groceries", exact: true })
    .click();
  await page.getByRole("dialog").getByLabel("Amount (USD)").fill("20.15");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(metric(page, "Expenses")).toHaveText("$1,640.15");
  await page.getByLabel("Search transactions").fill("Portfolio test groceries");
  await expect(page.locator(".transactions-table tbody tr")).toHaveCount(1);
  await expect(metric(page, "Expenses")).toHaveText("$1,640.15");
  await page
    .getByRole("button", {
      name: "Delete Portfolio test groceries",
      exact: true,
    })
    .click();
  await expect(metric(page, "Expenses")).toHaveText("$1,620.00");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(metric(page, "Expenses")).toHaveText("$1,640.15");
  await page.getByLabel("Search transactions").fill("nothing matches this");
  await expect(
    page.getByRole("heading", { name: "No matching transactions" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByLabel("Demo access mode").selectOption("viewer");
  await expect(
    page.getByRole("button", { name: "Add transaction", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", {
      name: "Edit Portfolio test groceries",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByLabel("Demo access mode").selectOption("admin");
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add transaction", exact: true }),
  ).toBeFocused();
  await page.getByLabel("Reporting month").selectOption("2026-10");
  await expect(metric(page, "Expenses")).toHaveText("$1,822.00");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveClass("dark");
  expect(
    await page
      .locator(".recharts-area-curve")
      .first()
      .evaluate((el) => getComputedStyle(el).stroke),
  ).toBe("rgb(168, 201, 167)");
  await page.screenshot({
    path: testInfo.outputPath("finance-dark.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("legacy untouched sample dates refresh; edited records retain their dates and amounts", async ({
  browser,
}) => {
  for (const edited of [false, true]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.clock.install({ time: fixedDate });
    const records = seed.map((item, index) =>
      edited && index === 0 ? { ...item, amount: 123.45 } : item,
    );
    await page.addInitScript(
      (records) =>
        localStorage.setItem(
          "finance-dashboard-store",
          JSON.stringify({
            version: 0,
            state: {
              transactions: records,
              role: "admin",
              theme: "light",
              filters: { search: "", type: "all", sortBy: "date-desc" },
            },
          }),
        ),
      records,
    );
    await page.goto(process.env.FINANCE_TEST_PATH || "/");
    await expect(page.getByLabel("Reporting month")).toHaveValue(
      edited ? "2026-04" : "2026-11",
    );
    const saved = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("finance-dashboard-store")!).state
          .transactions,
    );
    expect(saved.find((item: any) => item.id === "txn-001").amount).toBe(
      edited ? 123.45 : 5200,
    );
    expect(saved.find((item: any) => item.id === "txn-001").date).toBe(
      edited ? "2025-11-28" : "2026-06-28",
    );
    await context.close();
  }
});

test("unchanged current demo rolls forward safely, including first-day clamping", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-12-01T12:00:00Z") });
  const records = seed.map((item) => {
    const [year, month, day] = item.date.split("-").map(Number);
    const d = new Date(year, month - 1 + 7, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return {
      ...item,
      date: `${key}-${String(key === "2026-11" ? Math.min(day, 1) : day).padStart(2, "0")}`,
    };
  });
  await page.addInitScript(
    (records) =>
      localStorage.setItem(
        "finance-dashboard-store",
        JSON.stringify({
          version: 1,
          state: {
            transactions: records,
            seedDate: "2026-11-01",
            reportMonth: null,
            role: "admin",
            theme: "light",
            filters: { search: "", type: "all", sortBy: "date-desc" },
          },
        }),
      ),
    records,
  );
  await page.goto(process.env.FINANCE_TEST_PATH || "/");
  await expect(page.getByLabel("Reporting month")).toHaveValue("2026-12");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("finance-dashboard-store")!).state
          .seedDate,
    ),
  ).toBe("2026-12-01");
});

test("phone layouts fit and decimal entry remains usable", async ({
  page,
}, testInfo) => {
  await page.clock.install({ time: fixedDate });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(process.env.FINANCE_TEST_PATH || "/");
  await expect(
    page.getByRole("heading", { name: "Finance overview." }),
  ).toBeVisible();
  await expect(page.getByLabel("Reporting month")).toHaveValue("2026-11");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Transaction name").fill("Small expense");
  await form.getByLabel("Amount (USD)").fill("0.25");
  await form
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  await expect(metric(page, "Expenses")).toHaveText("$1,620.25");
  await page
    .getByRole("heading", { name: "Transactions", exact: true })
    .scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("finance-mobile.png") });
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
