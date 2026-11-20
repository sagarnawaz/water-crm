import { test } from "node:test";
import assert from "node:assert/strict";
import { addressKey, parseCustomer, parseFloorPrices, FLOORS, rs } from "../src/lib/customers.ts";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};
const base = { house_no: " 12-B ", floor: "2nd", area: "Gulshan  St 4", billing_type: "monthly" };

test("a new customer needs only house, floor and area", () => {
  const r = parseCustomer(form(base), true);
  assert.ok("data" in r);
  assert.deepEqual(r.data, {
    house_no: "12-B", floor: "2nd", area: "Gulshan St 4", name: null, phone: null, billing_type: "monthly",
    custom_rate: null, default_qty: null, opening_balance: 0, opening_bottles: 0,
  });
});

test("missing or bad fields give a clear error", () => {
  const err = (f: Record<string, string>, isNew = true) => {
    const r = parseCustomer(form({ ...base, ...f }), isNew);
    return "error" in r ? r.error : null;
  };
  assert.match(err({ area: "" })!, /required/);
  assert.match(err({ floor: "__other", floor_other: "" })!, /required/);
  assert.match(err({ custom_rate: "0" })!, /Custom price must be 1 or more/);
  assert.match(err({ custom_rate: "12.5" })!, /whole number/);
  assert.match(err({ default_qty: "-1" })!, /Usual bottles/);
  assert.match(err({ opening_bottles: "-2" })!, /Bottles at home/);
  assert.match(err({ phone: "0300" })!, /too short/);
  assert.match(err({ billing_type: "weekly" })!, /pays/);
  assert.equal(err({ opening_balance: "-500" }), null, "advance from the paper register is allowed");
});

test("other floor, custom price and edit-only status", () => {
  const r = parseCustomer(form({ ...base, floor: "__other", floor_other: "Mezzanine", custom_rate: "1,500", active: "false" }), false);
  assert.ok("data" in r);
  assert.equal(r.data.floor, "Mezzanine");
  assert.equal(r.data.custom_rate, 1500);
  assert.equal(r.data.active, false);
  assert.equal(r.data.opening_balance, undefined, "opening values can't be changed after creation");
});

test("addressKey ignores case and outer spaces, like the database index", () => {
  assert.equal(addressKey(" 12-b", "2ND ", "gulshan st 4"), addressKey("12-B", "2nd", "Gulshan St 4"));
});

test("floor prices: every floor and other floors must be above 0", () => {
  const all = Object.fromEntries(FLOORS.map((f) => [`fp_${f}`, "100"]));
  const ok = parseFloorPrices(form({ ...all, default_rate: "100" }));
  assert.ok("prices" in ok && ok.prices["Roof"] === 100 && ok.other === 100);
  assert.ok("error" in parseFloorPrices(form({ ...all, "fp_2nd": "0", default_rate: "100" })));
  assert.ok("error" in parseFloorPrices(form({ ...all, default_rate: "" })));
});

test("rs uses lakh grouping", () => {
  assert.equal(rs(100000), "Rs 1,00,000");
  assert.equal(rs(-1250), "Rs 1,250");
});
