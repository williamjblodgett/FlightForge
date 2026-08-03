import type { DemoUser } from "./demo-users";
import type { AuthenticatedUser, Role } from "./types";

export const DEMO_SESSION_COOKIE = "flightforge_demo_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

type DemoSessionPayload = {
  id: string;
  email: string;
  displayName: string;
  roles: Role[];
  exp: number;
};

export function isDemoAuthEnabled(): boolean {
  return process.env.DEMO_AUTH_ENABLED === "true";
}

export function getDemoSessionSecret(): string | null {
  const secret = process.env.DEMO_AUTH_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export async function createDemoSessionToken(
  user: DemoUser,
  secret: string,
): Promise<string> {
  const payload: DemoSessionPayload = {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    roles: user.roles,
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  };
  const encodedPayload = encodeText(JSON.stringify(payload));
  const signature = await sign(encodedPayload, secret);
  return `${encodedPayload}.${encodeBytes(signature)}`;
}

export async function verifyDemoSessionToken(
  token: string,
  secret: string,
): Promise<AuthenticatedUser | null> {
  const [encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra) return null;

  let signature: Uint8Array;
  let payload: unknown;
  try {
    signature = decodeBytes(encodedSignature);
    payload = JSON.parse(decodeText(encodedPayload));
  } catch {
    return null;
  }

  const key = await importSigningKey(secret, ["verify"]);
  const signatureBuffer = signature.buffer.slice(
    signature.byteOffset,
    signature.byteOffset + signature.byteLength,
  ) as ArrayBuffer;
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBuffer,
    new TextEncoder().encode(encodedPayload),
  );
  if (!valid || !isDemoSessionPayload(payload)) return null;
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null;

  return {
    id: payload.id,
    email: payload.email,
    displayName: payload.displayName,
    roles: payload.roles,
    source: "demo",
    onboardingComplete: true,
    isTestAccount: true,
  };
}

export function demoSessionMaxAge(): number {
  return SESSION_DURATION_SECONDS;
}

async function sign(value: string, secret: string): Promise<ArrayBuffer> {
  const key = await importSigningKey(secret, ["sign"]);
  return crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
}

async function importSigningKey(
  secret: string,
  usage: KeyUsage[],
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usage,
  );
}

function encodeText(value: string): string {
  return encodeBytes(new TextEncoder().encode(value));
}

function decodeText(value: string): string {
  return new TextDecoder().decode(decodeBytes(value));
}

function encodeBytes(value: ArrayBuffer | Uint8Array): string {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function decodeBytes(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function isDemoSessionPayload(value: unknown): value is DemoSessionPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DemoSessionPayload>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.displayName === "string" &&
    typeof candidate.exp === "number" &&
    Array.isArray(candidate.roles) &&
    candidate.roles.every((role) => typeof role === "string")
  );
}
