import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server.js";

const PROTECTED_PATHS = [
  "/portfolio",
  "/watchlist",
  "/alerts",
  "/compare/saved",
  "/trading",
];

// Public API routes that proxy to external market data providers. These are
// rate limited as a best-effort guard (per instance) against abusive traffic.
const EXTERNAL_API_PREFIXES = [
  "/api/backtest",
  "/api/candles",
  "/api/compare/matrix",
  "/api/correlation",
  "/api/insiders",
  "/api/quote",
  "/api/screener",
  "/api/search",
  "/api/stock/",
];

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 90;

const requestBuckets = new Map<string, { windowStart: number; count: number }>();

function isRateLimited(request: NextRequest): boolean {
  const path = request.nextUrl.pathname;
  if (!EXTERNAL_API_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return false;
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const key = `${ip}:${path}`;
  const now = Date.now();
  const bucket = requestBuckets.get(key);

  if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    requestBuckets.set(key, { windowStart: now, count: 1 });
    // Opportunistically prune stale entries so the map stays bounded
    if (requestBuckets.size > 10_000) {
      for (const [bucketKey, value] of requestBuckets) {
        if (now - value.windowStart >= RATE_LIMIT_WINDOW_MS) {
          requestBuckets.delete(bucketKey);
        }
      }
    }
    return false;
  }

  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX;
}

export default async function proxy(request: NextRequest) {
  if (isRateLimited(request)) {
    const retryAfter = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);
    return NextResponse.json(
      { error: "Too many requests, slow down." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session if needed; required for Server Components to see it
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && PROTECTED_PATHS.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*[.](?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
