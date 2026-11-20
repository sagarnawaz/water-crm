import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone } from "../src/lib/phone.ts";

test("normalizePhone accepts common Pakistani mobile formats", () => {
  for (const input of ["0300-1234567", "03001234567", "+92 300 1234567", "923001234567", "00923001234567", "300 1234567"]) {
    assert.equal(normalizePhone(input), "923001234567", input);
  }
});

test("normalizePhone rejects non-mobile numbers", () => {
  for (const input of ["", "12345", "021-34567890", "0300-123456", "04001234567", "+1 415 555 0100"]) {
    assert.equal(normalizePhone(input), null, input);
  }
});
