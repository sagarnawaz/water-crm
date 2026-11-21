import { test } from "node:test";
import assert from "node:assert/strict";
import { toCSV } from "../src/lib/csv.ts";

test("toCSV quotes text, keeps numbers plain, and adds a BOM", () => {
  assert.equal(toCSV([["house", "amount"], ['12-B "upper"', 240], [null, -500]]), '﻿"house","amount"\r\n"12-B ""upper""",240\r\n,-500\r\n');
});

test("toCSV stops spreadsheet formulas in text", () => {
  const out = toCSV([["=HYPERLINK(\"x\")", "+92300", "-5", "@cmd", "normal, text"]]);
  assert.equal(out, '﻿"\'=HYPERLINK(""x"")","\'+92300","\'-5","\'@cmd","normal, text"\r\n');
});
