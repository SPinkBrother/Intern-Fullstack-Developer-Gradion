import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "gradion_session";
export const SESSION_DAYS = 7;

export async function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return { passwordSalt: salt, passwordHash: hash.toString("hex") };
}

export async function verifyPassword(password: string, salt: string, expectedHex: string) {
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function newSessionToken() { return randomBytes(32).toString("base64url"); }
export function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
export function sessionExpiry(now = Date.now()) { return new Date(now + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString(); }
export function cookieOptions() {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000 };
}
