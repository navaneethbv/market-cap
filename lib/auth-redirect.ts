/** Keep post-auth navigation on this site, including after URL normalization. */
export function getSafeAuthRedirect(value: string | null): string {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\") || [...value].some((char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127)) {
    return "/";
  }
  const base = "https://local.invalid";
  try {
    const url = new URL(value, base);
    if (url.origin !== base || url.pathname.startsWith("//")) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
