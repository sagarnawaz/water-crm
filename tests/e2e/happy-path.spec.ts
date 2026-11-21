// Login → floor price → add customer → confirm on Today → second delivery → edit → delete, at 360px.
// Uses a temporary owner on the staging project and removes it afterwards.
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { phoneToEmail } from "../../src/lib/phone.ts";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
const phone = "0399" + String(Date.now()).slice(-7);
const password = randomUUID();
let userId = "";
let businessId = "";

test.beforeAll(async () => {
  const normalized = "92" + phone.slice(1);
  const { data: u, error } = await admin.auth.admin.createUser({ email: phoneToEmail(normalized), password, email_confirm: true });
  if (error) throw error;
  userId = u.user.id;
  const { data: b } = await admin.from("businesses").insert({ name: "E2E Test Supply" }).select("id").single();
  businessId = b!.id;
  await admin.from("memberships").insert({ user_id: userId, business_id: businessId });
});

test.afterAll(async () => {
  if (businessId) await admin.from("businesses").delete().eq("id", businessId);
  if (userId) await admin.auth.admin.deleteUser(userId);
});

test("owner records bottles end to end", async ({ page }) => {
  // Login
  await page.goto("/customers");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Phone number").fill(phone);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Phone number or password is wrong.")).toBeVisible();
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await expect(page.getByText("No active customers yet")).toBeVisible();

  // Settings: 2nd floor costs Rs 120
  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByLabel("2nd floor", { exact: true }).fill("120");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Saved. New prices apply to new entries.")).toBeVisible();

  // Add a customer
  await page.getByRole("link", { name: "Customers" }).click();
  await page.getByRole("link", { name: "Add first customer" }).click();
  await page.getByLabel("House / Flat no *").fill("12-B");
  await page.getByLabel("Floor *").selectOption("2nd");
  await page.getByLabel("Area / Street *").fill("Gulshan St 4");
  await expect(page.getByText("Rs 120")).toBeVisible();
  await page.getByText("More details (optional)").click();
  await page.getByLabel("Customer name").fill("Tariq Mehmood");
  await page.getByLabel("Usual bottles/day").fill("2");
  await page.getByLabel("Old balance (Rs)").fill("500");
  await page.getByLabel("Bottles at home now").fill("2");
  await page.getByRole("button", { name: "Save customer" }).click();
  await expect(page.getByRole("heading", { name: "12-B · 2nd floor" })).toBeVisible();
  await expect(page.getByText("Rs 500", { exact: true })).toBeVisible();
  await expect(page.getByText("Rs 120 per bottle (2nd floor price)")).toBeVisible();

  // The same address can't be added twice
  await page.goto("/customers/new");
  await page.getByLabel("House / Flat no *").fill("12-b");
  await page.getByLabel("Floor *").selectOption("2nd");
  await page.getByLabel("Area / Street *").fill("gulshan st 4");
  await expect(page.getByText("is already a customer.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save customer" })).toBeDisabled();

  // Today: usual 2 is only a suggestion until ✓
  await page.getByRole("link", { name: "Today" }).click();
  await expect(page.getByText("Rs 0", { exact: true })).toBeVisible(); // nothing billed yet
  await page.getByRole("button", { name: "Save 2 bottles for 12-B · 2nd floor" }).click();
  await expect(page.getByText("Saved 2 bottles, 2 empties back · 12-B · 2nd floor")).toBeVisible();
  await page.getByRole("button", { name: /^Done/ }).click();
  await expect(page.getByText("2 btl · 2 empties · Rs 240")).toBeVisible();

  // Second delivery the same day, 1 bottle
  await page.getByRole("button", { name: "Add another delivery for 12-B · 2nd floor" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("2 bottles already saved")).toBeVisible();
  await sheet.getByRole("button", { name: "One less: Full bottles delivered" }).click();
  await sheet.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved 1 bottle, 1 empties back")).toBeVisible();
  await expect(page.getByText("3 btl · 3 empties · Rs 360 · 2 entries")).toBeVisible();

  // Customer page: 500 + 240 + 120 = 860
  await page.getByText("3 btl · 3 empties · Rs 360 · 2 entries").click();
  await expect(page.getByText("Rs 860", { exact: true })).toBeVisible();

  // Edit the first entry: only 1 empty came back → 3 bottles at home
  await page.getByRole("button", { name: /^\d+ \w+ 2 bottles/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "One less: Empty bottles collected" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Entry updated. Balance recalculated.")).toBeVisible();
  await expect(page.locator("section").first()).toContainText("3 bottles at their home");

  // Delete the second entry (two taps) → 740
  await page.getByRole("button", { name: /^\d+ \w+ 1 bottle/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete this entry" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Tap again to delete" }).click();
  await expect(page.getByText("Entry deleted.")).toBeVisible();
  await expect(page.getByText("Rs 740", { exact: true })).toBeVisible();

  // Monthly customer pays this month's bill (Rs 240) online → balance back to the old Rs 500
  const balanceCard = page.locator("section").first();
  await page.getByRole("button", { name: "Payment", exact: true }).click();
  const pay = page.getByRole("dialog");
  await expect(pay.getByRole("radiogroup", { name: "Which month's bill?" })).toBeVisible();
  await pay.getByRole("button", { name: /bill Rs 240$/ }).click();
  await pay.getByRole("radio", { name: "Online to owner" }).click();
  await pay.getByLabel("Note (optional)").fill("JazzCash 4471");
  await expect(pay.getByText("Rs 500 due")).toBeVisible(); // "after this payment" preview
  await pay.getByRole("button", { name: "Save payment" }).click();
  await expect(page.getByText(/Payment Rs 240 saved for \w+ \d{4} · Online to owner/)).toBeVisible();
  await expect(balanceCard).toContainText("Rs 500");
  await expect(page.getByText("Paid ✓")).toBeVisible();
  await expect(page.getByRole("button", { name: /Payment For \w+ \d{4} · Online to owner · JazzCash 4471/ })).toBeVisible();

  // A large amount needs a second tap; then correct it to Rs 1,000 → Rs 500 advance; then delete it
  await page.getByRole("button", { name: "Payment", exact: true }).click();
  await pay.getByLabel("Amount received (Rs)").fill("60000");
  await pay.getByRole("button", { name: "Save payment" }).click();
  await expect(pay.getByText("Rs 60,000 is a large amount. Tap the button again to confirm.")).toBeVisible();
  await pay.getByRole("button", { name: "Yes, save Rs 60,000" }).click();
  await expect(balanceCard).toContainText("Rs 59,500");
  await expect(balanceCard).toContainText("Advance paid");
  await page.getByRole("button", { name: /^\d+ \w+ Payment .*Cash to owner/ }).click();
  await pay.getByLabel("Amount received (Rs)").fill("1000");
  await pay.getByRole("button", { name: "Save changes" }).click();
  await expect(balanceCard).toContainText("Rs 500");
  await expect(balanceCard).toContainText("Advance paid");
  await page.getByRole("button", { name: /^\d+ \w+ Payment .*Cash to owner/ }).click();
  await pay.getByRole("button", { name: "Delete this payment" }).click();
  await pay.getByRole("button", { name: "Tap again to delete" }).click();
  await expect(page.getByText("Payment deleted.")).toBeVisible();
  await expect(balanceCard).toContainText("Balance due");
  await expect(balanceCard).toContainText("Rs 500");

  // Daily customer: deliver on Today, then one tap on "Paid" in the message
  await page.goto("/customers/new");
  await page.getByLabel("House / Flat no *").fill("14");
  await page.getByLabel("Floor *").selectOption("1st");
  await page.getByLabel("Area / Street *").fill("Gulshan St 4");
  await page.getByText("More details (optional)").click();
  await page.getByText("Pay per delivery").click();
  await page.getByRole("button", { name: "Save customer" }).click();
  await expect(page.getByRole("heading", { name: "14 · 1st floor" })).toBeVisible();
  await page.getByRole("link", { name: "Today" }).click();
  await page.getByRole("button", { name: "One more", exact: true }).click(); // 14 is the only customer left to enter
  await page.getByRole("button", { name: "Save 1 bottle for 14 · 1st floor" }).click();
  await page.getByRole("button", { name: "Paid Rs 100" }).click();
  await expect(page.getByText("Payment Rs 100 saved · Cash to rider")).toBeVisible();
  // Today: billed 240 + 100 = 340; collected 240 (monthly bill paid today) + 100 (daily) = 340
  await expect(page.getByText("collected of Rs 340")).toBeVisible();
  await expect(page.getByText("Rs 340", { exact: true })).toBeVisible();
});
