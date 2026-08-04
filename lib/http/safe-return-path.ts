const RETURN_PATH_ORIGIN = "https://flightforge.local";

const reservedAuthenticationPaths = new Set([
  "/signin-with-chatgpt",
  "/signout-with-chatgpt",
  "/callback",
]);

/**
 * Keeps browser return destinations on this application origin. URL parsing is
 * intentional: browsers normalize backslashes in special-scheme URLs, so a
 * string-prefix check alone does not prevent every protocol-relative redirect.
 */
export function safeRelativeReturnPath(value: string | null | undefined): string {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/";
  }

  let url: URL;
  try {
    url = new URL(value, RETURN_PATH_ORIGIN);
  } catch {
    return "/";
  }

  if (url.origin !== RETURN_PATH_ORIGIN || reservedAuthenticationPaths.has(url.pathname)) {
    return "/";
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
