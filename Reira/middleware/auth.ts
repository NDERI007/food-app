import type { Request, Response, NextFunction } from "express";
import cache from "@config/cache";

import { SESSION_TTL } from "routes/withAuth";
import { signSessionId } from "@utils/hmacF";

const MAX_SESSION_AGE = 60 * 60 * 24 * 7; //7 DAYS
declare global {
  namespace Express {
    interface Request {
      user?: {
        userID: string;
        sessionId: string;
      };
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const sessionId = req.cookies.sessionId;
  if (!sessionId) {
    return res
      .status(401)
      .json({ error: "Authentication required", authenticated: false });
  }

  // 🔐 Compute signed key to lookup in Redis
  const key = `session:${signSessionId(sessionId)}`;

  const raw = await cache.get(key);
  if (!raw) {
    res.clearCookie("sessionId");
    return res
      .status(401)
      .json({ error: "Session expired", authenticated: false });
  }

  let sessionData: { userID: string; createdAt: number; email: string };
  try {
    sessionData = JSON.parse(raw);
  } catch {
    // Corrupted data — force logout
    await cache.del(key);
    res.clearCookie("sessionId");
    return res
      .status(401)
      .json({ error: "Invalid session data", authenticated: false });
  }

  // ⏰ Enforce max session lifetime
  if (Date.now() - sessionData.createdAt > MAX_SESSION_AGE * 1000) {
    await cache.del(key);
    res.clearCookie("sessionId");
    return res
      .status(401)
      .json({ error: "Session too old", authenticated: false });
  }

  // 🔁 Refresh TTL (sliding expiration)
  try {
    await cache.expire(key, SESSION_TTL);
  } catch (err) {
    console.error("Failed to refresh session TTL:", err);
  }

  req.user = { userID: sessionData.userID, sessionId };
  next();
}
