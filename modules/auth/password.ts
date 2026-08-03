const DEFAULT_PBKDF2_ITERATIONS = 210_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

export type PasswordRecord = {
  hash: string;
  salt: string;
  iterations: number;
};

export async function createPasswordRecord(password: string): Promise<PasswordRecord> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iterations = DEFAULT_PBKDF2_ITERATIONS;
  return {
    hash: encodeBase64Url(await derivePassword(password, salt, iterations)),
    salt: encodeBase64Url(salt),
    iterations,
  };
}

export async function verifyPassword(
  password: string,
  record: PasswordRecord,
): Promise<boolean> {
  let expected: Uint8Array;
  let salt: Uint8Array;
  try {
    expected = decodeBase64Url(record.hash);
    salt = decodeBase64Url(record.salt);
  } catch {
    return false;
  }
  const actual = await derivePassword(password, salt, record.iterations);
  return constantTimeEqual(expected, actual);
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 12) return "Use at least 12 characters.";
  if (password.length > 128) return "Use no more than 128 characters.";
  if (!/[A-Za-z]/u.test(password) || !/[0-9]/u.test(password)) {
    return "Include at least one letter and one number.";
  }
  return null;
}

export async function sha256Text(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return encodeBase64Url(new Uint8Array(digest));
}

export function randomToken(byteLength = 32): string {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

async function derivePassword(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const saltBuffer = salt.buffer.slice(
    salt.byteOffset,
    salt.byteOffset + salt.byteLength,
  ) as ArrayBuffer;
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBuffer, iterations },
    key,
    HASH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  const maxLength = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < maxLength; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

function encodeBase64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
