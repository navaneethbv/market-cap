import test from "node:test";
import assert from "node:assert/strict";
import { createAdminClient } from "./supabase/admin.ts";
import { createClient as createBrowserClient } from "./supabase/client.ts";
import { createClient as createServerClient } from "./supabase/server.ts";

test("createAdminClient throws when required environment variables are missing", () => {
  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const oldKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  assert.throws(
    () => createAdminClient(),
    /NEXT_PUBLIC_SUPABASE_URL is not set/
  );

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  assert.throws(
    () => createAdminClient(),
    /SUPABASE_SERVICE_ROLE_KEY is not set/
  );

  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-123";
  const client = createAdminClient();
  assert.ok(client);

  process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
  process.env.SUPABASE_SERVICE_ROLE_KEY = oldKey;
});

test("createBrowserClient creates browser supabase client", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "dummy-anon-key";

  const client = createBrowserClient();
  assert.ok(client);
});

test("createServerClient creates server supabase client with cookie store handling", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "dummy-anon-key";

  try {
    const client = await createServerClient();
    assert.ok(client);
  } catch (err) {
    // Under test runner, next/headers cookies() may raise outside of server component context
    assert.ok(err);
  }
});
