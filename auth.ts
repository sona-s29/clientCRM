/**
 * auth.ts — Auth.js (NextAuth v5) configuration.
 * ----------------------------------------------------------------------------
 * This file lives at the project ROOT (not inside app/) because Auth.js v5's
 * new pattern exports a single config object that is imported by:
 *   - app/api/auth/[...nextauth]/route.ts  (the HTTP handlers)
 *   - middleware.ts                         (route protection)
 *   - any server component / route handler that needs `auth()`
 *
 * WHY CREDENTIALS + JWT (not database sessions):
 * We authenticate against our own `User` table with a hashed password
 * (bcrypt), not an OAuth provider. Auth.js does not support database-backed
 * sessions together with the Credentials provider (there is no OAuth
 * "account" to link), so we use JSON Web Token sessions instead: after
 * `authorize()` succeeds, Auth.js signs a JWT (encrypted, signed with
 * AUTH_SECRET) and stores it in an httpOnly cookie. No session table needed.
 *
 * MULTI-TENANCY: `organizationId` and `isSuperAdmin` are baked into the JWT
 * at login (see the `jwt` callback below) and copied onto `session.user` on
 * every read. This is what lib/tenant.ts's `requireOrgUser()` and
 * `requireSuperAdmin()` read to determine tenant scope — it comes from the
 * signed, server-issued token, never from anything the client sends.
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role, UserStatus } from "@prisma/client";

declare module "next-auth" {
  interface User {
    role: Role;
    status: UserStatus;
    organizationId: string | null;
    isSuperAdmin: boolean;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
      organizationId: string | null;
      isSuperAdmin: boolean;
      avatarUrl: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    organizationId: string | null;
    isSuperAdmin: boolean;
    avatarUrl: string | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 days
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
          include: { organization: { select: { status: true } } },
        });
        if (!user) return null;

        // Deactivated/suspended accounts cannot sign in even with a correct password.
        if (user.status !== "ACTIVE") return null;

        // A suspended ORGANIZATION blocks every one of its users from
        // logging in, regardless of their individual account status — this
        // is how a Super Admin locks out an entire tenant (see
        // PATCH /api/admin/organizations/[id]). Super Admins have no
        // organization, so this check only applies to tenant users.
        if (user.organization && user.organization.status === "SUSPENDED") return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        // Fire-and-forget: record lastLogin. Not awaited so login isn't slowed down.
        prisma.user
          .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
          .catch(() => {});

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          organizationId: user.organizationId,
          isSuperAdmin: user.isSuperAdmin,
          avatarUrl: user.avatarUrl,
        } as unknown as import("next-auth").User;
      },
    }),
  ],
  callbacks: {
    // Runs whenever a JWT is created/updated. We copy the fields we need
    // from the `user` object (only present on sign-in) onto the token so
    // they persist across requests without a DB hit.
    async jwt({ token, user }) {
      if (user) {
        const u = user as {
          id: string;
          role: Role;
          organizationId: string | null;
          isSuperAdmin: boolean;
          avatarUrl: string | null;
        };
        token.id = u.id;
        token.role = u.role;
        token.organizationId = u.organizationId;
        token.isSuperAdmin = u.isSuperAdmin;
        token.avatarUrl = u.avatarUrl;
      }
      return token;
    },
    // Runs whenever `session` or `useSession()`/`auth()` is read. We copy the
    // token fields onto `session.user` so server & client code can read
    // `session.user.role` / `.organizationId` / `.isSuperAdmin` directly.
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.organizationId = token.organizationId;
        session.user.isSuperAdmin = token.isSuperAdmin;
        session.user.avatarUrl = token.avatarUrl;
      }
      return session;
    },
  },
});
