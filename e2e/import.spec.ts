import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
test("CSV review blocks invalid rows, handles duplicates, exports and restores a backup", async ({
  page,
}, info) => {
  await page.clock.install({ time: new Date("2026-11-16T12:00:00Z") });
  await page.goto(process.env.FINANCE_TEST_PATH || "/");
  await page
    .getByRole("button", { name: "Import & export", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const file = (text: string) => ({
    name: "transactions.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(text),
  });
  await dialog
    .getByLabel("Choose CSV", { exact: true })
    .setInputFiles(
      file("name,date,amount,category,type\nBad,2026-02-30,20,Food,expense"),
    );
  await expect(dialog.getByRole("status")).toContainText("1 invalid rows");
  await expect(
    dialog.getByRole("button", { name: "Import 0 transactions", exact: true }),
  ).toBeDisabled();
  await dialog
    .getByLabel("Choose CSV", { exact: true })
    .setInputFiles(
      file(
        "name,date,amount,category,type\nImported rent,2026-11-01,1200,Housing,expense\nImported salary,2026-11-02,3000,Salary,income\nImported rent,2026-11-01,1200,Housing,expense",
      ),
    );
  await dialog
    .getByLabel("Replace existing records instead of adding to them")
    .check();
  await expect(dialog.getByRole("status")).toContainText(
    "2 ready · 1 possible duplicates",
  );
  page.once("dialog", (d) => d.accept());
  await dialog
    .getByRole("button", { name: "Import 2 transactions", exact: true })
    .click();
  await expect(
    page.getByRole("article", { name: "Income", exact: true }),
  ).toContainText("$3,000.00");
  await expect(
    page.getByRole("article", { name: "Expenses", exact: true }),
  ).toContainText("$1,200.00");
  await page
    .getByRole("button", { name: "Import & export", exact: true })
    .click();
  const backupEvent = page.waitForEvent("download");
  await dialog
    .getByRole("button", { name: "Download backup", exact: true })
    .click();
  const backup = await backupEvent;
  const content = readFileSync((await backup.path())!);
  expect(JSON.parse(content.toString()).transactions).toHaveLength(2);
  const csvEvent = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Export CSV", exact: true }).click();
  expect((await csvEvent).suggestedFilename()).toBe("finance-transactions.csv");
  await page.screenshot({
    path: info.outputPath("finance-import.png"),
    fullPage: true,
  });
  page.once("dialog", (d) => d.accept());
  await dialog
    .getByLabel("Choose backup", { exact: true })
    .setInputFiles({
      name: "finance-backup.json",
      mimeType: "application/json",
      buffer: content,
    });
  await expect(page.getByRole("status")).toContainText("Restored 2 records");
  await page.reload();
  await expect(
    page.getByRole("article", { name: "Expenses", exact: true }),
  ).toContainText("$1,200.00");
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Import & export", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Import & export", exact: true }),
  ).toBeFocused();
});
