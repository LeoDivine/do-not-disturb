import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { auth, signIn, signOut } from "@/auth";
import crypto from "crypto";

export { auth, signIn, signOut };

const SESSION_COOKIE_NAME = "dnd_session_token";

function getSecretKey(): string {
	const secret =
		process.env.AUTH_SECRET ||
		process.env.NEXTAUTH_SECRET ||
		process.env.BETTER_AUTH_SECRET;

	if (!secret && process.env.NODE_ENV === "production") {
		throw new Error(
			"FATAL: AUTH_SECRET or NEXTAUTH_SECRET environment variable is missing in production."
		);
	}

	return secret || "dnd-secret-key-development-only-change-in-prod";
}

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
export function verifyPassword(
	password: string,
	combinedHash: string,
): boolean {
	try {
		const [salt, key] = combinedHash.split(":");
		if (!salt || !key) return false;
		const keyBuffer = Buffer.from(key, "hex");
		const derivedKey = crypto.scryptSync(password, salt, 64);
		if (keyBuffer.length !== derivedKey.length) return false;
		return crypto.timingSafeEqual(keyBuffer, derivedKey);
	} catch {
		return false;
	}
}

/**
 * Creates a signed token containing the userId, issuedAt and expiresAt timestamps.
 */
export function createToken(userId: string): string {
	const now = Date.now();
	const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days
	const payload = Buffer.from(
		JSON.stringify({ userId, issuedAt: now, expiresAt }),
	).toString("base64url");
	const signature = crypto
		.createHmac("sha256", getSecretKey())
		.update(payload)
		.digest("base64url");
	return `${payload}.${signature}`;
}

/**
 * Verifies the signed token, checks expiration, and extracts the userId.
 */
export function verifyToken(token: string): string | null {
	try {
		const [payload, signature] = token.split(".");
		if (!payload || !signature) return null;

		const expectedSignature = crypto
			.createHmac("sha256", getSecretKey())
			.update(payload)
			.digest("base64url");

		const sigBuffer = Buffer.from(signature);
		const expBuffer = Buffer.from(expectedSignature);

		if (
			sigBuffer.length !== expBuffer.length ||
			!crypto.timingSafeEqual(sigBuffer, expBuffer)
		) {
			return null;
		}

		const data = JSON.parse(
			Buffer.from(payload, "base64url").toString("utf-8"),
		);

		if (!data || !data.userId) return null;

		// Enforce expiration check (30 days maximum lifespan)
		if (typeof data.expiresAt === "number" && Date.now() > data.expiresAt) {
			return null;
		}

		return data.userId || null;
	} catch {
		return null;
	}
}

/**
 * Gets the authenticated user in Server Components / Route Handlers using Auth.js session,
 * with fallback to legacy session token if present.
 */
export async function getCurrentUser() {
	try {
		// 1. Primary: check Auth.js (NextAuth) session
		const session = await auth();
		if (session?.user?.id) {
			const user = await prisma.user.findUnique({
				where: { id: session.user.id },
				select: {
					id: true,
					email: true,
					name: true,
					avatarUrl: true,
				},
			});
			if (user) return user;
		}

		// 2. Fallback: check legacy session cookie during transition
		const cookieStore = await cookies();
		const legacyToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
		if (legacyToken) {
			const userId = verifyToken(legacyToken);
			if (userId) {
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
			}
		}

		return null;
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
 * Clears both legacy and NextAuth session cookies to ensure full logout.
 */
export async function clearSessionCookie() {
	const cookieStore = await cookies();
	const cookiesToClear = [
		SESSION_COOKIE_NAME,
		"authjs.session-token",
		"__Secure-authjs.session-token",
		"next-auth.session-token",
		"__Secure-next-auth.session-token",
		"authjs.csrf-token",
		"__Host-authjs.csrf-token",
		"next-auth.csrf-token",
	];

	for (const name of cookiesToClear) {
		cookieStore.delete(name);
	}
}
