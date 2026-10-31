import { getAuth, clerkClient } from "@clerk/express";
import type { Request, RequestHandler } from "express";
import type { User } from "@shared/models/auth";
import { accountStore } from "./accounts";
import { isRemovedAccountError } from "./account-removal";
import { isStaffUserId } from "../staff-access";

declare global {
  namespace Express {
    interface Request {
      dbUser?: User;
    }
  }
}

export function getAuthenticatedUserId(req: Request) {
  return req.dbUser?.id;
}

// Injectable boundary for tests; production always uses Clerk's verified session.
export function createRequireAuth(
  readAuth = getAuth,
  resolveUser = (id: string) => {
    // Public development tools may start before database setup finishes.
    // Never provision or grant account access until removal protection exists.
    if (!accountStore.removalProtectionReady) {
      throw Object.assign(new Error("Account access unavailable"), { status: 503 });
    }
    return accountStore.resolveUser(id);
  },
  revokeSession = (id: string) => clerkClient.sessions.revokeSession(id),
): RequestHandler {
  return async (req, res, next) => {
    try {
      const auth = readAuth(req);
      if (!auth.userId) return void res.status(401).json({ message: "Unauthorized" });
      // Fail closed if the configured legacy-ID claim is missing. Never fall
      // back to a native Clerk ID and create a second row for a migrated user.
      const id = auth.sessionClaims?.userId;
      if (typeof id !== "string" || !id) {
        return void res.status(403).json({ message: "Account identity unavailable" });
      }
      let user;
      try {
        user = await resolveUser(id);
      } catch (error) {
        if (!isRemovedAccountError(error)) throw error;
      }
      if (!user) {
        // Local denial is authoritative even when the provider is unavailable.
        if (auth.sessionId) {
          try { await revokeSession(auth.sessionId); }
          catch { console.error("Unable to revoke removed account session"); }
        }
        return void res.status(403).json({ message: "Account has been removed" });
      }
      req.dbUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const requireAuth = createRequireAuth();

export const isStaff: RequestHandler = (req, res, next) => {
  if (!isStaffUserId(req.dbUser?.id)) {
    return void res.status(403).json({ message: "Staff access required" });
  }
  next();
};
