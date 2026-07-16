function cleanOrigin(value: string): string | null {
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function localhostOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  const origin = cleanOrigin(value);
  if (!origin) return null;
  const { hostname } = new URL(origin);
  return hostname === "localhost" || hostname === "127.0.0.1" ? origin : null;
}

export function getAppOrigin(requestOrigin?: string | null): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL;

  if (configured) {
    const origin = cleanOrigin(configured);
    if (origin) return origin;
  }

  return localhostOrigin(requestOrigin) ?? "http://localhost:3000";
}
