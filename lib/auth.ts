import { cookies } from "next/headers";
import { prisma } from "./prisma";
import crypto from "crypto";

const SESSION_COOKIE_NAME = "dnd_session_token";
const SECRET = process.env.AUTH_SECRET || "dnd-secret-key-change-in-prod-focus-app";

/**
 * Hashes a plaintext password using crypto scrypt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verifies a plaintext password against a stored hash.
 */
export function verifyPassword(password: string, combinedHash: string): boolean {
  try {
    const [salt, key] = combinedHash.split(":");
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

/**
 * Creates a signed token containing the userId and timestamp.
 */
export function createToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ userId, issuedAt: Date.now() })
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

/**
 * Verifies the signed token and extracts the userId.
 */
export function verifyToken(token: string): string | null {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;

    const expectedSignature = crypto
      .createHmac("sha256", SECRET)
      .update(payload)
      .digest("base64url");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )
    ) {
      return null;
    }

    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    return data.userId || null;
  } catch {
    return null;
  }
}

/**
 * Gets the authenticated user in Server Components / Route Handlers.
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const userId = verifyToken(token);
    if (!userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
      },
    });

    return user;
  } catch {
    return null;
  }
}

/**
 * Sets the session cookie on the outgoing response headers.
 */
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/**
 * Clears the session cookie.
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
