import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, isISODate, fmtDay } from "../src/lib/dates.ts";
import { checkEntry, isOldDate, isUUID, newId } from "../src/lib/deliveries.ts";

const today = "2026-11-20";
const err = (date: unknown, qty: unknown, empties: unknown) => {
  const r = checkEntry({ date, qty, empties }, today);
  return "error" in r ? r.error : null;
};

test("valid entries: normal swap, extra empties, empties-only pickup", () => {
  assert.deepEqual(checkEntry({ date: today, qty: 2, empties: 2 }, today), { data: { date: today, qty: 2, empties_returned: 2 } });
  assert.equal(err("2026-11-19", 1, 3), null);
  assert.equal(err(today, 0, 3), null, "empties pickup with no bottles");
});

test("rejected entries", () => {
  assert.match(err(today, 0, 0)!, /Enter bottles/);
  assert.match(err("2026-11-21", 1, 1)!, /future/);
  assert.match(err("2026-02-30", 1, 1)!, /valid date/);
  assert.match(err("20-11-2026", 1, 1)!, /valid date/);
  assert.match(err(today, 1.5, 1)!, /whole numbers/);
  assert.match(err(today, -1, 1)!, /whole numbers/);
  assert.match(err(today, 101, 0)!, /whole numbers/);
  assert.match(err(today, "2", 2)!, /whole numbers/, "strings from a tampered request are rejected");
});

test("old-date warning starts after 60 days", () => {
  assert.equal(isOldDate(addDays(today, -60), today), false);
  assert.equal(isOldDate(addDays(today, -61), today), true);
});

test("dates", () => {
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(isISODate("2026-11-20"), true);
  assert.equal(isISODate("2026-13-01"), false);
  assert.equal(fmtDay("2026-11-20"), "Fri 20 Nov");
});

test("newId makes valid, unique UUIDs", () => {
  const ids = new Set(Array.from({ length: 1000 }, newId));
  assert.equal(ids.size, 1000);
  for (const id of ids) assert.ok(isUUID(id) && id[14] === "4", id);
});
