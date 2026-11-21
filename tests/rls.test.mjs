// Tenant isolation + database rules, against a real Supabase project (use staging, never production).
// Run: npm run test:db   (needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY)
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { phoneToEmail } from "../src/lib/phone.ts";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const skip = !URL || !ANON || !SECRET ? "Supabase env vars not set" : false;

const opts = { auth: { persistSession: false } };
const admin = skip ? null : createClient(URL, SECRET, opts);
const made = { users: [], businesses: [] };

async function makeOwner(label) {
  const phone = "923" + String(Math.floor(Math.random() * 1e9)).padStart(9, "0");
  const password = randomUUID();
  const { data: u, error } = await admin.auth.admin.createUser({ email: phoneToEmail(phone), password, email_confirm: true });
  if (error) throw error;
  made.users.push(u.user.id);
  const { data: b, error: be } = await admin.from("businesses").insert({ name: `RLS test ${label}` }).select("id").single();
  if (be) throw be;
  made.businesses.push(b.id);
  const { error: me } = await admin.from("memberships").insert({ user_id: u.user.id, business_id: b.id });
  if (me) throw me;
  const client = createClient(URL, ANON, opts);
  const { error: se } = await client.auth.signInWithPassword({ email: phoneToEmail(phone), password });
  if (se) throw se;
  return { client, businessId: b.id };
}

let A, B, bCustomerId;

before(async () => {
  if (skip) return;
  A = await makeOwner("A");
  B = await makeOwner("B");
  const { data, error } = await admin
    .from("customers")
    .insert({ business_id: B.businessId, house_no: "1", floor: "Ground", area: "B street" })
    .select("id")
    .single();
  if (error) throw error;
  bCustomerId = data.id;
});

after(async () => {
  if (skip) return;
  for (const id of made.businesses) await admin.from("businesses").delete().eq("id", id);
  for (const id of made.users) await admin.auth.admin.deleteUser(id);
});

test("A cannot see B's business or customers", { skip }, async () => {
  const { data: biz } = await A.client.from("businesses").select("id");
  assert.deepEqual(biz.map((b) => b.id), [A.businessId]);
  const { data: cust } = await A.client.from("customers").select("id").eq("id", bCustomerId);
  assert.equal(cust.length, 0);
});

test("A cannot insert into or update B's data", { skip }, async () => {
  const ins = await A.client.from("customers").insert({ business_id: B.businessId, house_no: "9", floor: "1st", area: "x" });
  assert.ok(ins.error, "insert into B must fail");

  const upd = await A.client.from("customers").update({ name: "hacked" }).eq("id", bCustomerId).select();
  assert.equal(upd.data?.length ?? 0, 0, "update of B's customer must touch nothing");
  const { data: check } = await admin.from("customers").select("name").eq("id", bCustomerId).single();
  assert.equal(check.name, null);

  const del = await A.client
    .from("deliveries")
    .insert({ id: randomUUID(), customer_id: bCustomerId, date: "2026-11-20", qty: 1, empties_returned: 1 });
  assert.ok(del.error, "delivery for B's customer must fail");
});

test("new rows get A's business and the floor price is copied onto deliveries", { skip }, async () => {
  const fp = await A.client.from("floor_prices").insert({ floor: "2nd", price: 120 });
  assert.ifError(fp.error);
  const { data: c, error } = await A.client
    .from("customers")
    .insert({ house_no: "12-B", floor: "2nd", area: "Gulshan St 4" })
    .select("id, business_id")
    .single();
  assert.ifError(error);
  assert.equal(c.business_id, A.businessId);

  const id = randomUUID();
  const d = await A.client.from("deliveries").insert({ id, customer_id: c.id, date: "2026-11-20", qty: 2, empties_returned: 2 }).select("rate, amount").single();
  assert.ifError(d.error);
  assert.deepEqual(d.data, { rate: 120, amount: 240 });

  const again = await A.client.from("deliveries").insert({ id, customer_id: c.id, date: "2026-11-20", qty: 2, empties_returned: 2 });
  assert.ok(again.error, "the same client id must not save twice");

  const { data: audit } = await A.client.from("audit_log").select("table_name").eq("row_id", id);
  assert.ok(audit.length >= 1, "delivery insert must be in the audit log");
});

test("inactive customers can't get deliveries; duplicates and bad values are rejected", { skip }, async () => {
  const { data: c } = await A.client.from("customers").insert({ house_no: "5", floor: "1st", area: "Street 11", active: false }).select("id").single();
  const d = await A.client.from("deliveries").insert({ id: randomUUID(), customer_id: c.id, date: "2026-11-20", qty: 1, empties_returned: 0 });
  assert.ok(d.error, "delivery for inactive customer must fail");

  await A.client.from("customers").insert({ house_no: "7", floor: "Roof", area: "Street 11" });
  const dup = await A.client.from("customers").insert({ house_no: " 7 ", floor: "roof", area: "street 11" });
  assert.ok(dup.error, "same house + floor + area must be rejected");

  const { data: ok } = await A.client.from("customers").select("id").eq("house_no", "7").single();
  const zero = await A.client.from("deliveries").insert({ id: randomUUID(), customer_id: ok.id, date: "2026-11-20", qty: 0, empties_returned: 0 });
  assert.ok(zero.error, "an entry with no bottles and no empties must fail");
  const pay = await A.client.from("payments").insert({ id: randomUUID(), customer_id: ok.id, date: "2026-11-20", amount: 0, method: "online" });
  assert.ok(pay.error, "a zero payment must fail");
  const month = await A.client.from("payments").insert({ id: randomUUID(), customer_id: ok.id, date: "2026-11-20", amount: 500, method: "online", for_month: "2026-11-15" });
  assert.ok(month.error, "for_month must be the 1st of a month");
});

test("customer_list: balance and bottles at home are calculated, deleted rows excluded", { skip }, async () => {
  const { data: c } = await A.client
    .from("customers")
    .insert({ house_no: "45-C", floor: "Ground", area: "Street 11", opening_balance: 600, opening_bottles: 2, custom_rate: 100 })
    .select("id")
    .single();
  const row = (qty, e) => ({ id: randomUUID(), customer_id: c.id, date: "2026-11-20", qty, empties_returned: e });
  const kept = [row(2, 2), row(1, 0), row(0, 1)]; // two deliveries the same day + an empties pickup
  const deleted = row(5, 0);
  assert.ifError((await A.client.from("deliveries").insert([...kept, deleted])).error);
  await A.client.from("deliveries").update({ deleted_at: new Date().toISOString() }).eq("id", deleted.id);
  assert.ifError(
    (await A.client.from("payments").insert({ id: randomUUID(), customer_id: c.id, date: "2026-11-20", amount: 1000, method: "cash_owner" })).error,
  );

  const { data } = await A.client.from("customer_list").select("rate, balance, bottles_at_home").eq("id", c.id).single();
  // 600 + (2+1)×100 − 1000 = −100 (advance); bottles 2 + 3 − 3 = 2
  assert.deepEqual(data, { rate: 100, balance: -100, bottles_at_home: 2 });

  const { data: other } = await A.client.from("customer_list").select("id").eq("id", bCustomerId);
  assert.equal(other.length, 0, "the view must respect RLS");
});

test("month_summary in the database matches the app's register (money fixture)", { skip }, async () => {
  const { data: c } = await A.client
    .from("customers")
    .insert({ house_no: "M-1", floor: "1st", area: "Money Street", opening_balance: 600, opening_bottles: 2 })
    .select("id")
    .single();
  const d = (date, qty, e, rate) => ({ id: randomUUID(), customer_id: c.id, date, qty, empties_returned: e, rate });
  const p = (date, amount, for_month) => ({ id: randomUUID(), customer_id: c.id, date, amount, method: "cash_owner", for_month });
  const entries = [d("2026-10-05", 2, 2, 110), d("2026-10-20", 3, 2, 110), d("2026-10-25", 5, 0, 110), d("2026-11-12", 2, 2, 120), d("2026-11-12", 1, 0, 120), d("2026-11-15", 0, 2, 120)];
  const payments = [p("2026-11-02", 400, "2026-10-01"), p("2026-11-18", 1500, "2026-11-01")];
  assert.ifError((await A.client.from("deliveries").insert(entries)).error);
  assert.ifError((await A.client.from("payments").insert(payments)).error);
  await A.client.from("deliveries").update({ deleted_at: new Date().toISOString() }).eq("id", entries[2].id);

  const { statement } = await import("../src/lib/ledger.ts");
  const live = entries.filter((_, i) => i !== 2).map((e) => ({ ...e, amount: e.qty * e.rate }));
  for (const month of ["2026-10", "2026-11"]) {
    const { data, error } = await A.client.rpc("month_summary", { p_month: month + "-01" });
    assert.ifError(error);
    const row = data.find((r) => r.customer_id === c.id);
    const s = statement(600, live, payments, month);
    assert.deepEqual(
      { opening: row.opening, bottles: row.bottles, empties: row.empties, billed: row.billed, paid: row.paid, closing: row.closing },
      { opening: s.opening, bottles: s.bottles, empties: s.empties, billed: s.billed, paid: s.paid, closing: s.closing },
      month,
    );
  }
  // October 1150 → November −390 (advance), same as tests/ledger.test.ts
  const nov = (await A.client.rpc("month_summary", { p_month: "2026-11-01" })).data.find((r) => r.customer_id === c.id);
  assert.equal(nov.closing, -390);

  const { data: other } = await B.client.rpc("month_summary", { p_month: "2026-11-01" });
  assert.ok(!other.some((r) => r.customer_id === c.id), "B must not see A's summary");
});

test("logged-out visitors read nothing", { skip }, async () => {
  const anon = createClient(URL, ANON, opts);
  const { data } = await anon.from("customers").select("id");
  assert.equal(data?.length ?? 0, 0);
});
