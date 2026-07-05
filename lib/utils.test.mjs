import assert from "node:assert/strict";
import { test } from "node:test";
import { cn } from "./utils.ts";

test("cn merges class inputs correctly, handling falsey values and conflicts", () => {
  // Merges basic classes
  assert.equal(cn("px-2 py-2", "p-4"), "p-4");
  
  // Handles falsey values
  assert.equal(cn("text-red-500", undefined, null, false, "text-blue-500"), "text-blue-500");
  
  // Combines distinct classes
  assert.equal(cn("flex", "items-center"), "flex items-center");
});
