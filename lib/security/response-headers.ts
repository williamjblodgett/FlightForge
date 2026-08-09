const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://cdn.jsdelivr.net https://storage.googleapis.com https://*.supabase.co",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-src 'self' https://www.google.com",
  "frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com",
  "form-action 'self'",
  "manifest-src 'self'",
].join("; ");

const privatePathPrefixes = [
  "/account/",
  "/admin/",
  "/api/",
  "/coach",
  "/favorites",
  "/onboarding",
  "/profile",
  "/sign-in",
  "/sign-up",
] as const;

export function withSecurityHeaders(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", contentSecurityPolicy);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "accelerometer=(), camera=(self), geolocation=(self), gyroscope=(), microphone=(self), payment=(), usb=()",
  );

  const url = new URL(request.url);
  if (url.protocol === "https:") {
    headers.set("Strict-Transport-Security", "max-age=31536000");
  }

  if (requiresPrivateCaching(request, response, url.pathname)) {
    headers.set("Cache-Control", "private, no-store");
  }
  appendVary(headers, "Cookie");
  appendVary(headers, "oai-authenticated-user-email");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function requiresPrivateCaching(
  request: Request,
  response: Response,
  pathname: string,
): boolean {
  return (
    privatePathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix)) ||
    request.headers.has("cookie") ||
    request.headers.has("oai-authenticated-user-email") ||
    response.headers.has("set-cookie")
  );
}

function appendVary(headers: Headers, value: string): void {
  const existing = headers.get("Vary")
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean) ?? [];
  if (!existing.some((entry) => entry.toLowerCase() === value.toLowerCase())) {
    existing.push(value);
  }
  headers.set("Vary", existing.join(", "));
}
