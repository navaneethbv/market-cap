import assert from "node:assert/strict";
import { test } from "node:test";
import { executeAlertTrigger } from "./alerts-trigger.ts";

test("executeAlertTrigger handles active alerts, marks inactive, and calls webhook", async () => {
  let updateCalled = false;
  let fetchCalled = false;
  let fetchPayload = null;

  const mockSupabase = {
    from(table) {
      assert.equal(table, "price_alerts");
      return {
        select(cols) {
          assert.ok(cols.includes("target_price"));
          return {
            eq(field, val) {
              assert.equal(field, "id");
              assert.equal(val, "alert-123");
              return {
                async maybeSingle() {
                  return {
                    data: {
                      id: "alert-123",
                      symbol: "AAPL",
                      direction: "above",
                      target_price: 150,
                      active: true,
                      webhook_url: "http://slack-webhook.com",
                      notify_email: true,
                    },
                    error: null,
                  };
                },
              };
            },
          };
        },
        update(values) {
          assert.equal(values.active, false);
          updateCalled = true;
          return {
            async eq(field, val) {
              assert.equal(field, "id");
              assert.equal(val, "alert-123");
              return { error: null };
            },
          };
        },
      };
    },
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    fetchCalled = true;
    fetchPayload = { url, options };
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  try {
    const result = await executeAlertTrigger(
      mockSupabase,
      "test@example.com",
      "alert-123",
      155.25
    );

    assert.deepEqual(result, { triggered: true });
    assert.ok(updateCalled, "expected database update to deactivate alert");
    assert.ok(fetchCalled, "expected fetch webhook dispatch to be executed");
    assert.equal(fetchPayload.url, "http://slack-webhook.com");
    assert.match(fetchPayload.options.body, /aapl/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("executeAlertTrigger skips already inactive alerts", async () => {
  const mockSupabase = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  return {
                    data: {
                      id: "alert-123",
                      symbol: "AAPL",
                      direction: "above",
                      target_price: 150,
                      active: false,
                      webhook_url: null,
                      notify_email: false,
                    },
                    error: null,
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  const result = await executeAlertTrigger(
    mockSupabase,
    "test@example.com",
    "alert-123",
    155.25
  );

  assert.deepEqual(result, { triggered: false, message: "Alert already triggered or paused" });
});

test("executeAlertTrigger throws on select database errors", async () => {
  const mockSupabase = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  return { data: null, error: { message: "Database read failure" } };
                },
              };
            },
          };
        },
      };
    },
  };

  await assert.rejects(
    executeAlertTrigger(mockSupabase, "test@example.com", "alert-123", 155.25),
    /Database read failure/
  );
});

test("executeAlertTrigger throws when alert is not found", async () => {
  const mockSupabase = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  return { data: null, error: null };
                },
              };
            },
          };
        },
      };
    },
  };

  await assert.rejects(
    executeAlertTrigger(mockSupabase, "test@example.com", "alert-123", 155.25),
    /Alert not found/
  );
});

test("executeAlertTrigger throws on update database errors", async () => {
  const mockSupabase = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  return {
                    data: {
                      id: "alert-123",
                      symbol: "AAPL",
                      direction: "above",
                      target_price: 150,
                      active: true,
                      webhook_url: null,
                      notify_email: false,
                    },
                    error: null,
                  };
                },
              };
            },
          };
        },
        update() {
          return {
            async eq() {
              return { error: { message: "Database update failure" } };
            },
          };
        },
      };
    },
  };

  await assert.rejects(
    executeAlertTrigger(mockSupabase, "test@example.com", "alert-123", 155.25),
    /Database update failure/
  );
});
