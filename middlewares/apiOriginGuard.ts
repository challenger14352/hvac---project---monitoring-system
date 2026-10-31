import type { RequestHandler } from "express";
import { getClerkProxyHost } from "./clerkProxyMiddleware";

// Operational browser requests are same-origin. Do not reflect arbitrary
// origins or let a sibling site use ambient cookies for reads or mutations.
// The Clerk proxy is mounted before this guard and has its own transport.
export const apiOriginGuard: RequestHandler = (req, res, next) => {
  const origin = req.get("origin");
  const host = getClerkProxyHost(req);
  const expectedOrigin = host ? `${req.protocol}://${host}` : undefined;
  if (req.get("sec-fetch-site") === "cross-site" ||
      (origin !== undefined && origin !== expectedOrigin)) {
    return void res.status(403).json({ message: "Cross-origin API access is not allowed" });
  }
  next();
};
