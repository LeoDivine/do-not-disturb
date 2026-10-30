import NextAuth from "next-auth";
import type { DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "./lib/prisma";
import crypto from "crypto";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

function verifyPassword(password: string, combinedHash: string): boolean {
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

function getAuthSecret(): string {
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

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: getAuthSecret(),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  providers: [
    Google({
      clientId:
        process.env.GOOGLE_CLIENT_ID ||
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
        "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const normalizedEmail = (credentials.email as string)
          .trim()
          .toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = verifyPassword(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email?.trim().toLowerCase();
        if (!email) return false;

        let dbUser = await prisma.user.findUnique({
          where: { email },
        });

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              email,
              name: user.name || "Google User",
              avatarUrl: user.image || null,
              settings: {
                create: {
                  deepFocusMinutes: 25,
                  shortBreakMinutes: 5,
                  longBreakMinutes: 15,
                },
              },
              streak: {
                create: {
                  currentStreak: 1,
                  longestStreak: 1,
                  totalFocusHours: 0,
                },
              },
            },
          });
        } else {
          const updates: { name?: string; avatarUrl?: string } = {};
          if (user.name && (!dbUser.name || dbUser.name === "Google User")) {
            updates.name = user.name;
          }
          if (
            user.image &&
            (!dbUser.avatarUrl || dbUser.avatarUrl.includes("default-user"))
          ) {
            updates.avatarUrl = user.image;
          }
          if (Object.keys(updates).length > 0) {
            await prisma.user.update({
              where: { id: dbUser.id },
              data: updates,
            });
          }
        }

        user.id = dbUser.id;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
