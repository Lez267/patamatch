import { APIError, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware } from "better-auth/api";
import { db } from "./db";
import { getPasswordValidationError } from "./password-policy";
import { getTrustedOrigins } from "./trusted-origins";

export const auth = betterAuth({
  appName: "PataMatch",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: "postgresql" }),
  trustedOrigins: async (request?: Request) => {
    const staticOrigins = getTrustedOrigins();
    if (!request) return staticOrigins;
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    const dynamic: string[] = [];
    if (origin) dynamic.push(origin);
    if (host) {
      dynamic.push(`http://${host}`, `https://${host}`);
    }
    return [...new Set([...staticOrigins, ...dynamic])];
  },
  emailAndPassword: { enabled: true, minPasswordLength: 10, maxPasswordLength: 128 },
  hooks: {
    before: createAuthMiddleware(async context => {
      const password = ["/sign-up/email", "/set-password"].includes(context.path)
        ? context.body?.password
        : ["/change-password", "/reset-password"].includes(context.path) ? context.body?.newPassword : undefined;
      if (typeof password !== "string") return;
      const error = getPasswordValidationError(password);
      if (error) throw new APIError("BAD_REQUEST", { message: error });
    }),
  },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "ADOPTANTE", input: false },
      active: { type: "boolean", defaultValue: true, input: false },
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 7, cookieCache: { enabled: false } },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({ data: { ...user, role: "ADOPTANTE", active: true } }),
      },
    },
    session: {
      create: {
        before: async (session) => {
          const user = await db.user.findUnique({ where: { id: session.userId }, select: { active: true } });
          if (!user?.active) throw new APIError("FORBIDDEN", { message: "Esta cuenta está desactivada. Contacta a la administración." });
          return { data: session };
        },
      },
    },
  },
});
