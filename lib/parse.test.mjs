import test from "node:test";
import assert from "node:assert/strict";
import { isUuid, parseDateTimestamp } from "./parse.ts";

test("isUuid correctly identifies valid and invalid UUIDs", () => {
  assert.equal(isUuid("123e4567-e89b-12d3-a456-426614174000"), true);
  assert.equal(isUuid("ABCDEF01-1234-4567-89AB-CDEF01234567"), true);
  assert.equal(isUuid("invalid-uuid"), false);
  assert.equal(isUuid(""), false);
});

test("parseDateTimestamp parses date strings and handles malformed inputs", () => {
  const ts = parseDateTimestamp("2026-08-13");
  assert.ok(typeof ts === "number" && ts > 0);

  const isoTs = parseDateTimestamp("2026-08-13T12:00:00Z");
  assert.ok(typeof isoTs === "number" && isoTs > 0);

  assert.equal(parseDateTimestamp("not-a-date"), 0);
  assert.equal(parseDateTimestamp(""), 0);
});
