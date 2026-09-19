const DEFAULT_ACCOUNT_PATH = "/account/profile";
const RETURN_ORIGIN = "https://digital-matnog.local";

type AuthNavigationContext = { serviceSlug?: string; returnTo?: string };

function isAllowedReturnPath(pathname: string): boolean {
  return (
    pathname === "/account/profile" ||
    pathname === "/account/id" ||
    pathname === "/services" ||
    pathname.startsWith("/services/") ||
    pathname === "/track"
  );
}

/** Accepts only known citizen-facing paths, preventing staff or external redirects. */
export function sanitizeReturnPath(value?: string): string | undefined {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) return undefined;
  const parsed = new URL(value, RETURN_ORIGIN);
  if (parsed.origin !== RETURN_ORIGIN || !isAllowedReturnPath(parsed.pathname)) return undefined;
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function resolvePostSignInPath({ serviceSlug, returnTo }: { serviceSlug?: string; returnTo?: string }): string {
  if (serviceSlug) return `/services/${encodeURIComponent(serviceSlug)}/start`;
  return sanitizeReturnPath(returnTo) ?? DEFAULT_ACCOUNT_PATH;
}

export function buildSignInPath(returnTo?: string): string {
  const safeReturn = sanitizeReturnPath(returnTo);
  return safeReturn ? `/auth/phone?returnTo=${encodeURIComponent(safeReturn)}` : "/auth/phone";
}

function buildAuthPath(pathname: string, { serviceSlug, returnTo }: AuthNavigationContext): string {
  const query = new URLSearchParams();
  if (serviceSlug) query.set("service", serviceSlug);
  else {
    const safeReturn = sanitizeReturnPath(returnTo);
    if (safeReturn) query.set("returnTo", safeReturn);
  }
  const search = query.toString();
  return search ? `${pathname}?${search}` : pathname;
}

export function buildPhoneEntryPath(context: AuthNavigationContext = {}): string {
  return buildAuthPath("/auth/phone", context);
}

export function buildVerifyPath(context: AuthNavigationContext = {}): string {
  return buildAuthPath("/auth/verify", context);
}
