import assert from "node:assert/strict";
import { test } from "node:test";
import { downloadCsvFile } from "./download-csv.ts";

test("downloadCsvFile creates link and triggers download and removal", () => {
  let clicked = false;
  let removed = false;
  let appended = false;

  globalThis.Blob = class {
    constructor(content, options) {
      this.content = content;
      this.options = options;
    }
  };

  globalThis.URL.createObjectURL = () => "blob:mock-url";
  globalThis.URL.revokeObjectURL = () => {};

  globalThis.document = {
    body: {
      appendChild: () => {
        appended = true;
      },
    },
    createElement: () => {
      return {
        href: "",
        download: "",
        click: () => {
          clicked = true;
        },
        remove: () => {
          removed = true;
        },
      };
    },
  };

  downloadCsvFile("col1,col2\n1,2", "test.csv");
  assert.ok(appended);
  assert.ok(clicked);
  assert.ok(removed);
});
